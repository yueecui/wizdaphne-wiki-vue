/**
 * 把哈肯的加护（`public/blessing.json`）整理成 wikitext，写进 wiki 的「哈肯」词条。
 *
 *   yarn update:haken -- --dry-run     # 只生成本地预览（local_scripts/work/haken.wiki）
 *   yarn update:haken                  # 登录后写入词条
 *   yarn update:haken -- --page 哈肯    # 指定词条名（默认「哈肯」）
 *
 * 词条原本就有 `===白加护===` / `===绿加护===` / `===蓝加护===` / `===紫加护===`
 * 四节，这里用解包数据整段重写（加护名 + 效果，紫加护多一列奈落），前面的介绍、
 * 说明与其它小节都不动。生成的内容用两个标记包住，重复运行只替换标记内的部分。
 *
 * 效果名/参数名取 `public/mock/ExtraResponse.json` 的 `effectKinds`（即 wiki 上
 * 手工维护的 `Data:EffectKind.json`），和前端渲染同一套文案；同名同效果的行只
 * 保留一次（同一种加护会出现在多个池里）。
 *
 * 需要 .env：VITE_WIKI_PREFIX / WIKI_AUTHKEY / WIKI_USERNAME / WIKI_PASSWORD
 */

import dotenv from 'dotenv';
import { HuijiWiki } from 'huijiwiki-api';
import { promises as fs } from 'node:fs';
import path from 'node:path';

dotenv.config();

const ROOT = process.cwd();
const DATA_FILE = path.join(ROOT, 'public', 'blessing.json');
const EXTRA_FILE = path.join(ROOT, 'public', 'mock', 'ExtraResponse.json');
const WORK_FILE = path.join(ROOT, 'local_scripts', 'work', 'haken.wiki');

const MARK_START = '<!-- haken:auto:start -->';
const MARK_END = '<!-- haken:auto:end -->';
/** 整段重写的起点（词条里已有的三级标题） */
const FIRST_HEADING = '===白加护===';

const WIKI_PREFIX = process.env.VITE_WIKI_PREFIX;
const WIKI_AUTHKEY = process.env.WIKI_AUTHKEY;
const WIKI_USERNAME = process.env.WIKI_USERNAME;
const WIKI_PASSWORD = process.env.WIKI_PASSWORD;

// ==================== 数据 ====================

interface BlessingEffect {
    kind: number;
    kind_name?: string;
    params: number[];
}

interface BlessingDoc {
    id: number;
    name: string;
    rarity: number;
    group: number;
    pool: number;
    weight: number;
    effects: BlessingEffect[];
}

interface BlessingFile {
    generatedAt?: string;
    stats: Record<string, string>;
    species: Record<string, string>;
    attributes: Record<string, string>;
    groups: Record<string, { layers: string[] }>;
    items: BlessingDoc[];
}

/** `Data:EffectKind.json` 的一条：名字 + 每个参数的位置标签 */
interface EffectKind {
    name?: string;
    params?: string[];
}

/** 加护池的名字（与前端 `blessingEffects.ts` 的 POOL_NAMES 保持一致） */
const POOL_NAMES: Record<number, string> = {
    2000: '初始的奈落',
    2001: '贸易水路',
    2002: '不落的要塞',
    2003: '豪雪地带',
    7015: '北穿幽灵城',
    600000: '古城遗迹',
};

/** 稀有度 0-3：标题、单元格 class（词条里原本就用的 tailwind 类） */
const RARITY_SECTIONS = [
    { title: '白加护', cls: '' },
    { title: '绿加护', cls: ' class="text-green-400"' },
    { title: '蓝加护', cls: ' class="text-blue-400"' },
    { title: '紫加护', cls: ' class="text-purple-400"' },
];

const KIND_STAT = 7000;
const KIND_RACE_ATTACK = 150;
const KIND_RACE_RESIST = 2340;
const KIND_ATTRIBUTE_ATTACK = 2363;

/**
 * 效果名兜底：`Data:EffectKind.json` 里这些条目还是日文（毒耐性変動 / パッシブ…），
 * 词条上先写中文；wiki 那边补齐后可以删掉这里，改成直接用表里的名字。
 */
const KIND_NAMES: Record<number, string> = {
    2240: '被动水属性伤害减轻',
    2260: '被动土属性伤害减轻',
    2363: '属性伤害提升',
    5300: '毒耐性变动',
    5320: '睡眠耐性变动',
    5330: '气绝耐性变动',
    5340: '麻痹耐性变动',
    5360: '石化耐性变动',
    5370: '封印耐性变动',
    5380: '恐惧耐性变动',
    5390: '混乱耐性变动',
    5400: '魅惑耐性变动',
    5420: '即死耐性变动',
    5430: '暴击耐性变动',
    5440: '冻结耐性变动',
};

/** 参数名末尾的 `%` 表示该值是百分数，显示时移到数值后面 */
const PERCENT = /%+$/;

const lookup = (dict: Record<string, string>, id: number | undefined, fallback: string) =>
    dict[String(id ?? '')] ?? `${fallback}${id ?? '?'}`;

/** 通用渲染：`参数名 值`，参数名取 EffectKind 表（与前端 `SkillDetail` 同口径） */
const paramText = (params: number[], labels: string[] | undefined) => {
    // 只有一个参数时不用写参数名（`百分比%` 只保留数值本身）
    if (params.length === 1) {
        const label = labels?.[0];
        if (!label) return String(params[0]);
        if (PERCENT.test(label)) return `${params[0]}%`;
    }
    return params
        .map((value, index) => {
            const label = labels?.[index];
            if (!label) return String(value);
            return `${label.replace(PERCENT, '')} ${PERCENT.test(label) ? `${value}%` : value}`;
        })
        .join('，');
};

const effectLabel = (effect: BlessingEffect, data: BlessingFile, kinds: Record<string, EffectKind>) => {
    const p = effect.params ?? [];
    const kind = kinds[String(effect.kind)];
    switch (effect.kind) {
        case KIND_STAT: {
            const stat = lookup(data.stats, p[0], '能力值');
            return p[1] ? `${stat} +${p[1]}%` : stat;
        }
        case KIND_RACE_ATTACK:
            return `对${lookup(data.species, p[0], '种族')}伤害 +${p[1] ?? 0}%`;
        case KIND_RACE_RESIST:
            return `受${lookup(data.species, p[0], '种族')}伤害 ${p[1] ?? 0}%`;
        case KIND_ATTRIBUTE_ATTACK:
            return `${lookup(data.attributes, p[1], '属性')}属性伤害 +${p[0] ?? 0}%`;
        default: {
            const name = KIND_NAMES[effect.kind] || kind?.name || effect.kind_name || '';
            if (!p.length) return name || `效果 ${effect.kind}`;
            const body = paramText(p, kind?.params);
            return name ? `${name}（${body}）` : body;
        }
    }
};

/** 表格单元格里不能出现 `|` 和换行 */
const cell = (text: string) => text.replace(/\|/g, '&#124;').replace(/\r?\n/g, ' ');

// ==================== wikitext ====================

function sectionOf(data: BlessingFile, rarity: number, kinds: Record<string, EffectKind>): string {
    const { title, cls } = RARITY_SECTIONS[Math.min(Math.max(rarity, 0), 3)];
    // 紫加护多一列「奈落」
    const purple = rarity === 3;
    const seen = new Set<string>();
    const lines: string[] = [];

    for (const row of data.items.filter((item) => item.rarity === rarity).sort((a, b) => a.id - b.id)) {
        const effect = cell(row.effects.map((e) => effectLabel(e, data, kinds)).join('；')) || '—';
        // 同一种加护会出现在多个池里，名字 + 效果都一样就只留一行
        const key = `${row.name}|${effect}`;
        if (seen.has(key)) continue;
        seen.add(key);

        // 表头行之后也要先来一行 `|-`，否则第一行数据会跟表头挤在一起
        lines.push('|-');
        const head = cls ? `|${cls} | ${cell(row.name)}` : `| ${cell(row.name)}`;
        const tail = purple ? `${POOL_NAMES[row.pool] ?? `加护池 ${row.pool}`} || ${effect}` : effect;
        lines.push(`${head} || ${tail}`);
    }

    return [
        title === '紫加护'
            ? `===${title}===\n紫加护只有在对应奈落的大哈肯处于激活状态时才会出现`
            : `===${title}===`,
        '{| class="wikitable"',
        purple ? '! class="md:w-40"|加护名 !! 奈落 !! 效果' : '! class="md:w-40"|加护名 !! 效果',
        ...lines,
        '|}',
    ].join('\n');
}

export function buildWikitext(data: BlessingFile, kinds: Record<string, EffectKind>): string {
    const sections = RARITY_SECTIONS.map((_, rarity) => sectionOf(data, rarity, kinds));
    return [
        MARK_START,
        '<!-- 本段由 local_scripts/wiki/updateHakenPage.ts 按解包数据（HakenBlessing）生成，请勿手工编辑 -->',
        sections.join('\n\n'),
        MARK_END,
    ].join('\n');
}

// ==================== 写页面 ====================

/** 标记优先；没有标记时整段替换从「白加护」到结尾的旧表格 */
const replaceBlock = (existing: string, block: string): string => {
    const start = existing.indexOf(MARK_START);
    const end = existing.indexOf(MARK_END);
    if (start >= 0 && end > start) {
        return existing.slice(0, start) + block + existing.slice(end + MARK_END.length);
    }
    const headingAt = existing.indexOf(FIRST_HEADING);
    if (headingAt >= 0) return `${existing.slice(0, headingAt)}${block}\n`;
    const head = existing.trimEnd();
    return head ? `${head}\n\n${block}\n` : `${block}\n`;
};

const parseArgs = () => {
    const argv = process.argv.slice(2);
    const pageIndex = argv.indexOf('--page');
    return {
        dryRun: argv.includes('--dry-run'),
        page: pageIndex >= 0 ? argv[pageIndex + 1] : '哈肯',
    };
};

async function readKinds(): Promise<Record<string, EffectKind>> {
    try {
        const extra = JSON.parse(await fs.readFile(EXTRA_FILE, 'utf8')) as {
            effectKinds?: Record<string, EffectKind>;
        };
        return extra.effectKinds ?? {};
    } catch {
        // 没跑过 build_mock 时退回数据里自带的日文种类名
        return {};
    }
}

async function main(): Promise<void> {
    const { dryRun, page: pageTitle } = parseArgs();

    const data = JSON.parse(await fs.readFile(DATA_FILE, 'utf8')) as BlessingFile;
    if (!Array.isArray(data.items) || !data.items.length) throw new Error(`${DATA_FILE} 里没有 items`);

    const block = buildWikitext(data, await readKinds());

    if (dryRun) {
        await fs.mkdir(path.dirname(WORK_FILE), { recursive: true });
        await fs.writeFile(WORK_FILE, block, 'utf8');
        console.log(`${data.items.length} 种加护 -> ${WORK_FILE}（${block.length} 字符，dry-run 不写 wiki）`);
        return;
    }

    if (!WIKI_PREFIX || !WIKI_AUTHKEY || !WIKI_USERNAME || !WIKI_PASSWORD) {
        throw new Error('缺少环境变量 VITE_WIKI_PREFIX / WIKI_AUTHKEY / WIKI_USERNAME / WIKI_PASSWORD');
    }

    const bot = new HuijiWiki(WIKI_PREFIX, WIKI_AUTHKEY);
    console.log('登录 wiki...');
    if (!(await bot.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
        throw new Error(`wiki 登录失败（${bot.getLastErrorMessage() || '未知原因'}），请检查 .env`);
    }

    const current = await bot.getPageRawTextByTitle(pageTitle);
    const existing = current?.content ?? '';
    console.log(`读取「${pageTitle}」：${existing.length} 字符`);

    const text = replaceBlock(existing, block);
    if (text === existing) {
        console.log('内容没有变化，跳过编辑');
        return;
    }

    const res = await bot.editPage(pageTitle, text, { summary: '按解包数据补全哈肯的加护一览' });
    if (res.error) throw new Error(res.error.info ?? JSON.stringify(res.error));
    console.log(`「${pageTitle}」已更新（${existing.length} -> ${text.length} 字符）`);
}

main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
});
