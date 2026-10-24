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
const DB_SCHEMA_VERSION = 2;

class WikiDataDb extends Dexie {
    characters!: Table<RawCharacter, number>;
    jobs!: Table<RawJob, number>;
    skills!: Table<RawSkill, number>;
    meta!: Table<MetaRow, string>;

    constructor() {
        super(DB_NAME);
        this.version(1).stores({
            characters: 'id',
            jobs: 'id',
            skills: 'id',
            meta: 'key',
        });
    }
}

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
    const enums = ref<EnumsPayload>(emptyEnums());
    /** ``Api/GetV2Character`` 顶层的 extra，按角色 id 索引 */
    const characterExtras = ref<Record<number, RawCharacterExtra>>({});
    /** ``Api/GetV2Character`` 顶层的 rates，按角色 id 索引 */
    const characterRates = ref<Record<number, RawCharacterRate>>({});

    const version = ref<number | null>(null);
    const status = ref<'idle' | 'loading' | 'ready' | 'error'>('idle');
    const error = ref<string | null>(null);
    const fromCache = ref(false);

    const counts = reactive({
        characters: 0,
        jobs: 0,
        skills: 0,
        playerSkills: 0,
    });

    let db: WikiDataDb | null = null;
    let pending: Promise<void> | null = null;

    const getDb = () => (db ??= new WikiDataDb());

    function apply(database: WikiDataDb, payload: {
        characters: RawCharacter[];
        jobs: RawJob[];
        skills: RawSkill[];
        enums: EnumsPayload;
        version: number | null;
        extras?: Record<number, RawCharacterExtra>;
        rates?: Record<number, RawCharacterRate>;
    }) {
        characters.value = payload.characters;
        jobs.value = payload.jobs;
        skills.value = payload.skills;
        enums.value = payload.enums;
        version.value = payload.version;
        characterExtras.value = payload.extras ?? {};
        characterRates.value = payload.rates ?? {};

        counts.characters = payload.characters.length;
        counts.jobs = payload.jobs.length;
        counts.skills = payload.skills.length;
        counts.playerSkills = payload.skills.filter((s) => s.player).length;

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
        const [charPayload, jobPayload, skillPayload, enumPayload] = await Promise.all([
            fetchAllModuleItems('Character'),
            fetchAllModuleItems('Job'),
            fetchAllModuleItems('Skill'),
            // 字典只有一个条目，不需要分页
            fetchModuleItems('Enum'),
        ]);

        const decoded = {
            characters: charPayload.items.map((row) => decodeDoc<RawCharacter>(row as never, CHAR_FIELDS)),
            jobs: jobPayload.items.map((row) => decodeDoc<RawJob>(row as never, JOB_FIELDS)),
            skills: skillPayload.items.map((row) => decodeDoc<RawSkill>(row as never, SKILL_FIELDS)),
            enums: (enumPayload.items[0] ?? emptyEnums()) as EnumsPayload,
            version: remoteVersion,
            extras: extraMap(charPayload.extra),
            rates: rateMap(charPayload.rates),
        };

        await database.transaction(
            'rw',
            [database.characters, database.jobs, database.skills, database.meta],
            async () => {
                await database.characters.clear();
                await database.jobs.clear();
                await database.skills.clear();
                await database.characters.bulkPut(decoded.characters);
                await database.jobs.bulkPut(decoded.jobs);
                await database.skills.bulkPut(decoded.skills);
                await database.meta.bulkPut([
                    { key: 'dataVersion', value: remoteVersion },
                    { key: 'enums', value: decoded.enums },
                    { key: 'characterExtras', value: decoded.extras },
                    { key: 'characterRates', value: decoded.rates },
                ]);
            },
        );

        apply(database, decoded);
    }

    async function readCache(database: WikiDataDb) {
        const [chars, jobRows, skillRows, metaRows] = await Promise.all([
            database.characters.toArray(),
            database.jobs.toArray(),
            database.skills.toArray(),
            database.meta.bulkGet(['dataVersion', 'enums', 'characterExtras', 'characterRates']),
        ]);

        const [versionRow, enumRow, extrasRow, ratesRow] = metaRows;

        apply(database, {
            characters: chars,
            jobs: jobRows,
            skills: skillRows,
            enums: (enumRow?.value as EnumsPayload) ?? emptyEnums(),
            version: (versionRow?.value as number) ?? null,
            extras: (extrasRow?.value as Record<number, RawCharacterExtra>) ?? {},
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
        await database.meta.clear();
        status.value = 'idle';
        await init();
    }

    const ready = computed(() => status.value === 'ready');

    return {
        characters,
        jobs,
        skills,
        enums,
        characterExtras,
        characterRates,
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
