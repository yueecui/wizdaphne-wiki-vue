/**
 * 从解包主数据生成「心器之渊」（天赋树）的 mock 数据，输出到 `public/talent.gamedata.json`。
 *
 * 数据来源（`out/masterdata/`）：
 * - `PlayerGrowthForkedRoad.json`：小节点（能力值 / 熟习 / 技能 / 职业），带坐标与连线
 * - `PlayerGrowthVessel.json`：心器大节点，只用来取区域颜色（→ 分组）
 * - `Skill.json`：节点的候选项名字（`name.zhs`）
 * - `Job.json`：职业节点的名字
 *
 * 每次运行还会拉一次线上 `Data:Talent.json`，按节点 id 保留人工维护的
 * **节点名称 / 分组**、**分组配色**与**天赋总点数**；坐标、连线、花费、选项、
 * 权重等其他字段全部用解包数据覆盖。
 *
 * 用法：npx tsx ./local_scripts/wiki/genTalentTree.ts
 *
 * 人工命名：节点 id 形如 `r400`（`r` + 游戏 `PlayerGrowthForkedRoad.id`），只要游戏 id 不变就稳定。
 * 名字等手工内容写在 `local_scripts/wiki/talentOverrides.json`，按 id 覆盖，重新生成不会被冲掉：
 *
 * ```json
 * {
 *   "r400": { "label": "武士1" },
 *   "r62": { "label": "法师前3", "options": ["前置：法师职业上面的节点"] }
 * }
 * ```
 *
 * 可覆盖字段：`label` / `options` / `number` / `group` / `cost` / `type`。
 */
import axios from 'axios';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

// ── 配置 ────────────────────────────────────────────────────────

/** 解包主数据目录（可用环境变量覆盖） */
const MASTER_DIR =
    process.env.WIZ_MASTERDATA ?? 'd:/WizardyDaphne/WizardyDaphneUnpack/out/masterdata';
/** 产物路径 */
const OUT_FILE = path.resolve('public/talent.gamedata.json');
/** 原配色方案（沿用 wiki 手工版的 colors），线上拉取失败时也用它兜底 */
const PALETTE_FILE = path.resolve('public/talent.json');
/** 人工维护的节点覆盖（节点 id 稳定，所以重新生成不会丢） */
const OVERRIDE_FILE = path.resolve('local_scripts/wiki/talentOverrides.json');

/** 游戏坐标 -> 画布坐标的缩放（游戏相邻节点间距 250，缩到 100 左右） */
const SCALE = 0.4;
/** 画布四周留白 */
const MARGIN = 140;
/** 天赋点总量：游戏数据里没有，沿用 wiki 现有值 */
const TOTAL_POINTS = 50;

/**
 * 区域颜色 -> wiki 分组。
 *
 * 游戏数据只有颜色，分组名是从「该区域开放的职业 / 出现的能力」反推的，可人工修正。
 */
const COLOR_TO_GROUP: Record<string, string> = {
    FF0000: '无', // 中心：起点 + 流浪者
    DE2121: '力量', // 熟习武器 / 防具、亚人特效
    F67A00: '生命力', // 骑士
    '12C941': '信仰心', // 僧侣
    '0D50E9': '智慧', // 法师
    '0DD5ED': '敏捷',
    E3F010: '灵巧', // 盗贼
    A755E6: '幸运', // 种族变化 / 特殊技能
    '5D7A8C': '影', // 忍者
    '89003A': '仁义', // 武士
};

/** 没有对应颜色时的兜底分组 */
const FALLBACK_GROUP = '无';

// ── 主数据 ──────────────────────────────────────────────────────

interface RawVessel {
    id: number;
    vessel_ids: number[];
    x: number;
    y: number;
    size: number;
    angle: number;
    color: string;
    soul_crystal_id: number;
    soul_crystal_quantity: number;
    initial_vessel_flag: boolean;
}

interface RawRoad {
    id: number;
    vessel_id: number;
    forked_road_ids: number[];
    skill_ids: Record<string, number>;
    lottery_count: number;
    job_id: number;
    soul_point_quantity: number;
    x: number;
    y: number;
    initial_position_flag: boolean;
    icon_num: number;
    distant_forked_road_ids: number[];
}

interface RawSkill {
    id: number;
    name: Record<string, string> | string;
}

interface RawJob {
    id: number;
    name: Record<string, string> | string;
}

interface TalentColor {
    group: string;
    fill: string;
    stroke: string;
    text: string;
    activeFill: string;
    activeStroke: string;
    activeText: string;
    availableFill: string;
    availableStroke: string;
    availableText: string;
}

const load = <T>(name: string): T =>
    JSON.parse(readFileSync(path.join(MASTER_DIR, `${name}.json`), 'utf8')) as T;

/** 允许被人工覆盖的字段（其余字段仍由游戏数据决定） */
const OVERRIDABLE_KEYS = ['label', 'group', 'options', 'weights', 'number', 'cost', 'type'] as const;

type NodeOverride = Partial<Record<(typeof OVERRIDABLE_KEYS)[number], unknown>>;

/** 读人工覆盖表；文件不存在时生成一个空模板，方便直接编辑 */
const loadOverrides = (): Record<string, NodeOverride> => {
    if (!existsSync(OVERRIDE_FILE)) {
        writeFileSync(OVERRIDE_FILE, '{}\n', 'utf8');
        console.warn(`未找到人工覆盖表，已生成空模板：${OVERRIDE_FILE}`);
        return {};
    }
    try {
        return JSON.parse(readFileSync(OVERRIDE_FILE, 'utf8')) as Record<string, NodeOverride>;
    } catch (error) {
        console.warn(`人工覆盖表解析失败，本次忽略：${error}`);
        return {};
    }
};

/** 读原配色方案；文件缺失时返回空表，由下面的 buildColor 兜底 */
const loadPalette = (): TalentColor[] => {
    try {
        return (JSON.parse(readFileSync(PALETTE_FILE, 'utf8')) as { colors: TalentColor[] }).colors ?? [];
    } catch {
        console.warn(`未找到原配色（${PALETTE_FILE}），改用区域色推导`);
        return [];
    }
};

// ── 线上数据 ────────────────────────────────────────────────────

/** 线上天赋树页面（人工维护的名称 / 分组 / 配色 / 总点数以它为准） */
const ONLINE_TALENT_URL = 'https://wizdaphne.huijiwiki.com/wiki/Data:Talent.json?action=raw';
const ONLINE_HEADERS = { 'user-agent': 'Yuee-Tool/0.1', Accept: 'application/json, text/plain, */*' };

interface OnlineNode {
    id?: string;
    label?: string;
    group?: string;
}

interface OnlineTalent {
    totalPoints?: number;
    colors?: TalentColor[];
    nodes?: OnlineNode[];
}

/**
 * 拉线上 `Data:Talent.json`。
 *
 * 只取「游戏数据里没有、人工维护过」的部分：节点 `label` / `group`、`colors`、`totalPoints`；
 * 坐标 / 选项 / 连线等一律用解包数据覆盖。拉取失败时退回本地 `public/talent.json`
 * （`scrape:data` 抓的同一份），再失败就纯用游戏数据生成。
 */
const fetchOnlineTalent = async (): Promise<OnlineTalent | null> => {
    try {
        const response = await axios.get(`${ONLINE_TALENT_URL}&t=${Date.now()}`, {
            headers: ONLINE_HEADERS,
            timeout: 30000,
            responseType: 'text',
            transformResponse: [(data: string) => data],
        });
        const raw = typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
        return JSON.parse(raw) as OnlineTalent;
    } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        console.warn(`拉取线上天赋树失败（${reason}），退回本地 ${path.basename(PALETTE_FILE)}`);
        if (!existsSync(PALETTE_FILE)) return null;
        try {
            return JSON.parse(readFileSync(PALETTE_FILE, 'utf8')) as OnlineTalent;
        } catch {
            console.warn('本地备份也读不出来，本次全部按游戏数据生成');
            return null;
        }
    }
};

/** 多语言字段取值 */
const text = (value: Record<string, string> | string | undefined, lang = 'zhs'): string => {
    if (!value) return '';
    return typeof value === 'string' ? value : (value[lang] ?? value.ja ?? '');
};

// ── 颜色工具 ────────────────────────────────────────────────────

const hexToRgb = (hex: string) => {
    const value = hex.replace('#', '');
    return [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16));
};

const withAlpha = (hex: string, alpha: number) =>
    `#${hex.replace('#', '')}${Math.round(alpha * 255)
        .toString(16)
        .padStart(2, '0')}`;

const mix = (hex: string, target: string, ratio: number) => {
    const a = hexToRgb(hex);
    const b = hexToRgb(target);
    return `#${a
        .map((v, i) => Math.round(v + (b[i] - v) * ratio).toString(16).padStart(2, '0'))
        .join('')}`;
};

/** 由游戏区域色推一套三态配色 */
const buildColor = (group: string, hex: string) => ({
    group,
    fill: withAlpha(hex, 0.28),
    stroke: hex,
    text: mix(hex, '#ffffff', 0.82),
    activeFill: hex,
    activeStroke: mix(hex, '#ffffff', 0.35),
    activeText: '#ffffff',
    availableFill: withAlpha(hex, 0.16),
    availableStroke: mix(hex, '#ffffff', 0.45),
    availableText: mix(hex, '#ffffff', 0.7),
});

// ── 生成 ────────────────────────────────────────────────────────

const vessels = load<RawVessel[]>('PlayerGrowthVessel');
const roads = load<RawRoad[]>('PlayerGrowthForkedRoad');
const skills = new Map(load<RawSkill[]>('Skill').map((s) => [String(s.id), s]));
const jobs = new Map(load<RawJob[]>('Job').map((j) => [j.id, j]));
const vesselById = new Map(vessels.map((v) => [v.id, v]));

/** 去掉「（心器）」后缀，tooltip 里更好读 */
const cleanOption = (value: string) => value.replace(/[（(]心器[）)]$/, '').trim();

const groupOf = (road: RawRoad) => {
    const color = (vesselById.get(road.vessel_id)?.color ?? '').toUpperCase();
    return COLOR_TO_GROUP[color] ?? FALLBACK_GROUP;
};

/** 节点标题：游戏里没有名字，按图标类型给个短标签 */
const labelOf = (road: RawRoad, options: string[]) => {
    if (road.job_id) return text(jobs.get(road.job_id)?.name) || '职业';
    switch (road.icon_num) {
        case 100:
            return '能力值';
        case 200:
            return '熟习';
        case 300:
            return options[0] ?? '技能';
        case 400:
        case 401:
            return '心器';
        default:
            return '节点';
    }
};

const nodeId = (roadId: number) => `r${roadId}`;

const bounds = [...roads, ...vessels].reduce(
    (acc, row) => ({
        minX: Math.min(acc.minX, row.x),
        maxX: Math.max(acc.maxX, row.x),
        minY: Math.min(acc.minY, row.y),
        maxY: Math.max(acc.maxY, row.y),
    }),
    { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity },
);

const centerX = (bounds.minX + bounds.maxX) / 2;
const centerY = (bounds.minY + bounds.maxY) / 2;

interface TalentNodeOut {
    id: string;
    label: string;
    group: string;
    cost: number;
    x: number;
    y: number;
    options: string[];
    weights?: number[];
    number: number;
    type?: number;
}

const nodes: TalentNodeOut[] = roads.map((road) => {
    // 同名选项（不同 skill id）合并权重
    const optionWeights = new Map<string, number>();
    for (const [id, weight] of Object.entries(road.skill_ids)) {
        const name = cleanOption(text(skills.get(id)?.name));
        if (!name) continue;
        optionWeights.set(name, (optionWeights.get(name) ?? 0) + weight);
    }

    const options = [...optionWeights.keys()];
    const weights = [...optionWeights.values()];

    return {
        id: nodeId(road.id),
        label: labelOf(road, options),
        group: groupOf(road),
        cost: road.soul_point_quantity,
        x: Math.round((road.x - centerX) * SCALE),
        // 游戏坐标 y 轴向上、画布 y 轴向下，取反
        y: Math.round(-(road.y - centerY) * SCALE),
        options,
        ...(weights.length ? { weights } : {}),
        number: road.lottery_count || options.length || 1,
        ...(road.initial_position_flag ? { type: 1 } : {}),
    };
});

// 线上已有的人工内容：按节点 id 保留名称与分组，其余字段一律用游戏数据更新
const online = await fetchOnlineTalent();
const onlineNodes = new Map(
    (online?.nodes ?? [])
        .filter((node): node is OnlineNode & { id: string } => typeof node.id === 'string' && node.id !== '')
        .map((node) => [node.id, node]),
);

let keptFromOnline = 0;
for (const node of nodes) {
    const old = onlineNodes.get(node.id);
    if (!old) continue;
    if (old.label) node.label = old.label;
    if (old.group) node.group = old.group;
    keptFromOnline++;
}

// 人工命名 / 手动调整：节点 id 由游戏数据决定且稳定，所以覆盖表不会被下次生成冲掉
const overrides = loadOverrides();
const overriddenIds = new Set<string>();
for (const node of nodes) {
    const override = overrides[node.id];
    if (!override) continue;

    overriddenIds.add(node.id);
    const target = node as unknown as Record<string, unknown>;
    for (const key of OVERRIDABLE_KEYS) {
        if (override[key] !== undefined) target[key] = override[key];
    }
}

// 覆盖表里残留的 id（游戏改了 id / 节点被删）给出提示，避免静默失效
const staleOverrideIds = Object.keys(overrides).filter((id) => !overriddenIds.has(id));

// 连线去重（游戏里是双向存储），并补上跨区远连接
const edgeMap = new Map<string, { from: string; to: string; distant?: boolean }>();
const addEdge = (a: number, b: number, distant = false) => {
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (a === b) return;

    const existing = edgeMap.get(key);
    if (existing) {
        // 同一条线既是普通连接又被标成远连接时，保留跨区样式
        if (distant) existing.distant = true;
        return;
    }

    edgeMap.set(key, distant
        ? { from: nodeId(a), to: nodeId(b), distant: true }
        : { from: nodeId(a), to: nodeId(b) });
};

const roadIds = new Set(roads.map((r) => r.id));
for (const road of roads) {
    for (const next of road.forked_road_ids) {
        if (roadIds.has(next)) addEdge(road.id, next);
    }
    // distant_forked_road_ids：跨区远连接，前端会画成半透明金色
    for (const next of road.distant_forked_road_ids) {
        if (roadIds.has(next)) addEdge(road.id, next, true);
    }
}
const edges = [...edgeMap.values()];

// 配色沿用原方案（线上优先）：按原顺序取用到的分组，缺的分组再按区域色推导
const palette = online?.colors?.length ? online.colors : loadPalette();
const usedGroups = new Set(nodes.map((n) => n.group));
usedGroups.add(FALLBACK_GROUP); // 兜底分组必须有配色

const colors = palette.filter((c) => usedGroups.has(c.group));
const colored = new Set(colors.map((c) => c.group));
for (const group of usedGroups) {
    if (colored.has(group)) continue;
    const hex = Object.keys(COLOR_TO_GROUP).find((key) => COLOR_TO_GROUP[key] === group);
    colors.push(buildColor(group, hex ? `#${hex}` : '#888888'));
}

const data = {
    // 天赋总点数人工维护过，线上有就用线上的
    totalPoints: online?.totalPoints ?? TOTAL_POINTS,
    width: Math.ceil((bounds.maxX - bounds.minX) * SCALE) + MARGIN * 2,
    height: Math.ceil((bounds.maxY - bounds.minY) * SCALE) + MARGIN * 2,
    radius: 30,
    nodes,
    edges,
    colors,
};

writeFileSync(OUT_FILE, JSON.stringify(data, null, 1), 'utf8');

// ── 统计 ────────────────────────────────────────────────────────

const byGroup: Record<string, number> = {};
for (const node of nodes) byGroup[node.group] = (byGroup[node.group] ?? 0) + 1;

console.log(`已生成 ${path.relative(process.cwd(), OUT_FILE)}`);
console.log(`  节点 ${nodes.length} / 连线 ${edges.length} / 画布 ${data.width}x${data.height}`);
console.log(`  分组：${Object.entries(byGroup).map(([g, n]) => `${g}(${n})`).join(' ')}`);
console.log(`  分组合计 ${colors.length} 组配色（总点数 ${data.totalPoints}）`);
console.log(
    online
        ? `  线上合并：保留 ${keptFromOnline} / ${nodes.length} 个节点的名称与分组`
        : '  线上合并：未取到线上数据，全部按游戏数据生成',
);
console.log(`  人工覆盖 ${overriddenIds.size} / ${nodes.length} 个节点（${path.basename(OVERRIDE_FILE)}）`);
if (staleOverrideIds.length) {
    console.warn(`  覆盖表里有 ${staleOverrideIds.length} 个 id 已不存在于游戏中：${staleOverrideIds.join(', ')}`);
}
