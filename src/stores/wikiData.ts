/**
 * Wiki data store: IndexedDB cache + in-memory lookup data.
 *
 * Flow (see docs/data-wiki-api-indexeddb.md):
 *   1. compare the local data version with ``Api/Version``;
 *   2. version mismatch / empty cache -> pull every module, ``decodeDoc`` and
 *      ``bulkPut`` into IndexedDB;
 *   3. otherwise read the cache;
 *   4. keep everything in refs so components never touch the network / DB
 *      while browsing.
 *
 * The cache is invalidated as a whole (the game data changes every few months),
 * which keeps the sync logic trivial compared with per-row diffs.
 */

import Dexie, { type Table } from 'dexie';
import { defineStore } from 'pinia';
import { computed, reactive, ref } from 'vue';
import {
    CHAR_FIELDS,
    EQUIP_FIELDS,
    JOB_FIELDS,
    SKILL_FIELDS,
    decodeDoc,
} from '../api/dbCodec';
import {
    fetchAllModuleItems,
    fetchDataVersion,
    fetchEffectKind,
    fetchModuleItems,
    type EffectKindMap,
} from '../api/wikiData';
import type { SerializedJunkItem } from '../views/DataV2/junk/types';

export interface EnumEntry {
    name?: string;
    name_jp?: string;
    name_en?: string;
    lang?: string;
}

export interface EffectParamLabel {
    /** 名称；末尾带 ``%`` 表示该值是百分数（显示时 ``%`` 移到数值后面） */
    name: string;
    /** @deprecated 旧数据里的单位，现已改用名称末尾的 ``%`` */
    unit?: string;
}

export interface EffectKindEntry extends EnumEntry {
    id: number;
    count?: number;
    /** labels for param_1..7; a ``null`` slot means unknown / unused */
    params?: Array<EffectParamLabel | null> | null;
    /** 互斥 / 互相移除的效果种类（暂无可读枚举） */
    invalid_kinds?: number[] | null;
    remove_kinds?: number[] | null;
}

export interface EnumsPayload {
    alignment: Record<string, string>;
    skill_kind: Record<string, string>;
    cost_kind: Record<string, string>;
    damage_type: Record<string, string>;
    use_timing: Record<string, string>;
    rarity: Record<string, EnumEntry>;
    race: Record<string, EnumEntry>;
    attribute: Record<string, EnumEntry>;
    gender: Record<string, EnumEntry>;
    personality: Record<string, EnumEntry>;
    grade: Record<string, EnumEntry>;
    job: Record<string, EnumEntry>;
    target: Record<string, EnumEntry>;
    /** ``Skill.equipment_limited``: 单手剑 / 双手斧 / … */
    equipment_type: Record<string, EnumEntry>;
    effect_kind: Record<string, EffectKindEntry>;
}

export interface RawCharacter {
    id: number;
    group: number;
    guide_no: number;
    name: string;
    name_jp: string;
    name_en: string;
    style: string;
    default: boolean;
    rarity: number;
    race: number;
    attribute: number;
    gender: number;
    personality: number;
    grade: number;
    alignment: number;
    align_point: number;
    jobs: Array<{ id: number; primary: boolean }>;
    fate: number;
    stats: {
        base: Record<string, number>;
        growth: Record<string, number>;
        pools: Record<string, { base: number; growth: number }>;
        growth_rate: Array<Record<string, number>>;
    };
    talent: { id: number; min: Record<string, number>; max: Record<string, number> };
    mental: number;
    skills: {
        unique: number[];
        inherit: number[];
        potential: number[];
        discipline: Array<{ id: number; level: number; need_point: number }>;
        same: number[];
        exclude: number[];
        get_lv: number;
    };
    images: {
        image?: string;
        /** thumbnail sprite stem, e.g. ``tmb_chara_01001_00_02`` */
        thumbnail?: string;
        /** callable file name, e.g. ``tmb_chara_01001_00_02.png`` */
        thumbnail_file?: string;
        /** source folder of the sprite: ``chara`` / ``gasha`` */
        thumbnail_dir?: string;
    };
    voice: { speech?: string; speech_lang?: string; breakup?: string; breakup_lang?: string; group?: number };
    /** 克己技能与额外提升的属性标签 */
    self_restraint?: { id?: number; extra_tags?: string[] };
    /** 潜在继承技能的解锁等级（``sub_inheritance_grade_id``） */
    potential_grade?: number;
}

/**
 * 角色补充数据，来自 ``Api/GetV2Character`` 顶层的 ``extra``（长键、不压缩），
 * 源文件是仓库里的 ``config/Data_CharacterExtra.tabx.xlsx``。
 * 导入时按 ``id`` 合并进角色，不写进 items。
 */
export interface RawCharacterExtra {
    id: number;
    index?: number;
    /** 卡池组：-1 限定 / -2 联动 / 0 共用 / 1 Ⅰ组 / 2 Ⅱ组 */
    group?: number;
    character_voice?: string;
    /** 上线日期，``milliseconds`` 为 UTC 时间戳 */
    release_date?: { date?: string; time?: string; milliseconds?: number };
}

export interface RawJob {
    id: number;
    name: string;
    name_jp: string;
    name_en: string;
    abbreviation?: string;
    display_order: number;
    category: string;
    alignment: number[];
    base: Record<string, number>;
    growth: Record<string, number>;
    multipliers: Record<string, number>;
    skills: Array<{ id: number; get_lv: number }>;
    skill_variants: Record<string, Array<{ id: number; get_lv: number }>>;
    skill_count: number;
    characters: { primary: number[]; changeable: number[] };
    /** 转职到本职业所需的道具（按角色组给，道具名暂缺） */
    change_items?: Array<{ item?: number; quantity?: number; group?: number }>;
}

/** 装备数值（0 级 / 满强化共用同一组键） */
export interface RawEquipmentStat {
    /** 攻击 */
    atk: number;
    /** 攻击次数（防具为 0） */
    c: number;
    mag: number;
    div: number;
    def: number;
    mdef: number;
    /** 速度 */
    spe: number;
    /** 命中 */
    acc: number;
    /** 会心 */
    sur: number;
    /** 回避 */
    eva: number;
    /** 抵抗 */
    res: number;
    /** 探知 */
    det: number;
    /** 陷阱解除 */
    dtrap: number;
    /** 陷阱回避 */
    etrap: number;
}

/**
 * 装备特性：技能 identification + 装备引用的等级。
 * 名字与说明都不落地，前端按 ``id`` 从技能数据（IndexedDB）里查。
 */
export interface RawEquipmentRef {
    /** ``Skill.identification``（纯 lock config 特性则是 ``EquipmentLockConfig.id``） */
    id: number;
    /** 装备引用的技能等级（1 级为 0） */
    level: number;
    /** 展示型 lock config 特性的名字（技能数据里查不到） */
    name: string;
    /** 展示型 lock config 特性的手写说明 */
    desc: string;
}

/** 强化曲线的一行：该等级的完整数值（只输出与 +0 不同的等级） */
export interface RawEquipmentLevel extends Partial<RawEquipmentStat> {
    lv: number;
}

/**
 * 材质补强（合材补强）的一行。``rank`` 是**目标阶级**、``level`` 是该阶级内的
 * 次数；五项属性是累计加成（新阶级第 1 次接着上一阶级满次继续加）。
 */
export interface RawEquipmentOverRank {
    rank: number;
    level: number;
    /** 金币消耗 */
    cost: number;
    atk: number;
    mag: number;
    div: number;
    def: number;
    mdef: number;
}

export interface RawEquipmentSetSkill {
    id: number;
    skill_id: number;
    skill_name: string;
    require_count: number;
    max_level: number;
    add_skill_level: number;
}

/**
 * 一件装备（一个 ``identification``）。同一 identification 在 ``Equipment``
 * 表里有多行抽选档位，清洗时已合并成一条。
 */
export interface RawEquipment {
    id: number;
    name: string;
    name_jp: string;
    name_en: string;
    /** 列表分组：武器 / 盾 / 头部 / 身体 / 手部 / 脚部 / 饰品 / 工具 */
    category: string;
    type_id: number;
    /** 类型名：短剑 / 单手剑 / 双手斧 … */
    type: string;
    /** ``EquipmentType.part``，1/2 是武器 */
    part: number;
    /** 阶级 */
    rank: number;
    /** 图鉴编号；特殊装备（图鉴 ``display_type`` 2）为 ``"EX"``，没有图鉴记录为 null */
    collection_id: number | 'EX' | null;
    /** ``Equipment.element``：1 火 / 2 水 / 3 风 / 4 土 / 5 光 / 6 暗 */
    element: number;
    element_name: string;
    special: boolean;
    /** 客户端备注（日文，多为特性说明） */
    note: string;
    /** 列表图标资源名（不含 ``.png``，与其它 wiki 图片同目录） */
    list_icon: string;
    /** 背包大图标资源名（``assets.lib/sprite/EquipmentIcon``，不含 ``.png``） */
    icon: string;
    /** 特典分类：9 = 特典（解包/接口暂未提供，占位） */
    soucate: number;
    /** 中文说明（解包/接口暂未提供，占位） */
    desc: string;
    /** 获取途径（解包/接口暂未提供，占位） */
    sou: string[];
    /** 装备需求（解包/接口暂未提供，占位） */
    req: string[];
    /** 妖精可装备：0 不支持 / 1 可装备 / 2 限定妖精（暂未提供，占位） */
    fa_can: number;
    /** 妖精专属技能（暂未提供，占位） */
    fa_sk: string;
    /** 妖精技能描述（暂未提供，占位） */
    fa_sk_desc: string;
    /** 强化曲线（每个等级一行完整数值，只输出与 +0 不同的等级） */
    levels: RawEquipmentLevel[];
    /** 加护概率：4 个槽位 × 19 个属性（``Api/GetV2Equipment`` 顶层 bonus） */
    bonus: number[][] | null;
    /** 强化上限 */
    reinforce_max: number;
    /** 材质补强（目标阶级从当前+1 起；空数组 = 已是最上位阶级） */
    over_rank: RawEquipmentOverRank[];
    /** 0 级数值 */
    stats: RawEquipmentStat;
    /** 满强化推算值（base + 强化组） */
    max_stats: RawEquipmentStat;
    /** 装备类型特性（lock config characteristic 100 / standard_skill_ids） */
    skills: RawEquipmentRef[];
    /** 非装备类型特性 */
    traits: RawEquipmentRef[];
    set_skills: RawEquipmentSetSkill[];
}

/**
 * 类型基准值（``Api/GetV2Equipment`` 顶层 ``baseStat``，本地备份是
 * ``config/EquipmentApi.json``）。列表用它判断「同类型同阶级」的偏高 / 偏低，
 * 值 ``-1`` 表示该属性不参与比较。``i`` 同时是类型按钮的排序序号（< 100 武器，>= 100 防具）。
 */
export interface EquipmentBaseStatEntry {
    i: number;
    atk?: number;
    c?: number;
    mag?: number;
    div?: number;
    def?: number;
    mdef?: number;
    spe?: number;
    acc?: number;
    sur?: number;
    eva?: number;
    res?: number;
}

export interface RawSkillDamage {
    attack_rate: number;
    attack_rate_both_hands: number;
    add_damage_rate: number;
    add_critical_rate: number;
    valid_cap_parameter_value: number;
    valid_cap_parameter_value_both_hands: number;
    valid_start_parameter_value: number;
    attack_type: number;
    /** stat the attack rate is a percentage of (SkillReferenceParamType) */
    reference_parameter?: number;
    /** second stat scaled into the attack rate (double-scaling skills) */
    reference_parameter_2?: number;
    damage_type: number;
    /** element ids: 1 fire .. 7 untyped, 99 physical, 999 none */
    aptitude_ids?: number[];
    fixed_damage: number;
    hit_rate: number;
    damage_count: number;
    only_once: boolean;
    target: number;
}

/** 被引用的 sub effect 的摘要（``child_sub_effect_ids`` / ``extension_params`` 展开） */
export interface RawSubEffectBriefLeaf {
    id: number;
    kind?: number;
    kind_name?: string;
    params?: number[];
    strength?: number;
    turn?: number;
    target?: number;
    target_text?: string;
}

/**
 * 只再展开一层（清洗时已限制深度）。拆成两个接口是必须的：
 * 自引用类型会让 Dexie 的 ``KeyPaths`` 映射类型无限展开而报错。
 */
export interface RawSubEffectBrief extends RawSubEffectBriefLeaf {
    children?: RawSubEffectBriefLeaf[];
}

export interface RawSkillSubEffect {
    kind: number;
    params: number[];
    strength: number;
    turn: number;
    target: number;
    from: 'damage' | 'effect_group' | 'attack_start';
    /** apply check: which stat scales the chance, base rate, and the stat window */
    reference_parameter?: number;
    reference_parameter_rate?: number;
    abnormal_valid_start_parameter_value?: number;
    abnormal_valid_cap_parameter_value?: number;
    force_apply?: boolean;
    is_ignore_resist?: boolean;
    /** 施加率参照的抗性类型（暂无可读枚举） */
    reference_resist?: number;
    /** 追加的子效果 id（引用 ``SkillSubEffect``） */
    child_sub_effect_ids?: number[];
    /** 只对特定种族生效 */
    target_race_ids?: number[];
    /** ``SkillSubEffectExtensionParam`` 的扩展参数（多数是别的 sub effect id） */
    extension_params?: number[];
    /** ``child_sub_effect_ids`` 的展开版 */
    child_sub_effects?: RawSubEffectBrief[];
    /** ``extension_params`` 的展开版 */
    extension_effects?: RawSubEffectBrief[];
    /** 参数里指向的效果（参数序号 -> 被引用效果的摘要） */
    param_refs?: Record<string, RawSubEffectBrief>;
    /** 效果量（恢复量等）：参照能力值、百分比与阈值窗口 */
    calc_reference_parameter?: number;
    calc_reference_parameter_2?: number;
    calc_reference_parameter_rate?: number;
    calc_reference_parameter_rate_2?: number;
    calc_valid_cap_parameter_value?: number;
    calc_valid_start_parameter_value?: number;
}

export interface RawSkillLevel {
    level: number;
    cost: number;
    cost_kind: number;
    use_timing: number;
    /** 每场战斗的可用次数（0 = 不限） */
    use_limit?: number;
    /** 仇恨值 */
    hate?: number;
    /** 技能射程：0 近距离 / 1 中距离 / 10 远距离 / 99 依武器 */
    range_type?: number;
    /** 使用条件 id（暂无可读枚举） */
    skill_condition_ids?: number[];
    description?: string;
    description_lang?: string;
    damage: RawSkillDamage[];
    sub_effects: RawSkillSubEffect[];
}

export interface RawSkill {
    id: number;
    name: string;
    name_jp: string;
    name_en: string;
    kind: number;
    max_level: number;
    passive: boolean;
    player: boolean;
    test: boolean;
    level0: boolean;
    sources: string[];
    jobs: number[];
    description?: string;
    detail_description?: string;
    description_lang?: string;
    job_limited: number[];
    equipment_limited: number[];
    tags: number[];
    learn: Array<{ job: number; get_lv: number }>;
    levels: RawSkillLevel[];
}

interface MetaRow {
    key: string;
    value: unknown;
}

const DB_NAME = 'wizdaphne-wiki-v2';
/** bump when the stored document shape changes -> whole DB is rebuilt */
export const DB_SCHEMA_VERSION = 12;

/**
 * 杂物整理结果（官网抓包 → JunkItem 全量几率组合）。
 * 和 wiki 数据放在同一个库里，整库重建时一起失效，不再单独维护一个数据库。
 */
export interface JunkCacheRow {
    /** 固定为 ``all``（源数据是整包） */
    key: string;
    /** 写入时的 ``DB_SCHEMA_VERSION``，结构变了就当作没有缓存 */
    schemaVersion: number;
    /** 源数据内容哈希（仅留档，不再用于判断是否走网络） */
    hash: string;
    items: SerializedJunkItem[];
    savedAt: number;
}

class WikiDataDb extends Dexie {
    characters!: Table<RawCharacter, number>;
    jobs!: Table<RawJob, number>;
    skills!: Table<RawSkill, number>;
    equipments!: Table<RawEquipment, number>;
    meta!: Table<MetaRow, string>;
    junk!: Table<JunkCacheRow, string>;

    constructor() {
        super(DB_NAME);
        this.version(1).stores({
            characters: 'id',
            jobs: 'id',
            skills: 'id',
            equipments: 'id',
            meta: 'key',
        });
        // v2：杂物整理结果并入主库
        this.version(2).stores({ junk: 'key' });
    }
}

let db: WikiDataDb | null = null;

/** 主库单例（杂物整理结果等附属缓存也复用它） */
export const getWikiDb = () => (db ??= new WikiDataDb());

const emptyEnums = (): EnumsPayload => ({
    alignment: {},
    skill_kind: {},
    cost_kind: {},
    damage_type: {},
    use_timing: {},
    rarity: {},
    race: {},
    attribute: {},
    gender: {},
    personality: {},
    grade: {},
    job: {},
    target: {},
    equipment_type: {},
    effect_kind: {},
});

/**
 * 线上 Wiki 的 Lua 模块序列化 table 时，「从 1 开始的连续整数 key」会被当成数组：
 * ``{1:"善",2:"中立",3:"恶"}`` 到线上就变成 ``["善","中立","恶"]``。
 * 受影响的字典是 key 连续的那几个（alignment / cost_kind / damage_type，以及
 * 恰好也从 1 开始连续的 rarity / grade / job 等）——这里统一还原成
 * ``{"1": ...}`` 形态（数组下标 0 对应 key 1），组件就不用区分线上 / DEV。
 */
const toKeyedRecord = <T,>(value: unknown): Record<string, T> => {
    if (Array.isArray(value)) {
        const out: Record<string, T> = {};
        value.forEach((item, index) => {
            out[String(index + 1)] = item as T;
        });
        return out;
    }
    return value && typeof value === 'object' ? { ...(value as Record<string, T>) } : {};
};

/** 把载荷里的字典统一成对象（数组形态按 Lua 的 1 起下标还原） */
const normalizeEnums = (raw: unknown): EnumsPayload => {
    const source =
        raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
    const base = emptyEnums() as unknown as Record<string, unknown>;
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(base)) {
        out[key] = toKeyedRecord(source[key]);
    }
    return out as unknown as EnumsPayload;
};

/**
 * 角色个体出现几率，来自 ``Api/GetV2Character`` 顶层的 ``rates``。
 * ``r`` 开头的是百分比，其余是属性系数（0 / 0.5 / 1 …）。
 */
export interface RawCharacterRate {
    id: number;
    name?: string;
    str?: number;
    iq?: number;
    pie?: number;
    vit?: number;
    dex?: number;
    spe?: number;
    luck?: number;
    rstr?: number;
    riq?: number;
    rpie?: number;
    rvit?: number;
    rdex?: number;
    rspe?: number;
    rluck?: number;
    rbase?: number;
}

/** ``extra`` 数组 -> ``{id: 补充数据}``；结构不对时当没有补充数据 */
function extraMap(raw: unknown): Record<number, RawCharacterExtra> {
    const out: Record<number, RawCharacterExtra> = {};
    if (!Array.isArray(raw)) return out;
    for (const row of raw as RawCharacterExtra[]) {
        if (row && typeof row.id === 'number') out[row.id] = row;
    }
    return out;
}

/** ``rates`` 数组 -> ``{id: 几率数据}`` */
function rateMap(raw: unknown): Record<number, RawCharacterRate> {
    const out: Record<number, RawCharacterRate> = {};
    if (!Array.isArray(raw)) return out;
    for (const row of raw as RawCharacterRate[]) {
        if (row && typeof row.id === 'number') out[row.id] = row;
    }
    return out;
}

export const useWikiDataStore = defineStore('wiki-data', () => {
    const characters = ref<RawCharacter[]>([]);
    const jobs = ref<RawJob[]>([]);
    const skills = ref<RawSkill[]>([]);
    const equipments = ref<RawEquipment[]>([]);
    const enums = ref<EnumsPayload>(emptyEnums());
    /** ``Api/GetV2Character`` 顶层的 extra，按角色 id 索引 */
    const characterExtras = ref<Record<number, RawCharacterExtra>>({});
    /** ``Api/GetV2Character`` 顶层的 rates，按角色 id 索引 */
    const characterRates = ref<Record<number, RawCharacterRate>>({});
    /** ``Api/GetV2Equipment`` 顶层的 baseStat，按键是类型名（含 ``R{阶级}`` 变体） */
    const equipmentBaseStat = ref<Record<string, EquipmentBaseStatEntry>>({});

    const version = ref<number | null>(null);
    const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const error = ref<string | null>(null);
    const fromCache = ref(false);

    const counts = reactive({
        characters: 0,
        jobs: 0,
        skills: 0,
        playerSkills: 0,
        equipments: 0,
    });

    let pending: Promise<void> | null = null;

    const getDb = getWikiDb;

    function apply(database: WikiDataDb, payload: {
        characters: RawCharacter[];
        jobs: RawJob[];
        skills: RawSkill[];
        equipments: RawEquipment[];
        enums: EnumsPayload;
        version: number | null;
        extras?: Record<number, RawCharacterExtra>;
        rates?: Record<number, RawCharacterRate>;
        /** 装备类型基准值（顶层 baseStat） */
        baseStat?: Record<string, EquipmentBaseStatEntry> | null;
    }) {
        characters.value = payload.characters;
        jobs.value = payload.jobs;
        skills.value = payload.skills;
        equipments.value = payload.equipments;
        enums.value = normalizeEnums(payload.enums);
        version.value = payload.version;
        characterExtras.value = payload.extras ?? {};
        characterRates.value = payload.rates ?? {};
        equipmentBaseStat.value = payload.baseStat ?? {};

        counts.characters = payload.characters.length;
        counts.jobs = payload.jobs.length;
        counts.skills = payload.skills.length;
        counts.playerSkills = payload.skills.filter((s) => s.player).length;
        counts.equipments = payload.equipments.length;

        void database;
    }

    /** effect kind：名称 + 各位置参数名 */
    function mergeEffectKinds(patch: EffectKindMap) {
        const next = { ...enums.value.effect_kind };
        for (const [key, fix] of Object.entries(patch)) {
            const base = next[key];
            if (!base) continue; // 只修数据里存在的 kind
            const params =
                base.params && fix.params
                    ? base.params.map((label, index) => {
                          const name = fix.params?.[index];
                          return name ? { ...(label ?? {}), name } : label;
                      })
                    : (base.params ?? null);
            next[key] = { ...base, name: fix.name ?? base.name, params };
        }
        enums.value = { ...enums.value, effect_kind: next };
    }

    /**
     * 效果种类名表：每次加载都重新拉一次（不受数据版本号约束），
     * 所以在 wiki 上改完名字，刷新页面就生效，不用重新生成数据。
     * 拉不到（离线 / 模块还没建）时退回上次成功拉取的结果，避免名字全空。
     */
    async function applyEffectKindNames(database: WikiDataDb) {
        const patch = await fetchEffectKind();

        if (patch) {
            mergeEffectKinds(patch);
            await database.meta.put({ key: 'effectKindNames', value: patch });
            return;
        }

        const cached = (await database.meta.get('effectKindNames'))?.value as
            | EffectKindMap
            | undefined;
        if (cached) mergeEffectKinds(cached);
    }

    async function download(database: WikiDataDb, remoteVersion: number) {
        const [charPayload, jobPayload, skillPayload, equipPayload, enumPayload] = await Promise.all([
            fetchAllModuleItems('Character'),
            fetchAllModuleItems('Job'),
            fetchAllModuleItems('Skill'),
            fetchAllModuleItems('Equipment'),
            // 字典只有一个条目，不需要分页
            fetchModuleItems('Enum'),
        ]);

        const decoded = {
            characters: charPayload.items.map((row) => decodeDoc<RawCharacter>(row as never, CHAR_FIELDS)),
            jobs: jobPayload.items.map((row) => decodeDoc<RawJob>(row as never, JOB_FIELDS)),
            skills: skillPayload.items.map((row) => decodeDoc<RawSkill>(row as never, SKILL_FIELDS)),
            equipments: equipPayload.items.map((row) => decodeDoc<RawEquipment>(row as never, EQUIP_FIELDS)),
            // 线上可能把连续整数 key 的字典转成数组，统一还原成对象再落库
            enums: normalizeEnums(enumPayload.items[0]),
            version: remoteVersion,
            extras: extraMap(charPayload.extra),
            rates: rateMap(charPayload.rates),
            baseStat: (equipPayload.baseStat as Record<string, EquipmentBaseStatEntry>) ?? null,
        };

        await database.transaction(
            'rw',
            [database.characters, database.jobs, database.skills, database.equipments, database.meta],
            async () => {
                await database.characters.clear();
                await database.jobs.clear();
                await database.skills.clear();
                await database.equipments.clear();
                await database.characters.bulkPut(decoded.characters);
                await database.jobs.bulkPut(decoded.jobs);
                await database.skills.bulkPut(decoded.skills);
                await database.equipments.bulkPut(decoded.equipments);
                await database.meta.bulkPut([
                    { key: 'dataVersion', value: remoteVersion },
                    { key: 'enums', value: decoded.enums },
                    { key: 'characterExtras', value: decoded.extras },
                    { key: 'characterRates', value: decoded.rates },
                    { key: 'equipmentBaseStat', value: decoded.baseStat },
                ]);
            },
        );

        apply(database, decoded);
    }

    async function readCache(database: WikiDataDb) {
        const [chars, jobRows, skillRows, equipRows, metaRows] = await Promise.all([
            database.characters.toArray(),
            database.jobs.toArray(),
            database.skills.toArray(),
            database.equipments.toArray(),
            database.meta.bulkGet([
                'dataVersion',
                'enums',
                'characterExtras',
                'characterRates',
                'equipmentBaseStat',
            ]),
        ]);

        const [versionRow, enumRow, extrasRow, ratesRow, baseStatRow] = metaRows;

        apply(database, {
            characters: chars,
            jobs: jobRows,
            skills: skillRows,
            equipments: equipRows,
            // 旧缓存里可能存着数组形态，读出来也统一还原
            enums: normalizeEnums(enumRow?.value),
            version: (versionRow?.value as number) ?? null,
            extras: (extrasRow?.value as Record<number, RawCharacterExtra>) ?? {},
            baseStat: (baseStatRow?.value as Record<string, EquipmentBaseStatEntry>) ?? null,
            rates: (ratesRow?.value as Record<number, RawCharacterRate>) ?? {},
        });
    }

    async function load() {
        status.value = 'loading';
        error.value = null;

        let database = getDb();

        const schemaRow = await database.meta.get('dbSchemaVersion').catch(() => undefined);
        if (schemaRow && schemaRow.value !== DB_SCHEMA_VERSION) {
            await database.delete();
            db = null;
            database = getDb();
        }

        const remote = await fetchDataVersion();
        const cachedVersion = (await database.meta.get('dataVersion'))?.value as number | undefined;
        const cachedSkills = await database.skills.count();

        const needsRefresh =
            cachedSkills === 0 ||
            cachedVersion === undefined ||
            (remote !== null && remote.version !== cachedVersion);

        if (needsRefresh) {
            // 版本接口缺失 / 被拦截时不直接挂掉：按版本 0 先拉一次数据，
            // 等 Api/Version 可用后版本不一致会自动重拉。
            if (!remote) console.warn('[wikiData] 取不到数据版本，先按空版本拉取数据');
            try {
                await download(database, remote?.version ?? 0);
            } catch (e) {
                throw new Error(`拉取数据失败：${e instanceof Error ? e.message : String(e)}`);
            }
            fromCache.value = false;
        } else {
            await readCache(database);
            fromCache.value = true;
        }

        await database.meta.put({ key: 'dbSchemaVersion', value: DB_SCHEMA_VERSION });

        // 效果种类名表盖在生成数据之上，所以放在最后一步
        await applyEffectKindNames(database);
        status.value = 'ready';
    }

    /** idempotent: concurrent callers share the same promise */
    function init(): Promise<void> {
        if (status.value === 'ready') return Promise.resolve();
        if (pending) return pending;

        pending = load()
            .catch((e: unknown) => {
                status.value = 'error';
                error.value = e instanceof Error ? e.message : String(e);
            })
            .finally(() => {
                pending = null;
            });

        return pending;
    }

    /** drop the cache and pull everything again */
    async function refresh(): Promise<void> {
        const database = getDb();
        await database.characters.clear();
        await database.jobs.clear();
        await database.skills.clear();
        await database.equipments.clear();
        await database.meta.clear();
        // 装备名称 / 阶级变了，杂物整理结果也要重算
        await database.junk.clear();
        status.value = 'idle';
        await init();
    }

    const ready = computed(() => status.value === 'ready');

    return {
        characters,
        jobs,
        skills,
        equipments,
        enums,
        characterExtras,
        characterRates,
        equipmentBaseStat,
        version,
        status,
        error,
        fromCache,
        counts,
        ready,
        init,
        refresh,
    };
});
