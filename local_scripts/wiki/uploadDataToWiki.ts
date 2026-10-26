/**
 * uploadDataToWiki.ts
 *
 * 把清洗产物（`public/mock/*Response.json`）上传到 wiki 的 `Data:` 命名空间。
 * 参考 wakfu-wiki-vue 的 `local_scripts/updater/upload_data_to_wiki.ts`。
 *
 * 条目命名（记录级，子路径用单数）：
 *   Data:Character/<id>.json   dtype: "character"
 *   Data:Job/<id>.json         dtype: "job"
 *   Data:Skill/<id>.json       dtype: "skill"
 *   Data:Equipment/<id>.json   dtype: "equipment"
 *   Data:Item/<id>.json        dtype: "item"
 *   Data:Shop/<id>.json        dtype: "shop"
 *   Data:Relic/<id>.json       dtype: "relic"
 *   Data:Enum.json             整表（id 字典 + effect_kind），单条目
 *
 * `Data:Version.json` **不由本脚本维护**（版本号另行处理，避免上传脚本自动把前端缓存刷掉）。
 *
 * 内容就是 mock 里的短键 JSON（`build_mock.py` 已压好、前端 `decodeDoc` 还原），
 * 记录级额外附加 `dtype`：wiki 端 `mw.huiji.db` 依它检索文档，故必须保留；
 * Lua 模块（Api/GetV2Character …）按 dtype 查询后统一包成
 * `{ items, count, page, limit }` 返回。
 *
 * 增量上传：内容不变则跳过编辑请求（缓存见下），`--force` 强制全传。
 *   缓存表 wikitext_cache（sqlite）：条目名 -> 上次上传的内容，
 *   默认 `D:\WizardyDaphne\workspace\wikitext.sqlite`，可用 `WIKI_CACHE_SQLITE_PATH` 覆盖。
 *
 * 顺序：character → job → skill → equipment → item → shop → relic → enum
 * （各自失败互不影响，最后汇总失败数）。
 * 效果种类名表（Data:EffectKind.json）在 wiki 上手工维护，不由本脚本上传。
 *
 * 运行（在本仓库根目录）：
 *   yarn update:wiki                              # 增量（默认全部记录级 + enum）
 *   yarn update:wiki -- --force                   # 忽略缓存全部重传
 *   yarn update:wiki -- --only skill              # 只传一类
 *   yarn update:wiki -- --only skill --limit 100  # 试传前 100 条
 *   yarn update:wiki -- --dry-run                 # 只本地预览，不登录不写 wiki
 *   yarn update:wiki -- --concurrency 20          # 并发数（默认 10）
 *
 * 需要的 .env：VITE_WIKI_PREFIX / WIKI_AUTHKEY / WIKI_USERNAME / WIKI_PASSWORD
 */

import dotenv from 'dotenv';
import { HuijiWiki } from 'huijiwiki-api';
import { DatabaseSync } from 'node:sqlite';
import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

dotenv.config();

// ==================== 配置常量 ====================

/** 数据条目命名空间 */
const PAGE_NS = 'Data';
/** 编辑间隔（毫秒），每个协程内生效，避免单协程请求过快 */
const EDIT_DELAY_MS = 10;
/** 编辑失败重试次数 */
const RETRIES = 3;
/** 默认并发数（同时进行的编辑请求数） */
const DEFAULT_CONCURRENCY = 10;

const ROOT = process.cwd();
const MOCK_DIR = path.join(ROOT, 'public', 'mock');
/** 上传缓存（sqlite，放在工作区外，与前端 / 仓库无关） */
const CACHE_SQLITE_PATH =
    process.env.WIKI_CACHE_SQLITE_PATH || path.join('D:\\WizardyDaphne', 'workspace', 'wikitext.sqlite');

const WIKI_PREFIX = process.env.VITE_WIKI_PREFIX;
const WIKI_AUTHKEY = process.env.WIKI_AUTHKEY;
const WIKI_USERNAME = process.env.WIKI_USERNAME;
const WIKI_PASSWORD = process.env.WIKI_PASSWORD;

/** 一类数据的上传规格 */
interface KindSpec {
    /** 记录级子路径；`null` = 单条目页面（`Data:<title>.json`） */
    sub: string | null;
    /** 单条目页面的标题（不加 .json） */
    title?: string;
    /** mock 文件名（单条目类必填） */
    file?: string;
    /** 记录级 dtype（wiki 端检索用）；单条目页面无 */
    dtype?: string;
    /** 记录 id 的短键，默认 `i` */
    idKey?: string;
    /** 整表塞在一个页面里（默认取响应 `items[0]`，或用 `field` 指定顶层键） */
    singleton?: boolean;
    /** 单条目页面的内容取自响应里的哪个顶层键（如 Enum 的 `enum`） */
    field?: string;
    /** 是否在默认上传列表里 */
    byDefault: boolean;
    /** 说明（日志用） */
    note?: string;
}

const KIND_NAMES = ['character', 'job', 'skill', 'equipment', 'item', 'shop', 'relic', 'enum'] as const;
type KindName = (typeof KIND_NAMES)[number];

const KINDS: Record<KindName, KindSpec> = {
    character: {
        sub: 'Character',
        file: 'CharacterResponse.json',
        dtype: 'character',
        idKey: 'i',
        byDefault: true,
    },
    job: {
        sub: 'Job',
        file: 'JobResponse.json',
        dtype: 'job',
        idKey: 'i',
        byDefault: true,
    },
    skill: {
        sub: 'Skill',
        file: 'SkillResponse.json',
        dtype: 'skill',
        idKey: 'i',
        byDefault: true,
    },
    equipment: {
        sub: 'Equipment',
        file: 'EquipmentResponse.json',
        dtype: 'equipment',
        idKey: 'i',
        byDefault: true,
        note: '装备（含强化曲线 / 材质补强 / 图鉴编号）',
    },
    item: {
        sub: 'Item',
        file: 'ItemResponse.json',
        dtype: 'item',
        idKey: 'i',
        byDefault: true,
        note: '道具（含使用效果 / 商店价格 / 钓鱼 / 神器）',
    },
    shop: {
        sub: 'Shop',
        file: 'ShopResponse.json',
        dtype: 'shop',
        idKey: 'i',
        byDefault: true,
        note: '商店（122 家，商品内嵌在 items）',
    },
    relic: {
        sub: 'Relic',
        file: 'RelicResponse.json',
        dtype: 'relic',
        idKey: 'i',
        byDefault: true,
        note: '遗物（61 种，同组取最低阶级；含遗物酒 / 遗物之力 / 提升与降低属性）',
    },
    enum: {
        sub: null,
        title: 'Enum',
        file: 'EnumResponse.json',
        // 响应是 `{enum, kinds}`：只上传 `enum`；`kinds` 对应 wiki 上手工维护的
        // Data:EffectKind.json（Api/GetV2Enum 直接读它），不由本脚本上传
        field: 'enum',
        singleton: true,
        byDefault: true,
        note: 'id 字典 + effect_kind 结构（kinds 手工维护）',
    },
};

/** 上传的条目 */
interface UploadEntry {
    title: string;
    text: string;
}

/** 分页响应（build_mock.py 的形状） */
interface MockPayload {
    items: Record<string, unknown>[];
    count?: number;
}

// ==================== 本地 sqlite 缓存（IHuijiwikiCache 结构） ====================

/** `DatabaseSync.prepare()` 返回的最小语句接口（node:sqlite） */
interface SqliteStatement {
    get(...params: unknown[]): unknown;
    run(...params: unknown[]): unknown;
}

/**
 * `wikitext_cache` 表：条目名 -> 上次上传的内容。
 * 与 huijiwiki-api 的 `IHuijiwikiCache` 同构，传进构造函数后
 * `bot.localCache.compare()` 即可判断是否需要真的发编辑请求。
 * 每次写入直接落盘（sqlite 事务级），所以无需额外 save。
 */
export class SqliteCache {
    private db: DatabaseSync;

    constructor(file: string) {
        this.db = new DatabaseSync(file);
        this.db.exec(
            `CREATE TABLE IF NOT EXISTS wikitext_cache (
                title TEXT PRIMARY KEY,
                content TEXT NOT NULL
            )`,
        );
    }

    static open(file: string): SqliteCache {
        makeParentDirSync(file);
        return new SqliteCache(file);
    }

    private prepare(sql: string): SqliteStatement {
        return this.db.prepare(sql) as unknown as SqliteStatement;
    }

    async get(title: string): Promise<string | null> {
        const row = this.prepare('SELECT content FROM wikitext_cache WHERE title = ?').get(title) as
            | { content: string }
            | undefined;
        return row?.content ?? null;
    }

    async set(title: string, content: string): Promise<void> {
        this.prepare(
            'INSERT INTO wikitext_cache (title, content) VALUES (?, ?) ' +
                'ON CONFLICT(title) DO UPDATE SET content = excluded.content',
        ).run(title, content);
    }

    async rename(oldTitle: string, newTitle: string): Promise<void> {
        this.prepare('UPDATE wikitext_cache SET title = ? WHERE title = ?').run(newTitle, oldTitle);
    }

    async delete(title: string): Promise<void> {
        this.prepare('DELETE FROM wikitext_cache WHERE title = ?').run(title);
    }

    async compare(title: string, content: string): Promise<boolean> {
        return (await this.get(title)) === content;
    }

    close(): void {
        this.db.close();
    }
}

/** 同步建父目录（sqlite 不会自动建目录） */
function makeParentDirSync(file: string): void {
    const dir = path.dirname(file);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

// ==================== 工具 ====================

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const readJson = async <T>(file: string): Promise<T> => {
    const raw = await fs.readFile(file, 'utf8');
    return JSON.parse(raw) as T;
};

/** 记录级条目文本：短键 JSON + dtype（紧凑单行） */
export const serializeDoc = (doc: Record<string, unknown>, dtype: string): string =>
    JSON.stringify({ ...doc, dtype });

// ==================== 条目构造 ====================

/**
 * 构造某类的全部上传条目。
 * limit > 0 时只取前 limit 条（试传用）。
 */
export async function buildEntries(
    kind: KindName,
    options: { limit?: number } = {},
): Promise<UploadEntry[]> {
    const spec = KINDS[kind];
    const limit = options.limit && options.limit > 0 ? options.limit : 0;

    // ---- 单条目页面 ----
    if (spec.singleton) {
        const title = `${PAGE_NS}:${spec.title}.json`;
        const file = path.join(MOCK_DIR, spec.file!);
        const payload = await readJson<MockPayload & Record<string, unknown>>(file);
        const doc = spec.field ? payload[spec.field] : payload.items?.[0];
        if (!doc) throw new Error(`${file} 里没有 ${spec.field ?? 'items[0]'}`);

        const keys = Object.keys(doc).length;
        console.log(`  ${kind}: 单条目 ${title}（${keys} 个顶层键）`);
        return [{ title, text: JSON.stringify(doc) }];
    }

    // ---- 记录级页面 ----
    const payload = await readJson<MockPayload>(path.join(MOCK_DIR, spec.file!));
    if (!Array.isArray(payload.items)) throw new Error(`${spec.file} 不是 {items,count,...} 结构`);

    const idKey = spec.idKey ?? 'i';
    const all = payload.items;
    const picked = limit > 0 ? all.slice(0, limit) : all;

    const entries: UploadEntry[] = [];
    let skipped = 0;
    for (const doc of picked) {
        const id = Number(doc[idKey]);
        if (!Number.isFinite(id) || id <= 0) {
            skipped++;
            continue;
        }
        entries.push({
            title: `${PAGE_NS}:${spec.sub}/${id}.json`,
            text: serializeDoc(doc, spec.dtype!),
        });
    }

    console.log(
        `  ${kind}: ${all.length} 条记录` +
            `${picked.length !== all.length ? `（取前 ${picked.length} 条）` : ''}` +
            ` / 上传 ${entries.length} 个条目` +
            `${skipped ? `（${skipped} 条无有效 id 已跳过）` : ''}`,
    );
    return entries;
}

// ==================== 上传 ====================

/**
 * 并发上传：共享游标把 entries 分配给 concurrency 个协程；
 * 每个协程独立完成「取任务 → 增量比较 / 重试编辑 → 更新计数」。
 * huijiwiki-api 内部对 badtoken 有跨请求协调，多协程并发调用 editPage 是安全的。
 */
export async function uploadEntries(
    bot: HuijiWiki,
    entries: UploadEntry[],
    options: { useCache: boolean; concurrency: number },
): Promise<{ uploaded: number; skipped: number; failed: number }> {
    const total = entries.length;
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;
    let done = 0;
    let next = 0;

    const uploadOne = async (title: string, text: string): Promise<'uploaded' | 'skipped' | 'failed'> => {
        // 增量：内容与缓存一致则跳过（不发请求）
        if (options.useCache && (await bot.localCache.compare(title, text))) return 'skipped';

        let lastErr: unknown;
        for (let attempt = 1; attempt <= RETRIES; attempt++) {
            try {
                const res = await bot.editPage(title, text, { summary: '更新数据条目' });
                if (res.error) throw new Error(res.error.info ?? JSON.stringify(res.error));
                await bot.localCache.set(title, text);
                await sleep(EDIT_DELAY_MS);
                return 'uploaded';
            } catch (err) {
                lastErr = err;
                if (attempt < RETRIES) await sleep(1500 * attempt);
            }
        }
        console.error(`  × ${title} 上传失败: ${lastErr instanceof Error ? lastErr.message : lastErr}`);
        return 'failed';
    };

    const worker = async (): Promise<void> => {
        for (;;) {
            const index = next++;
            if (index >= total) return;
            const { title, text } = entries[index];

            const result = await uploadOne(title, text);
            if (result === 'uploaded') uploaded++;
            else if (result === 'skipped') skipped++;
            else failed++;

            done++;
            if (done % 200 === 0 || done === total) {
                console.log(
                    `  进度 ${done}/${total}（上传 ${uploaded} / 跳过 ${skipped} / 失败 ${failed}）`,
                );
            }
        }
    };

    const workerCount = Math.max(1, Math.min(options.concurrency, total));
    await Promise.all(Array.from({ length: workerCount }, () => worker()));

    return { uploaded, skipped, failed };
}

// ==================== 主逻辑 ====================

const parseArgs = () => {
    const argv = process.argv.slice(2);
    const valueOf = (flag: string): string | undefined => {
        const index = argv.indexOf(flag);
        return index >= 0 ? argv[index + 1] : undefined;
    };

    const only = valueOf('--only');
    if (only && !(only in KINDS)) {
        throw new Error(`--only 需要以下之一: ${Object.keys(KINDS).join(', ')}`);
    }

    const concurrencyRaw = valueOf('--concurrency');
    const concurrency = concurrencyRaw == null ? DEFAULT_CONCURRENCY : Number(concurrencyRaw);
    if (!Number.isInteger(concurrency) || concurrency < 1) {
        throw new Error('--concurrency 需要一个正整数');
    }

    const limitRaw = valueOf('--limit');
    const limit = limitRaw == null ? 0 : Number(limitRaw);
    if (!Number.isInteger(limit) || limit < 0) throw new Error('--limit 需要一个非负整数');

    const kinds: KindName[] = only
        ? [only as KindName]
        : KIND_NAMES.filter((name) => KINDS[name].byDefault);

    return {
        kinds,
        concurrency,
        limit,
        force: argv.includes('--force'),
        dryRun: argv.includes('--dry-run'),
    };
};

async function main(): Promise<void> {
    const { kinds, concurrency, limit, force, dryRun } = parseArgs();

    if (!WIKI_PREFIX || !WIKI_AUTHKEY) {
        throw new Error('缺少环境变量 VITE_WIKI_PREFIX / WIKI_AUTHKEY（见 .env.example）');
    }

    console.log(`命名空间: ${PAGE_NS}:  并发: ${concurrency}  模式: ${dryRun ? 'dry-run' : '上传'}`);

    if (!dryRun) console.log(`缓存: ${CACHE_SQLITE_PATH}`);

    // dry-run 不建缓存库（避免无意义地写工作区）
    const cache = dryRun ? null : SqliteCache.open(CACHE_SQLITE_PATH);
    const bot = new HuijiWiki(WIKI_PREFIX, WIKI_AUTHKEY, cache ? { cache } : {});

    if (!dryRun) {
        if (!WIKI_USERNAME || !WIKI_PASSWORD) {
            throw new Error('缺少环境变量 WIKI_USERNAME / WIKI_PASSWORD（见 .env.example）');
        }
        console.log('登录 wiki...');
        if (!(await bot.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
            throw new Error(`wiki 登录失败（${bot.getLastErrorMessage() || '未知原因'}），请检查 .env`);
        }
    }

    let failedTotal = 0;

    for (const kind of kinds) {
        console.log(`\n===== ${kind} =====${KINDS[kind].note ? ` (${KINDS[kind].note})` : ''}`);
        const entries = await buildEntries(kind, { limit });
        if (entries.length === 0) continue;

        if (dryRun) {
            const sample = entries[0].text;
            const preview = sample.length > 400 ? `${sample.slice(0, 400)}…` : sample;
            console.log(`  [dry-run] ${entries[0].title}（共 ${entries.length} 条）预览:`);
            console.log(`    ${preview}`);
            continue;
        }

        const { uploaded, skipped, failed } = await uploadEntries(bot, entries, {
            useCache: !force,
            concurrency,
        });
        failedTotal += failed;
        console.log(`  本类完成: 上传 ${uploaded} / 跳过 ${skipped} / 失败 ${failed}`);
    }

    cache?.close();
    console.log(failedTotal > 0 ? `\n完成，但有 ${failedTotal} 个条目失败` : '\n全部完成');
    if (failedTotal > 0) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main().catch((err) => {
        console.error('脚本执行失败:', err);
        process.exitCode = 1;
    });
}
