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
 *   Data:Enemy/<id>.json       dtype: "enemy"
 *   Data:Map/<id>.json         dtype: "map"
 *   Data:EnemyPool/<id>.json   dtype: "enemy_pool"
 *   Data:Blessing.json        单文件（整包，`public/blessing.json`）
 *   Data:MapMeta.json          整表（地图分类，层在 Data:Map/<id>.json）
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
 * 顺序：character → job → skill → equipment → item → shop → relic →
 *       enemy → map → map_meta → enemy_pool → blessing → enum
 * （各自失败互不影响，最后汇总失败数）。
 * 效果种类名表（Data:EffectKind.json）在 wiki 上手工维护，但本脚本会在 skill 阶段后
 * 把解包里出现、页面上还没有的新效果种类**追加**进去（日文名兜底，已有项不覆盖）。
 * 角色跑完后还会检查 ``Data:CharacterExtra.tabx``（手工维护的池组 / 上线 / 声优）：
 * 把本地有、表里没有的角色**插到最前面**（已有行不动、页面解析失败则跳过）；
 * 新行的 ``index`` 取最大值 + 1、``group`` 默认 -1、``release_date`` 用当天日期，
 * 风格角色沿用同角色已有行的声优。
 *
 * 装备跑完后还会检查 ``Data:EquipmentExtra.tabx``（手工维护的特典分类 / 获取途径），
 * 把本地有、页面上没有的新装备**追加**进去（已有行不动，页面解析失败则跳过）。
 *
 * 最后会重建 ``Data:成就.tabx``：先抓线上旧表，交给 ``build_achievement.py``
 * 合并解包 ``AchievementMasterData``（保留旧 id、补 ``uid``、追加新增条目），
 * 再整体回写；内容无变化则跳过。``--only achievement`` 可只跑这一步。
 *
 * 运行（在本仓库根目录）：
 *   yarn update:wiki                              # 增量（默认全部记录级 + enum）
 *   yarn update:wiki -- --force                   # 忽略缓存全部重传
 *   yarn update:wiki -- --only skill              # 只传一类
 *   yarn update:wiki -- --only achievement        # 只更新成就 tabx
 *   yarn update:wiki -- --only skill --limit 100  # 试传前 100 条
 *   yarn update:wiki -- --dry-run                 # 只本地预览，不登录不写 wiki
 *   yarn update:wiki -- --concurrency 20          # 并发数（默认 10）
 *
 * 需要的 .env：VITE_WIKI_PREFIX / WIKI_AUTHKEY / WIKI_USERNAME / WIKI_PASSWORD
 */

import dotenv from 'dotenv';
import { HuijiWiki } from 'huijiwiki-api';
import { DatabaseSync } from 'node:sqlite';
import { execFileSync } from 'node:child_process';
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
/** 成就 tabx（线上手工页，按解包数据重建后整体回写） */
const ACHIEVEMENT_TABX_TITLE = 'Data:成就.tabx';
const ACHIEVEMENT_TABX_WORK = path.join(ROOT, 'local_scripts', 'work', 'achievement.tabx.json');
const ACHIEVEMENT_BUILD_SCRIPT = path.join(ROOT, 'local_scripts', 'clean', 'build_achievement.py');
/** 效果种类名表（Data:EffectKind.json）：追补解包里出现、页面上没有的新效果种类 */
const EFFECT_KIND_TITLE = 'Data:EffectKind.json';
const EFFECT_KIND_LOCAL = path.join(ROOT, 'local_scripts', 'work', 'clean', 'skill', 'effect_kinds.json');
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
    /** 整份文件原样写进单条目页面（不取 `items[0]`），如 Blessing 的单文件 json */
    whole?: boolean;
    /** 单条目页面的内容取自响应里的哪个顶层键（如 Enum 的 `enum`） */
    field?: string;
    /**
     * 取出的 `field` 是数组时，包成 `{ "<field>": [...] }` 再写入。
     * wiki 的 Data 页面只接受 JSON 对象（不允许顶层是数组），如 MapMeta。
     */
    wrapField?: boolean;
    /** 是否在默认上传列表里 */
    byDefault: boolean;
    /** 说明（日志用） */
    note?: string;
}

const KIND_NAMES = [
    'character',
    'job',
    'skill',
    'equipment',
    'item',
    'shop',
    'relic',
    'enemy',
    'map',
    'map_meta',
    'enemy_pool',
    'blessing',
    'enum',
] as const;
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
    enemy: {
        sub: 'Enemy',
        file: 'EnemyResponse.json',
        dtype: 'enemy',
        idKey: 'i',
        byDefault: true,
        note: '敌人（分类 + 出现变体 / 能力值公式 / AI 规则 / 技能引用等级）',
    },
    map: {
        sub: 'Map',
        file: 'MapResponse.json',
        dtype: 'map',
        idKey: 'i',
        byDefault: true,
        note: '地图层（敌人配置 / 敌群站位）；地图分类见 Data:MapMeta.json',
    },
    map_meta: {
        sub: null,
        title: 'MapMeta',
        file: 'MapResponse.json',
        // 响应是 `{items, maps}`：层走 Data:Map/<id>.json，分类标签单独一页，
        // 避免每个层都重复一份地图分类信息
        field: 'maps',
        wrapField: true,
        singleton: true,
        byDefault: true,
        note: '地图分类（城镇 / 分组 / 包含层 id）',
    },
    enemy_pool: {
        sub: 'EnemyPool',
        file: 'EnemyPoolResponse.json',
        dtype: 'enemy_pool',
        idKey: 'i',
        byDefault: true,
        note: '敌群（全部编队分组，含关联层 / 队伍数与成员站位）',
    },
    blessing: {
        sub: null,
        title: 'Blessing',
        // 只有 143 条、也没有按 id 单独查询的需求：整份文件一页（不拆记录级页面）。
        // 文件是 `public/blessing.json`，所以从 MOCK_DIR 往上一级取
        file: '../blessing.json',
        whole: true,
        singleton: true,
        byDefault: true,
        note: '哈肯的加护（单文件：效果已展开，名字字典内嵌）',
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
        const doc = spec.whole ? payload : spec.field ? payload[spec.field] : payload.items?.[0];
        if (!doc) throw new Error(`${file} 里没有 ${spec.field ?? 'items[0]'}`);

        const keys = Object.keys(doc).length;
        console.log(`  ${kind}: 单条目 ${title}（${keys} 个顶层键）`);
        const text =
            spec.wrapField && Array.isArray(doc) ? JSON.stringify({ [spec.field!]: doc }) : JSON.stringify(doc);
        return [{ title, text }];
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

// ==================== 手工补充表：Data:EquipmentExtra.tabx ====================

/** wiki 上手工维护的装备补充表（特典分类 soucate / 获取途径 sou） */
const EQUIP_EXTRA_TITLE = 'Data:EquipmentExtra.tabx';

/** tabx 页面结构（`Data:*` 命名空间里的 JSON） */
interface TabxPage {
    description?: Record<string, string>;
    schema: { fields: Array<{ name: string; type: string; title?: Record<string, string> }> };
    data: unknown[][];
}

/**
 * 把本地装备里**新出现**的条目追加到 ``Data:EquipmentExtra.tabx``。
 *
 * 这一页是手工维护的数据源（`Api/GetV2Equipment` 的 `extra` 就从它来），
 * 所以只做「追加」：
 *   * 已在页面里的行原样保留（本地名字 / 分类不一致也不改，人工为准）；
 *   * 页面里多出来的行不删（可能是还没进解包的装备）；
 *   * 页面解析失败直接报错，不覆盖。
 */
export async function syncEquipmentExtra(
    bot: HuijiWiki,
    options: { dryRun?: boolean } = {},
): Promise<{ added: number; total: number }> {
    const page = await bot.getPageRawTextByTitle(EQUIP_EXTRA_TITLE);
    if (!page?.content) throw new Error(`读不到页面 ${EQUIP_EXTRA_TITLE}`);

    let tabx: TabxPage;
    try {
        tabx = JSON.parse(page.content) as TabxPage;
    } catch {
        throw new Error(`${EQUIP_EXTRA_TITLE} 不是合法 JSON，已跳过（不覆盖手工数据）`);
    }
    if (!Array.isArray(tabx.data) || !Array.isArray(tabx.schema?.fields)) {
        throw new Error(`${EQUIP_EXTRA_TITLE} 缺少 schema.fields / data，已跳过`);
    }

    const fields = tabx.schema.fields.map((field) => field.name);
    const idIndex = fields.indexOf('id');
    if (idIndex < 0) throw new Error(`${EQUIP_EXTRA_TITLE} 的 schema 里没有 id 字段`);

    const known = new Set(tabx.data.map((row) => Number(row[idIndex])));
    const payload = await readJson<MockPayload>(path.join(MOCK_DIR, 'EquipmentResponse.json'));

    const added: unknown[][] = [];
    for (const doc of payload.items ?? []) {
        const id = Number(doc.i);
        if (!Number.isFinite(id) || id <= 0 || known.has(id)) continue;
        added.push(
            fields.map((name) => {
                switch (name) {
                    case 'id':
                        return id;
                    case 'n':
                        return doc.zh ?? null;
                    case 'soucate':
                        return Number(doc.so) || 0;
                    // 页面里多个来源用 `;` 连接（接口那边按 `;` 拆回数组）
                    case 'sou':
                        return (doc.su as string[] | undefined)?.join(';') || null;
                    default:
                        return null;
                }
            }),
        );
        known.add(id);
    }

    if (added.length === 0) {
        console.log(`  ${EQUIP_EXTRA_TITLE}: 没有新装备（现有 ${tabx.data.length} 行）`);
        return { added: 0, total: tabx.data.length };
    }

    tabx.data.push(...added);
    const total = tabx.data.length;
    console.log(
        `  ${EQUIP_EXTRA_TITLE}: 追加 ${added.length} 件新装备 -> ${total} 行` +
            `（${added.map((row) => row[idIndex]).join(', ')}）`,
    );
    if (options.dryRun) return { added: added.length, total };

    const res = await bot.editPage(EQUIP_EXTRA_TITLE, JSON.stringify(tabx, null, 4), {
        summary: `追加 ${added.length} 件新装备`,
    });
    if (res.error) throw new Error(res.error.info ?? JSON.stringify(res.error));
    return { added: added.length, total };
}

// ==================== 手工补充表：Data:CharacterExtra.tabx ====================

/** wiki 上手工维护的角色补充表（池组 / 上线日期 / 声优 / banner） */
const CHARACTER_EXTRA_TITLE = 'Data:CharacterExtra.tabx';

/** 日期按表里的写法生成：`##YYYY-MM-DD` */
const formatReleaseDate = (date: Date) => {
    const pad = (value: number) => String(value).padStart(2, '0');
    return `##${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

/**
 * 把本地角色里**新出现**的角色补到 ``Data:CharacterExtra.tabx`` 的最前面一行。
 *
 * 这张表是手工维护的数据源（`Api/GetV2Extra.characterExtra` 从它来），所以只做「追加」：
 *   * 已有 id 的行原样保留（人工改过的池组 / 日期 / 声优以线上为准）；
 *   * 觉醒版（`hd`，…0099 / …0100）只在角色 modal 里切换，不进这张表；
 *   * 新行的 `index` 取现有最大值 + 1，`group` 默认 -1（限定池），
 *     `release_date` 用当天日期，`banner` 留空待人工补；
 *   * 风格角色（同一角色的另一套造型）沿用同角色已有行的声优。
 */
export async function syncCharacterExtra(
    bot: HuijiWiki,
    options: { dryRun?: boolean } = {},
): Promise<{ added: number; total: number }> {
    const page = await bot.getPageRawTextByTitle(CHARACTER_EXTRA_TITLE);
    if (!page?.content) throw new Error(`读不到页面 ${CHARACTER_EXTRA_TITLE}`);

    let tabx: TabxPage;
    try {
        tabx = JSON.parse(page.content) as TabxPage;
    } catch {
        throw new Error(`${CHARACTER_EXTRA_TITLE} 不是合法 JSON，已跳过（不覆盖手工数据）`);
    }
    if (!Array.isArray(tabx.data) || !Array.isArray(tabx.schema?.fields)) {
        throw new Error(`${CHARACTER_EXTRA_TITLE} 缺少 schema.fields / data，已跳过`);
    }

    const fields = tabx.schema.fields.map((field) => field.name);
    const col = (name: string) => fields.indexOf(name);
    const idIndex = col('id');
    if (idIndex < 0) throw new Error(`${CHARACTER_EXTRA_TITLE} 的 schema 里没有 id 字段`);
    const nameIndex = col('name');
    const voiceIndex = col('character_voice');
    const indexIndex = col('index');

    const known = new Set(tabx.data.map((row) => Number(row[idIndex])));
    /** 同角色名的声优：风格角色沿用该角色已有行的 CV */
    const voiceByName = new Map<string, string>();
    let maxIndex = 0;
    for (const row of tabx.data) {
        const name = nameIndex >= 0 ? row[nameIndex] : null;
        const voice = voiceIndex >= 0 ? row[voiceIndex] : null;
        if (typeof name === 'string' && name && typeof voice === 'string' && voice && !voiceByName.has(name)) {
            voiceByName.set(name, voice);
        }
        const index = Number(indexIndex >= 0 ? row[indexIndex] : 0);
        if (Number.isFinite(index) && index > maxIndex) maxIndex = index;
    }

    const payload = await readJson<MockPayload>(path.join(MOCK_DIR, 'CharacterResponse.json'));
    const today = formatReleaseDate(new Date());
    const added: unknown[][] = [];
    let nextIndex = maxIndex + 1;

    for (const doc of payload.items ?? []) {
        const id = Number(doc.i);
        if (!Number.isFinite(id) || id <= 0 || known.has(id)) continue;
        // 觉醒版只在角色 modal 的版本切换里出现，不写进补充表
        if (doc.hd) continue;

        const name = typeof doc.zh === 'string' ? doc.zh : '';
        if (!name) continue;
        const style = typeof doc.sty === 'string' ? doc.sty : '';
        const styled = style !== '' && style !== '基本';

        added.push(
            fields.map((field) => {
                switch (field) {
                    case 'id':
                        return id;
                    case 'index':
                        return nextIndex++;
                    case 'key':
                        return styled ? `${style}${name}` : name;
                    case 'name':
                        return name;
                    case 'style':
                        return styled ? style : null;
                    case 'group':
                        return -1;
                    case 'release_date':
                        return today;
                    case 'character_voice':
                        return voiceByName.get(name) ?? null;
                    default:
                        // banner 等其余列留给人工补
                        return null;
                }
            }),
        );
        known.add(id);
    }

    if (added.length === 0) {
        console.log(`  ${CHARACTER_EXTRA_TITLE}: 没有新角色（现有 ${tabx.data.length} 行）`);
        return { added: 0, total: tabx.data.length };
    }

    // 表里新角色在上、编号从大到小，所以倒序插到最前面
    tabx.data.unshift(...[...added].reverse());
    const total = tabx.data.length;
    console.log(
        `  ${CHARACTER_EXTRA_TITLE}: 追加 ${added.length} 个新角色 -> ${total} 行` +
            `（${added.map((row) => row[idIndex]).join(', ')}）`,
    );
    if (options.dryRun) return { added: added.length, total };

    const res = await bot.editPage(CHARACTER_EXTRA_TITLE, JSON.stringify(tabx, null, 4), {
        summary: `追加 ${added.length} 个新角色`,
    });
    if (res.error) throw new Error(res.error.info ?? JSON.stringify(res.error));
    return { added: added.length, total };
}

// ==================== 效果种类名表：Data:EffectKind.json ====================

/** 解包 `effect_kinds.json` 里单个效果种类的形状（只取需要的两个字段） */
interface LocalEffectKind {
    id: number;
    name_jp?: string | null;
    name?: string | null;
    params?: string[] | null;
}

/**
 * 把解包里出现、但 wiki 手工维护的 ``Data:EffectKind.json`` 还没有的效果种类补进去。
 *
 * 前端 ``effectKinds`` 直接读这张表；缺了某项时，技能详情里只能退回技能自带的日文
 * ``kind_name``（如新技能 194013000 的 kind 3490「抵抗ダウン」）。这里按解包日文名
 * 给缺的项补一条兜底名，之后人工再改成中文；已有项一律不动，不覆盖手改的中文名 /
 * 参数名。本地源是 ``skill.py`` 产出的 ``effect_kinds.json``（只含实际出现的种类）。
 */
async function syncEffectKind(
    bot: HuijiWiki,
    options: { dryRun?: boolean } = {},
): Promise<{ added: number; total: number }> {
    if (!existsSync(EFFECT_KIND_LOCAL)) {
        console.log(`  ${EFFECT_KIND_TITLE}: 本地缺少 ${EFFECT_KIND_LOCAL}（先跑 [UPDATE 1] 清洗），跳过`);
        return { added: 0, total: 0 };
    }

    const page = await bot.getPageRawTextByTitle(EFFECT_KIND_TITLE);
    if (!page?.content) throw new Error(`读不到页面 ${EFFECT_KIND_TITLE}`);

    let wiki: Record<string, { name?: string; params?: string[] | null }>;
    try {
        wiki = JSON.parse(page.content);
    } catch {
        throw new Error(`${EFFECT_KIND_TITLE} 不是合法 JSON，已跳过（不覆盖手工数据）`);
    }
    if (!wiki || typeof wiki !== 'object' || Array.isArray(wiki)) {
        throw new Error(`${EFFECT_KIND_TITLE} 顶层不是对象，已跳过`);
    }

    const local = await readJson<Record<string, LocalEffectKind>>(EFFECT_KIND_LOCAL);

    const added: string[] = [];
    for (const [id, kind] of Object.entries(local)) {
        if (id in wiki) continue;
        const name = kind?.name_jp || kind?.name || `效果 #${id}`;
        const entry: { name: string; params?: string[] | null } = { name };
        if (kind?.params) entry.params = kind.params;
        wiki[id] = entry;
        added.push(id);
    }

    if (added.length === 0) {
        console.log(`  ${EFFECT_KIND_TITLE}: 没有新效果种类（现有 ${Object.keys(wiki).length} 种）`);
        return { added: 0, total: Object.keys(wiki).length };
    }

    // 页面原本是紧凑单行 JSON，保持紧凑写回以缩小 diff
    const total = Object.keys(wiki).length;
    console.log(
        `  ${EFFECT_KIND_TITLE}: 追加 ${added.length} 个新效果种类 -> ${total} 种（${added.join(', ')}）`,
    );
    if (options.dryRun) return { added: added.length, total };

    const res = await bot.editPage(EFFECT_KIND_TITLE, JSON.stringify(wiki), {
        summary: `追加 ${added.length} 个新效果种类`,
    });
    if (res.error) throw new Error(res.error.info ?? JSON.stringify(res.error));
    return { added: added.length, total };
}

// ==================== 成就 tabx：Data:成就.tabx ====================

/** 结构化比较：对象按 key 排序，忽略 JSON 空白与 key 顺序 */
const canonicalJson = (value: unknown): string =>
    JSON.stringify(value, (_key, val) => {
        if (val && typeof val === 'object' && !Array.isArray(val)) {
            const obj = val as Record<string, unknown>;
            return Object.fromEntries(Object.keys(obj).sort().map((k) => [k, obj[k]]));
        }
        return val;
    });

/**
 * 用解包数据重建 ``Data:成就.tabx`` 并回写。
 *
 * 线上这页是旧表（含短 id / sub / comment）；先抓下来落到 work，交给
 * ``build_achievement.py`` 按解包 ``AchievementMasterData`` 合并（保留旧 id、
 * 补 ``uid``、追加新增条目），再整体上传。内容没变则跳过。
 */
async function syncAchievementTabx(
    bot: HuijiWiki,
    options: { dryRun?: boolean } = {},
): Promise<{ rows: number; changed: boolean }> {
    const page = await bot.getPageRawTextByTitle(ACHIEVEMENT_TABX_TITLE);
    if (!page?.content) throw new Error(`读不到页面 ${ACHIEVEMENT_TABX_TITLE}`);
    mkdirSync(path.dirname(ACHIEVEMENT_TABX_WORK), { recursive: true });
    await fs.writeFile(ACHIEVEMENT_TABX_WORK, page.content, 'utf8');

    // 读取上一步落盘的线上 tabx，合并解包数据（dry-run 只预览，不落盘）
    execFileSync(
        'python',
        options.dryRun ? [ACHIEVEMENT_BUILD_SCRIPT] : [ACHIEVEMENT_BUILD_SCRIPT, '--write'],
        { cwd: ROOT, stdio: 'inherit', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } },
    );

    if (options.dryRun) {
        console.log(`  [dry-run] 已构建 ${ACHIEVEMENT_TABX_TITLE}，跳过上传`);
        return { rows: 0, changed: false };
    }

    const built = await fs.readFile(ACHIEVEMENT_TABX_WORK, 'utf8');
    const parse = (text: string): TabxPage | null => {
        try {
            return JSON.parse(text) as TabxPage;
        } catch {
            return null;
        }
    };
    const before = parse(page.content);
    const after = parse(built);
    const rows = after?.data?.length ?? 0;

    if (before && after && canonicalJson(before) === canonicalJson(after)) {
        console.log(`  ${ACHIEVEMENT_TABX_TITLE}: 无变化（${rows} 行）`);
        return { rows, changed: false };
    }

    const res = await bot.editPage(ACHIEVEMENT_TABX_TITLE, built, { summary: '按解包数据更新成就' });
    if (res.error) throw new Error(res.error.info ?? JSON.stringify(res.error));
    console.log(`  ${ACHIEVEMENT_TABX_TITLE}: 已更新（${rows} 行）`);
    return { rows, changed: true };
}

// ==================== 主逻辑 ====================

const parseArgs = () => {
    const argv = process.argv.slice(2);
    const valueOf = (flag: string): string | undefined => {
        const index = argv.indexOf(flag);
        return index >= 0 ? argv[index + 1] : undefined;
    };

    const only = valueOf('--only');
    const extraOnly = ['achievement'];
    if (only && !(only in KINDS) && !extraOnly.includes(only)) {
        throw new Error(`--only 需要以下之一: ${[...Object.keys(KINDS), ...extraOnly].join(', ')}`);
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
        ? only in KINDS
            ? [only as KindName]
            : []
        : KIND_NAMES.filter((name) => KINDS[name].byDefault);

    return {
        kinds,
        concurrency,
        limit,
        force: argv.includes('--force'),
        dryRun: argv.includes('--dry-run'),
        achievement: !only || only === 'achievement',
    };
};

async function main(): Promise<void> {
    const { kinds, concurrency, limit, force, dryRun, achievement } = parseArgs();

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

    // 角色手工补充表（Data:CharacterExtra.tabx）：新角色补到最前面一行
    if (kinds.includes('character')) {
        console.log(`\n===== character-extra (${CHARACTER_EXTRA_TITLE}) =====`);
        try {
            await syncCharacterExtra(bot, { dryRun });
        } catch (err) {
            failedTotal++;
            console.error(`  × ${CHARACTER_EXTRA_TITLE} 同步失败: ${err instanceof Error ? err.message : err}`);
        }
    }

    // 装备手工补充表（Data:EquipmentExtra.tabx）：追加本地有、页面上没有的新装备
    if (kinds.includes('equipment')) {
        console.log(`\n===== equipment-extra (${EQUIP_EXTRA_TITLE}) =====`);
        try {
            await syncEquipmentExtra(bot, { dryRun });
        } catch (err) {
            failedTotal++;
            console.error(`  × ${EQUIP_EXTRA_TITLE} 同步失败: ${err instanceof Error ? err.message : err}`);
        }
    }

    // 效果种类名表（Data:EffectKind.json）：把解包里出现、页面上没有的新效果种类补进去
    if (kinds.includes('skill')) {
        console.log(`\n===== effect-kind (${EFFECT_KIND_TITLE}) =====`);
        try {
            await syncEffectKind(bot, { dryRun });
        } catch (err) {
            failedTotal++;
            console.error(`  × ${EFFECT_KIND_TITLE} 同步失败: ${err instanceof Error ? err.message : err}`);
        }
    }

    // 成就 tabx（Data:成就.tabx）：按解包重建后整体回写
    if (achievement) {
        console.log(`\n===== achievement (${ACHIEVEMENT_TABX_TITLE}) =====`);
        try {
            await syncAchievementTabx(bot, { dryRun });
        } catch (err) {
            failedTotal++;
            console.error(`  × ${ACHIEVEMENT_TABX_TITLE} 同步失败: ${err instanceof Error ? err.message : err}`);
        }
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
