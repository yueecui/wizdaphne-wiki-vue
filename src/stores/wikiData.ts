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
    ENEMY_FIELDS,
    ENEMY_POOL_FIELDS,
    EQUIP_FIELDS,
    EQUIPMENT_EXTRA_FIELDS,
    ITEM_FIELDS,
    JOB_FIELDS,
    MAP_FIELDS,
    RELIC_EXTRA_FIELDS,
    RELIC_FIELDS,
    SHOP_FIELDS,
    SKILL_FIELDS,
    decodeDoc,
} from '../api/dbCodec';
import {
    asArray,
    fetchDataVersion,
    fetchEnums,
    fetchExtra,
    fetchModule,
    type EffectKind,
    type EffectKindMap,
    type ExtraPayload,
} from '../api/wikiData';
import { IS_DEV } from '../util';
import type { ItemDoc } from '../views/DataV2/itemTypes';
import type { SerializedJunkItem } from '../views/DataV2/junk/types';
import type { RelicDoc, RelicExtra } from '../views/DataV2/relicTypes';
import type { ShopDoc } from '../views/DataV2/shopTypes';

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

/** 参数标注：优先直接写字符串（``"武器@eq"``），也兼容旧的 ``{ "name": "…" }`` */
export type EffectParamEntry = string | EffectParamLabel;

export interface EffectKindEntry extends EnumEntry {
    id: number;
    count?: number;
    /** labels for param_1..7; a ``null`` slot means unknown / unused */
    params?: Array<EffectParamEntry | null> | null;
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
    /** ``EnemySpecies``：敌人种族（与角色的 ``race`` 是两套表） */
    enemy_species: Record<string, EnumEntry>;
    /** ``EnemyCharacteristic``：不死 / 幻灵 / 史莱姆 … */
    enemy_characteristic: Record<string, EnumEntry>;
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
    /** 觉醒版（``…0099`` / ``…0100``）：不进角色列表，只在角色 modal 里切换 */
    hidden?: boolean;
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
        /** 立绘编号（三位数），三张 ``Fate*`` 图共用这个索引 */
        image?: string;
        /** 结缘界面半身立绘，e.g. ``FateImage037.png`` */
        fate_image?: string;
        /** 结缘全身立绘，e.g. ``FateChara037.png`` */
        fate_chara?: string;
        /** 结缘列表头像，e.g. ``FateCharaFace037.png`` */
        fate_face?: string;
        /** 卡池列表小图，e.g. ``GachaItemListSaleBanner_003.png`` */
        gacha_item_banner?: string;
        /** 卡池详情大图，e.g. ``LegendCharacterSale_BannerL003.png``（展示用 ``_s`` 版） */
        legend_character_sale?: string;
        /** thumbnail sprite stem, e.g. ``tmb_chara_01001_00_02`` */
        thumbnail?: string;
        /** callable file name, e.g. ``tmb_chara_01001_00_02.png`` */
        thumbnail_file?: string;
        /** source folder of the sprite: ``chara`` / ``gasha`` */
        thumbnail_dir?: string;
        /** 画廊肖像大图，e.g. ``portrait_0001.png`` */
        portrait?: string;
        /** 画廊肖像画（细节版），e.g. ``portrait_0001_detail.png`` */
        portrait_detail?: string;
    };
    voice: { speech?: string; speech_lang?: string; breakup?: string; breakup_lang?: string; group?: number };
    /** 克己技能与额外提升的属性标签 */
    self_restraint?: { id?: number; extra_tags?: string[] };
    /** 营地 / 酒馆对话（同一角色的各风格版本共用一份） */
    dialogue?: {
        camp?: Array<{ question: string; answer: string }> | null;
        tavern?: Array<{ topic: string; order: number }> | null;
    } | null;
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
    /**
     * 概率UP立绘编号（手工表 ``banner`` 列），数字补 5 位即 ``gacha_banner_00002.png``。
     * 线上 ``Api/GetV2Extra`` 给的是 ``"2;18;28;40"`` 这样用分号拼的字符串，
     * mock 给的是数组，前端用 ``parseBanner`` 统一。
     */
    banner?: string | number[] | null;
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
    /** 特典分类：9 = 特典，0 = 普通（来自 ``Api/GetV2Equipment`` 的 extra） */
    soucate: number;
    /** 中文说明（解包/接口暂未提供，占位） */
    desc: string;
    /** 获取途径（wiki 手工补充 ``Data:EquipmentExtra.tabx``） */
    sou: string[];
    /** 装备需求（解包/接口暂未提供，占位） */
    req: string[];
    /** 妖精标记：0 不适用 / 1 可用 / 2 专用（解包 ``conditions_*`` 的种族条件） */
    fa_can: number;
    /** 妖精技能 = 套装技能名（多个用「、」连接） */
    fa_sk: string;
    /** 妖精技能说明（套装技能说明，中文） */
    fa_sk_desc: string;
    /** 职业限制：``Job.id`` 列表，空 = 不限 */
    job_limited: number[];
    /** 种族限制：``CharacterSpecies.id`` 列表，空 = 不限 */
    race_limited: number[];
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
    /** 商店来源（来自 shop.py 清洗后的店铺，不含限时商店；空数组 = 商店买不到） */
    shop: RawEquipmentShop[];
}

export interface RawEquipmentShop {
    /** 商店展示名，如「金币商店 · 全城镇通用」 */
    shop_name?: string;
    price?: number;
    /** 货币名；兑换点数时是实际点数名（如「银鳞硬币」） */
    currency_name?: string;
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
    /** 效果量（恢复量）：参照能力值、百分比与阈值窗口 */
    calc_reference_parameter?: number;
    calc_reference_parameter_2?: number;
    calc_reference_parameter_rate?: number;
    calc_reference_parameter_rate_2?: number;
    calc_valid_cap_parameter_value?: number;
    calc_valid_start_parameter_value?: number;
}

/**
 * 只再展开一层（清洗时已限制深度）。拆成两个接口是必须的：
 * 自引用类型会让 Dexie 的 ``KeyPaths`` 映射类型无限展开而报错。
 */
export interface RawSubEffectBrief extends RawSubEffectBriefLeaf {
    children?: RawSubEffectBriefLeaf[];
}

/**
 * kind 2790「敵のバフ数によってStepReplace」的档位：
 * ``step`` 是敌人能力提升效果数量的档，指向实际执行的技能效果组
 */
export interface RawStepReplace {
    step: number;
    effect_group: number;
    effects?: RawSubEffectBriefLeaf[];
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
    /** kind 2790：按敌人 buff 数量档替换的效果组 */
    step_replace?: RawStepReplace[];
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
    /** 该等级自己的名字（多级技能名字不同时才有） */
    name?: string;
    name_lang?: string;
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
    /** 被召唤出来的单位（``EnemyFriendLayout``）：敌人分类 + 等级 + 数量 */
    summons?: Array<{ category: number; level: number; count: number }>;
    description?: string;
    detail_description?: string;
    description_lang?: string;
    job_limited: number[];
    equipment_limited: number[];
    tags: number[];
    learn: Array<{ job: number; get_lv: number }>;
    levels: RawSkillLevel[];
}

/** 敌人数值块：`(base + growth * level / 100) * correction / 100`，HP 另按 min/max 浮动 */
export interface RawEnemyStat {
    base: number;
    growth: number;
    /** 修正率，100 = 原值（缺省 100） */
    correction: number;
    /** HP 浮动下限（百分数，缺省 100） */
    min: number;
    /** HP 浮动上限（百分数，缺省 100） */
    max: number;
}

/** 冻结 / 破冰 */
export interface RawEnemyFreeze {
    half: number;
    full: number;
    break: number;
    recovery: number;
    wait_min: number;
    wait_max: number;
    intelligence: number;
}

/** 体型统计：同一分类下可能出现多种 body_size */
export interface RawEnemyBodySize {
    size: number[];
    count: number;
}

/** AI 技能池里的一行：技能 + 随机权重 + 选目标的条件文案（默认目标为空） */
export interface RawEnemyAiSkill {
    /** 技能 identification */
    skill: number;
    /** 随机抽选权重 */
    weight: number;
    /** 选目标的条件文案，空 = 默认目标 */
    target?: string;
}

/** 一条触发条件：整段文案，或「前缀 + 敌人分类 id / 子效果种类 id + 后缀」 */
export interface RawEnemyAiCondition {
    /** 整段文案（没有链接时使用，未知类型是 ``type N``） */
    text?: string;
    /** 链接前缀，例如「单位」/「敌人分类」/「我方」 */
    label?: string;
    /** ``EnemyCategory.id`` */
    ref?: number;
    /** ``SkillSubEffectKind.id``（前端用效果种类名表换成状态名） */
    status?: number;
    /** 链接后缀，例如「存在」/「2 人以上」 */
    suffix?: string;
}

/** AI 行动规则的一行 = 一条「条件成立 → 用这个技能池」（``EnemyAi`` + ``EnemySkillGroup``） */
export interface RawEnemyAiRule {
    /** 判定顺序，小的先检查 */
    priority: number;
    /** 触发条件（多条之间是「且」） */
    conditions: RawEnemyAiCondition[];
    skills: RawEnemyAiSkill[];
}

/** 插入（割り込み）技能：``EnemyInterruptAction`` 按技能合并后的一种触发方式 */
export interface RawEnemyInterrupt {
    /** 技能 identification */
    skill: number;
    /** 整场战斗只能用一次 */
    once: boolean;
    /** HP 阈值（%），0 = 不是 HP 触发 */
    hp: number;
    /** 触发条件的展示文案（与 AI 行动规则同一套结构） */
    conditions?: RawEnemyAiCondition[];
}

/** 一个出现变体（一个 ``Enemy`` 行） */
export interface RawEnemyVariant {
    id: number;
    /** 强度档位：0 普通 / 1 强化1 / 2 强化2 / 3 首领 / 4 强敌（待核对） */
    kind: number;
    param: number;
    exp: number;
    ai: number;
    /** [最低等级, 最高等级] */
    level: number[];
    attribute: number[];
    attack_attribute: number[];
    weak: number[];
    characteristics: number[];
    gimmicks: number[];
    fly: boolean;
    body_size: number[];
    /** 技能 identification（行动 + 插入 + 被动 + 挣扎 的并集） */
    skills: number[];
    /** 引用到的技能等级：``identification -> level``（多级技能里实际使用的等级） */
    skill_levels?: Record<number, number>;
    /** 行动技能（``EnemyAi`` 给该 ``ai_id`` 挂的技能组，不含插入） */
    action_skills?: number[];
    /** 插入（割り込み）技能，带「一次」标记与 HP 触发条件 */
    interrupts?: RawEnemyInterrupt[];
    /** 被动（``Enemy.standard_skill_ids``） */
    passive_skills?: number[];
    /** 挣扎（``Enemy.skill_struggle``），0 / 缺省 = 无 */
    struggle_skill?: number;
    /** AI 行动规则：priority 升序，条件成立就用该技能池 */
    ai_plan?: RawEnemyAiRule[];
    stats: Record<string, RawEnemyStat>;
    resist: Record<string, number>;
    freeze: RawEnemyFreeze;
}

/** 一条 = 一个 ``EnemyCategory``（图鉴条目 + 只在解包数据里存在的分类） */
export interface RawEnemy {
    id: number;
    /** 图鉴编号；0 = 没有图鉴记录 */
    no: number;
    book: number | null;
    name: string;
    name_jp: string;
    name_en: string;
    /** wiki 缩略图（去掉 ``_s.png`` 后缀），例如 ``tmb_enemy_090_005_00`` */
    thumbnail: string;
    boss: boolean;
    /** ``EnemySpecies.id`` */
    race: number;
    lineage: number;
    /** 体型档位：1 小 / 2 中 / 3 大 / 4 特大 */
    size: number;
    attack_type: number;
    damage_type: number;
    attribute: number[];
    attack_attribute: number[];
    weak: number[];
    characteristics: number[];
    gimmicks: number[];
    kinds: number[];
    level: { min: number; max: number };
    fly: boolean;
    body_size: RawEnemyBodySize[];
    resist: Record<string, number>;
    freeze: RawEnemyFreeze;
    skills: number[];
    variants: RawEnemyVariant[];
}

/** 层里出现过的敌人：只有 id 与等级范围，名称 / 属性查敌人模块 */
export interface RawMapEnemyRef {
    enemy_id: number;
    lv_min: number;
    lv_max: number;
    rows: number;
}

export interface RawMapMember {
    enemy_id: number;
    lv_min: number;
    lv_max: number;
    pos_x: number;
    pos_y: number;
    notorious: boolean;
    wanted: boolean;
    hate: boolean;
}

/** 一行 = 一个具体的敌群组合（``EnemyFormation`` 的一行） */
export interface RawMapFormation {
    formation_id: number;
    row_id: number;
    layout_id: number;
    weight: number;
    lv_min: number;
    lv_max: number;
    escape: number;
    surprise: number;
    preemption: number;
    exp_rate: number;
    drop_id: number;
    special_drop_id: number;
    drop_probability: number;
    trap_id: number;
    rare_trap_id: number;
    condition_id: number;
    respawn_kind: number;
    symbol_id: number;
    symbol_kind: number;
    grade_id: number;
    friend_prob: number;
    covert: number;
    win_condition: number;
    members: RawMapMember[];
}

/** ``Api/GetV2Map.items``：一条 = 一层（DungeonFloor） */
export interface RawMapFloor {
    id: number;
    name: string;
    map_id: number;
    map_name: string;
    area_id: number;
    scene_name: string;
    ceiling: boolean;
    floor_attribute: number;
    enemy_placement: number[];
    bgm: string;
    normal_enemies: RawMapEnemyRef[];
    notorious_enemies: RawMapEnemyRef[];
    formations: RawMapFormation[];
}

/** ``Api/GetV2Map.maps``：地图分类标签（DungeonSelect） */
export interface MapCategory {
    id: number;
    name: string;
    kind: number;
    group_id: number;
    town_name: string;
    floor_ids: number[];
}

/** 敌群能确定关联上的层 */
export interface RawPoolFloor {
    id: number;
    name: string;
    map_name: string;
}

/** ``Api/GetV2EnemyPool.items``：一条 = 一个敌群 */
export interface RawEnemyPool {
    id: number;
    row_count: number;
    lv_ranges: number[][];
    normal_enemies: RawMapEnemyRef[];
    notorious_enemies: RawMapEnemyRef[];
    /** 能确定关联上的层；挂不到层的敌群为空，不做推断 */
    floors: RawPoolFloor[];
    formations: RawMapFormation[];
}

interface MetaRow {
    key: string;
    value: unknown;
}

const DB_NAME = 'wizdaphne-wiki-v2';
/**
 * bump when the stored document shape changes -> whole DB is rebuilt。
 * 新增表（v3 的 items / relics / shops）不用改这个值：Dexie 升级会建空表，
 * ``load()`` 发现表是空的会自动重新下载，还能保住耗时的杂物整理缓存。
 */
export const DB_SCHEMA_VERSION = 13;

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
    items!: Table<ItemDoc, number>;
    relics!: Table<RelicDoc, number>;
    shops!: Table<ShopDoc, number>;
    enemies!: Table<RawEnemy, number>;
    /** 地图：一条 = 一层 */
    mapFloors!: Table<RawMapFloor, number>;
    /** 敌群：一条 = 一个敌群（含能确定关联的层） */
    enemyPools!: Table<RawEnemyPool, number>;
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
        // v3：道具 / 遗物 / 商店也缓存（此前这几个页面每次进都重新拉接口）
        this.version(3).stores({ items: 'id', relics: 'id', shops: 'id' });
        // v4：敌人（一个 EnemyCategory 一条）
        this.version(4).stores({ enemies: 'id' });
        // v5：地图（一条 = 一层）+ 敌群（一条 = 一个敌群）
        this.version(5).stores({ mapFloors: 'id', enemyPools: 'id' });
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
    enemy_species: {},
    enemy_characteristic: {},
    effect_kind: {},
});

/**
 * 线上 Wiki 的 Lua 模块序列化 table 时，「从 1 开始的连续整数 key」会被当成数组：
 * ``{1:"善",2:"中立",3:"恶"}`` 到线上就变成 ``["善","中立","恶"]``。
 * 受影响的字典是 key 连续的那几个（alignment / cost_kind / damage_type，以及
 * 恰好也从 1 开始连续的 rarity / grade / job 等）——这里统一还原成
 * ``{"1": ...}`` 形态（数组下标 0 对应 key 1），组件就不用区分线上 / DEV。
 */
const toKeyedRecord = <T>(value: unknown): Record<string, T> => {
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
    const source = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
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

/**
 * 遗物掉落怪物 / 推荐类别：``Api/GetV2Item`` 顶层的 ``relics_extra`` 以**遗物的物品图鉴编号**
 * 为键（道具数据 ``collection.no``，即 ``CollectionItem.list_number``），遗物行自己没有这个值，
 * 所以先按 ``relic.id`` 查道具表拿到图鉴编号再对。怪物还要把 ``monster_id``（敌人图鉴编号）
 * 换成名字（``EnemyCategory.no`` -> ``name``）。
 * 遗物行里已经带值的（手工数据填好的 ``monsters`` / ``categories``）优先保留。
 */
function mergeRelicExtras(relics: RelicDoc[], extras: RelicExtra[], enemies: RawEnemy[], items: ItemDoc[]): RelicDoc[] {
    if (relics.length === 0 || extras.length === 0) return relics;

    const extraById = new Map<number, RelicExtra>();
    for (const extra of extras) {
        if (extra.id != null) extraById.set(extra.id, extra);
    }
    if (extraById.size === 0) return relics;

    // 遗物道具 id -> 图鉴编号
    const bookNoByItem = new Map<number, number>();
    for (const item of items) {
        const bookNo = item.collection?.no;
        if (item.id != null && bookNo) bookNoByItem.set(item.id, bookNo);
    }

    const nameByNo = new Map<number, string>();
    for (const enemy of enemies) {
        if (enemy.no && enemy.name) nameByNo.set(enemy.no, enemy.name);
    }

    return relics.map((relic) => {
        const bookNo = relic.id == null ? undefined : bookNoByItem.get(relic.id);
        const extra = bookNo == null ? undefined : extraById.get(bookNo);
        if (!extra) return relic;
        const monsters = relic.monsters?.length
            ? relic.monsters
            : (extra.monster_id ?? []).map((id) => ({ id, name: nameByNo.get(id) ?? '' }));
        const categories = relic.categories?.length ? relic.categories : (extra.categories ?? []);
        return { ...relic, monsters, categories };
    });
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

/** ``Api/GetV2Extra.equipmentExtra`` 解出的一条 */
export interface EquipmentExtraRow {
    id?: number;
    /** 特典分类：9 = 特典，0 = 普通 */
    soucate?: number;
    /** 获取途径（wiki 手工补充，支持 ``[[页面|文字]]`` 链接） */
    sou?: string[];
}

/** 人工表（``Api/GetV2Extra``）解出来的六块 */
interface ExtraSections {
    characterExtras: Record<number, RawCharacterExtra>;
    equipmentBaseStat: Record<string, EquipmentBaseStatEntry>;
    equipmentExtras: EquipmentExtraRow[];
    relicExtras: RelicExtra[];
    relicCategories: string[];
    effectKinds: EffectKindMap | null;
}

const emptyExtraSections = (): ExtraSections => ({
    characterExtras: {},
    equipmentBaseStat: {},
    equipmentExtras: [],
    relicExtras: [],
    relicCategories: [],
    effectKinds: null,
});

/**
 * 装备特典分类 / 获取途径合并进装备行：人工表里有这条就整条覆盖，
 * 没有的沿用解包数据自带的值（旧数据页还把这两列并进了每件装备）。
 */
function mergeEquipmentExtras(equipments: RawEquipment[], extras: EquipmentExtraRow[]): RawEquipment[] {
    if (equipments.length === 0 || extras.length === 0) return equipments;

    const byId = new Map<number, EquipmentExtraRow>();
    for (const extra of extras) {
        if (extra.id != null) byId.set(extra.id, extra);
    }
    if (byId.size === 0) return equipments;

    return equipments.map((equipment) => {
        const extra = byId.get(equipment.id);
        if (!extra) return equipment;
        return { ...equipment, soucate: extra.soucate ?? 0, sou: extra.sou ?? [] };
    });
}

/**
 * ``Api/GetV2Extra`` -> 六块。``fallback`` 是旧接口的同名字段
 * （``GetV2Character.extra`` / ``GetV2Equipment.baseStat`` / ``GetV2Item.relics_extra`` …），
 * 接口还在灰度、Extra 模块缺失时照旧能用。
 */
function decodeExtraSections(
    extra: ExtraPayload | null,
    fallback: {
        characterExtra?: unknown;
        baseStat?: unknown;
        relicsExtra?: unknown;
        relicsCategories?: unknown;
        kinds?: EffectKindMap | null;
    } = {},
): ExtraSections {
    const relicExtras = asArray(extra?.relicExtra ?? fallback.relicsExtra)
        .map((row) => decodeDoc<RelicExtra>(row as never, RELIC_EXTRA_FIELDS))
        .filter((row) => row.id != null);
    const equipmentExtras = asArray(extra?.equipmentExtra)
        .map((row) => decodeDoc<EquipmentExtraRow>(row as never, EQUIPMENT_EXTRA_FIELDS))
        .filter((row) => row.id != null);

    return {
        characterExtras: extraMap(extra?.characterExtra ?? fallback.characterExtra),
        equipmentBaseStat:
            ((extra?.equipmentBaseStat ?? fallback.baseStat) as Record<string, EquipmentBaseStatEntry>) ?? {},
        equipmentExtras,
        relicExtras,
        relicCategories: asArray<string>(extra?.relicCategory ?? fallback.relicsCategories).filter(
            (name) => typeof name === 'string' && name !== '',
        ),
        effectKinds: extra?.effectKinds ?? fallback.kinds ?? null,
    };
}

/** 人工表六块 + 版本号写进 meta 的行（键名沿用旧结构，老缓存也能读） */
const extraMetaRows = (sections: ExtraSections, version: number): MetaRow[] => [
    { key: 'extraVersion', value: version },
    { key: 'characterExtras', value: sections.characterExtras },
    { key: 'equipmentBaseStat', value: sections.equipmentBaseStat },
    { key: 'equipmentExtras', value: sections.equipmentExtras },
    { key: 'relicExtras', value: sections.relicExtras },
    { key: 'relicCategories', value: sections.relicCategories },
    { key: 'effectKindNames', value: sections.effectKinds ?? {} },
];

export const useWikiDataStore = defineStore('wiki-data', () => {
    const characters = ref<RawCharacter[]>([]);
    const jobs = ref<RawJob[]>([]);
    const skills = ref<RawSkill[]>([]);
    const equipments = ref<RawEquipment[]>([]);
    /** ``Api/GetV2Item`` 的道具（图鉴 / 商店商品都按 id 查这张表） */
    const items = ref<ItemDoc[]>([]);
    /** ``Api/GetV2Item`` 顶层的 ``relics``（已并入 ``relics_extra`` 的掉落怪物 / 推荐类别） */
    const relics = ref<RelicDoc[]>([]);
    /** ``Api/GetV2Item`` 顶层的 ``relics_ccate``：推荐类别可选项（含顺序） */
    const relicCategories = ref<string[]>([]);
    /** ``Api/GetV2Shop`` */
    const shops = ref<ShopDoc[]>([]);
    /** ``Api/GetV2Enemy``：一条 = 一个敌人分类（含出现变体） */
    const enemies = ref<RawEnemy[]>([]);
    /** ``Api/GetV2Map``：一条 = 一层 */
    const mapFloors = ref<RawMapFloor[]>([]);
    /** ``Api/GetV2Map`` 顶层 ``maps``：地图分类标签 */
    const mapCategories = ref<MapCategory[]>([]);
    /** ``Api/GetV2EnemyPool``：一条 = 一个敌群 */
    const enemyPools = ref<RawEnemyPool[]>([]);
    const enums = ref<EnumsPayload>(emptyEnums());
    /** ``Api/GetV2Extra.characterExtra``，按角色 id 索引（卡池组 / 上线日期 / 声优） */
    const characterExtras = ref<Record<number, RawCharacterExtra>>({});
    /** ``Api/GetV2Character`` 顶层的 rates，按角色 id 索引（抓包数据，跟着解包版本走） */
    const characterRates = ref<Record<number, RawCharacterRate>>({});
    /** ``Api/GetV2Extra.equipmentBaseStat``，按键是类型名（含 ``R{阶级}`` 变体） */
    const equipmentBaseStat = ref<Record<string, EquipmentBaseStatEntry>>({});

    /** 原始（未合并人工表）的装备 / 遗物：人工表单独刷新时按它们重算 */
    let rawEquipments: RawEquipment[] = [];
    let rawRelics: RelicDoc[] = [];
    /** 当前生效的人工表分块：只刷新 Extra 时，接口缺的块沿用这里 */
    let extraSections: ExtraSections = emptyExtraSections();

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
        items: 0,
        relics: 0,
        shops: 0,
        enemies: 0,
        mapFloors: 0,
        enemyPools: 0,
    });

    let pending: Promise<void> | null = null;

    const getDb = getWikiDb;

    function apply(
        database: WikiDataDb,
        payload: {
            characters: RawCharacter[];
            jobs: RawJob[];
            skills: RawSkill[];
            equipments: RawEquipment[];
            enums: EnumsPayload;
            version: number | null;
            items?: ItemDoc[];
            relics?: RelicDoc[];
            shops?: ShopDoc[];
            enemies?: RawEnemy[];
            mapFloors?: RawMapFloor[];
            mapCategories?: MapCategory[];
            enemyPools?: RawEnemyPool[];
            rates?: Record<number, RawCharacterRate>;
            /** 人工表（``Api/GetV2Extra``）解出来的六块 */
            extraSections?: ExtraSections;
        },
    ) {
        characters.value = payload.characters;
        jobs.value = payload.jobs;
        skills.value = payload.skills;
        items.value = payload.items ?? [];
        shops.value = payload.shops ?? [];
        enemies.value = payload.enemies ?? [];
        mapFloors.value = payload.mapFloors ?? [];
        mapCategories.value = payload.mapCategories ?? [];
        enemyPools.value = payload.enemyPools ?? [];
        enums.value = normalizeEnums(payload.enums);
        version.value = payload.version;
        characterRates.value = payload.rates ?? {};

        rawEquipments = payload.equipments;
        rawRelics = payload.relics ?? [];
        // 装备特典 / 遗物类别要跟人工表合并，放在最后统一算
        applyExtraSections(payload.extraSections ?? emptyExtraSections());

        // 觉醒版也在 items 里（供角色 modal 切换），计数时不算
        counts.characters = payload.characters.filter((row) => !row.hidden).length;
        counts.jobs = payload.jobs.length;
        counts.skills = payload.skills.length;
        counts.playerSkills = payload.skills.filter((s) => s.player).length;
        counts.items = items.value.length;
        counts.shops = shops.value.length;
        counts.enemies = enemies.value.length;
        counts.mapFloors = mapFloors.value.length;
        counts.enemyPools = enemyPools.value.length;

        void database;
    }

    /** 人工表分块落地：只动 extra 相关的东西，然后重算派生数据 */
    function applyExtraSections(sections: ExtraSections) {
        extraSections = sections;
        characterExtras.value = sections.characterExtras;
        equipmentBaseStat.value = sections.equipmentBaseStat;
        // 效果种类名 / 参数名盖在字典的 effect_kind 之上
        if (sections.effectKinds) mergeEffectKinds(toKeyedRecord<EffectKind>(sections.effectKinds));
        recomputeDerived();
    }

    /** 装备 / 遗物与人工表的合并，只依赖内存里的原始数据（刷新 Extra 时复用） */
    function recomputeDerived() {
        equipments.value = mergeEquipmentExtras(rawEquipments, extraSections.equipmentExtras);
        // 掉落怪物按图鉴编号对道具表 / 敌人表
        relics.value = mergeRelicExtras(rawRelics, extraSections.relicExtras, enemies.value, items.value);
        // 类别顺序以 ``relicCategory`` 为准；缺省时按遗物上出现过的类别兜底
        relicCategories.value = extraSections.relicCategories.length
            ? extraSections.relicCategories
            : [...new Set(relics.value.flatMap((relic) => relic.categories ?? []))];
        counts.equipments = equipments.value.length;
        counts.relics = relics.value.length;
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
                          if (!name) return label;
                          // 旧写法是字符串，直接换成对象；对象写法只覆盖名字
                          return label && typeof label !== 'string' ? { ...label, name } : { name };
                      })
                    : (base.params ?? null);
            next[key] = { ...base, name: fix.name ?? base.name, params };
        }
        enums.value = { ...enums.value, effect_kind: next };
    }

    async function download(database: WikiDataDb, remoteVersion: number, remoteExtraVersion: number) {
        const [
            charPayload,
            skillPayload,
            equipPayload,
            itemPayload,
            shopPayload,
            enemyPayload,
            mapPayload,
            poolPayload,
            enumData,
            extraPayload,
        ] = await Promise.all([
            fetchModule('Character'),
            fetchModule('Skill'),
            fetchModule('Equipment'),
            // 道具与遗物同一个模块返回（`{items, relics}`）
            fetchModule('Item'),
            fetchModule('Shop'),
            // 敌人：items = 敌人分类，顶层 enemy_pool = 敌群（线上同一个模块）
            fetchModule('Enemy'),
            // 地图：map = 层，map_meta.maps = 分类标签
            fetchModule('Map'),
            // 敌群：线上随 Enemy 一起返回；DEV 仍读单独的 mock 快照
            IS_DEV ? fetchModule('EnemyPool') : Promise.resolve(null),
            // 字典（效果种类名已搬到 Extra，这里只留兜底）
            fetchEnums(),
            // 人工表：模块还没上线时按空块处理，页面照旧能用
            fetchExtra().catch(() => null),
        ]);

        const decoded = {
            characters: charPayload.items.map((row) => decodeDoc<RawCharacter>(row as never, CHAR_FIELDS)),
            // 职业不再单独开模块：``Api/GetV2Character`` 顶层的 ``jobs`` 就是原来的 job items
            jobs: asArray(charPayload.jobs).map((row) => decodeDoc<RawJob>(row as never, JOB_FIELDS)),
            skills: skillPayload.items.map((row) => decodeDoc<RawSkill>(row as never, SKILL_FIELDS)),
            equipments: equipPayload.items.map((row) => decodeDoc<RawEquipment>(row as never, EQUIP_FIELDS)),
            items: itemPayload.items.map((row) => decodeDoc<ItemDoc>(row as never, ITEM_FIELDS)),
            // 遗物挂在 Item 顶层，单独存一张表（弹窗按 id 查）
            relics: asArray(itemPayload.relics)
                .map((row) => decodeDoc<RelicDoc>(row as never, RELIC_FIELDS))
                .filter((row) => row.id != null),
            shops: shopPayload.items.map((row) => decodeDoc<ShopDoc>(row as never, SHOP_FIELDS)),
            enemies: enemyPayload.items.map((row) => decodeDoc<RawEnemy>(row as never, ENEMY_FIELDS)),
            mapFloors: mapPayload.items.map((row) => decodeDoc<RawMapFloor>(row as never, MAP_FIELDS)),
            mapCategories: asArray<MapCategory>(mapPayload.maps),
            // 线上敌群在 `enemy_pool`，DEV 从单独的 EnemyPool mock 读
            enemyPools: asArray<unknown>(enemyPayload.enemyPool ?? poolPayload?.items)
                .map((row) => decodeDoc<RawEnemyPool>(row as never, ENEMY_POOL_FIELDS)),
            // 线上可能把连续整数 key 的字典转成数组，统一还原成对象再落库
            enums: normalizeEnums(enumData.enums),
            version: remoteVersion,
            rates: rateMap(charPayload.rates),
            // 人工表六块：Extra 优先，旧接口的顶层字段兜底
            extraSections: decodeExtraSections(extraPayload, {
                characterExtra: charPayload.extra,
                baseStat: equipPayload.baseStat,
                relicsExtra: itemPayload.relicsExtra,
                relicsCategories: itemPayload.relicsCategories,
                kinds: enumData.kinds,
            }),
            extraVersion: remoteExtraVersion,
        };

        await database.transaction(
            'rw',
            [
                database.characters,
                database.jobs,
                database.skills,
                database.equipments,
                database.items,
                database.relics,
                database.shops,
                database.enemies,
                database.mapFloors,
                database.enemyPools,
                database.meta,
            ],
            async () => {
                await database.characters.clear();
                await database.jobs.clear();
                await database.skills.clear();
                await database.equipments.clear();
                await database.items.clear();
                await database.relics.clear();
                await database.shops.clear();
                await database.enemies.clear();
                await database.mapFloors.clear();
                await database.enemyPools.clear();
                await database.characters.bulkPut(decoded.characters);
                await database.jobs.bulkPut(decoded.jobs);
                await database.skills.bulkPut(decoded.skills);
                await database.equipments.bulkPut(decoded.equipments);
                await database.items.bulkPut(decoded.items);
                await database.relics.bulkPut(decoded.relics);
                await database.shops.bulkPut(decoded.shops);
                await database.enemies.bulkPut(decoded.enemies);
                await database.mapFloors.bulkPut(decoded.mapFloors);
                await database.enemyPools.bulkPut(decoded.enemyPools);
                await database.meta.bulkPut([
                    { key: 'dataVersion', value: remoteVersion },
                    // 地图分类（层是 items，分类单独存 meta）
                    { key: 'mapCategories', value: decoded.mapCategories },
                    { key: 'enums', value: decoded.enums },
                    { key: 'characterRates', value: decoded.rates },
                    // 人工表（`Api/GetV2Extra`）单独存，版本号单独存：改了只重拉这一块
                    ...extraMetaRows(decoded.extraSections, decoded.extraVersion),
                ]);
            },
        );

        apply(database, decoded);
    }

    async function readCache(database: WikiDataDb) {
        const [
            chars,
            jobRows,
            skillRows,
            equipRows,
            itemRows,
            relicRows,
            shopRows,
            enemyRows,
            mapRows,
            poolRows,
            metaRows,
        ] = await Promise.all([
            database.characters.toArray(),
            database.jobs.toArray(),
            database.skills.toArray(),
            database.equipments.toArray(),
            database.items.toArray(),
            database.relics.toArray(),
            database.shops.toArray(),
            database.enemies.toArray(),
            database.mapFloors.toArray(),
            database.enemyPools.toArray(),
            database.meta.bulkGet([
                'dataVersion',
                'enums',
                'characterExtras',
                'characterRates',
                'equipmentBaseStat',
                'equipmentExtras',
                'mapCategories',
                'relicExtras',
                'relicCategories',
                'effectKindNames',
            ]),
        ]);

        const [
            versionRow,
            enumRow,
            characterExtrasRow,
            ratesRow,
            baseStatRow,
            equipmentExtrasRow,
            mapCategoriesRow,
            relicExtrasRow,
            relicCategoriesRow,
            effectKindRow,
        ] = metaRows;

        apply(database, {
            characters: chars,
            jobs: jobRows,
            skills: skillRows,
            equipments: equipRows,
            items: itemRows,
            relics: relicRows,
            shops: shopRows,
            enemies: enemyRows,
            mapFloors: mapRows,
            mapCategories: (mapCategoriesRow?.value as MapCategory[]) ?? [],
            enemyPools: poolRows,
            // 旧缓存里可能存着数组形态，读出来也统一还原
            enums: normalizeEnums(enumRow?.value),
            version: (versionRow?.value as number) ?? null,
            rates: (ratesRow?.value as Record<number, RawCharacterRate>) ?? {},
            extraSections: {
                characterExtras: (characterExtrasRow?.value as Record<number, RawCharacterExtra>) ?? {},
                equipmentBaseStat: (baseStatRow?.value as Record<string, EquipmentBaseStatEntry>) ?? {},
                equipmentExtras: (equipmentExtrasRow?.value as EquipmentExtraRow[]) ?? [],
                relicExtras: (relicExtrasRow?.value as RelicExtra[]) ?? [],
                relicCategories: (relicCategoriesRow?.value as string[]) ?? [],
                effectKinds: (effectKindRow?.value as EffectKindMap) ?? null,
            },
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
        const cachedExtraVersion = (await database.meta.get('extraVersion'))?.value as number | undefined;
        const [cachedSkills, cachedItems, cachedEnemies, cachedMaps, cachedPools] = await Promise.all([
            database.skills.count(),
            database.items.count(),
            // 敌人表是后加的：老缓存版本号一致但表是空的，必须补一次下载
            database.enemies.count(),
            // 地图 / 敌群同理（v5 新增）
            database.mapFloors.count(),
            database.enemyPools.count(),
        ]);

        const needsRefresh =
            cachedSkills === 0 ||
            cachedItems === 0 ||
            cachedEnemies === 0 ||
            cachedMaps === 0 ||
            cachedPools === 0 ||
            cachedVersion === undefined ||
            (remote !== null && remote.version !== cachedVersion);

        if (needsRefresh) {
            // 版本接口缺失 / 被拦截时不直接挂掉：按版本 0 先拉一次数据，
            // 等 Api/Version 可用后版本不一致会自动重拉。
            if (!remote) console.warn('[wikiData] 取不到数据版本，先按空版本拉取数据');
            try {
                await download(database, remote?.version ?? 0, remote?.extra ?? 0);
            } catch (e) {
                throw new Error(`拉取数据失败：${e instanceof Error ? e.message : String(e)}`);
            }
            fromCache.value = false;
        } else {
            await readCache(database);
            fromCache.value = true;

            // 人工维护的数据有自己的版本号：只重拉 `Api/GetV2Extra`，不动解包表
            if (
                remote !== null &&
                (cachedExtraVersion === undefined || (remote.extra > 0 && remote.extra !== cachedExtraVersion))
            ) {
                try {
                    await refreshExtra(remote.extra);
                } catch (e) {
                    console.warn('[wikiData] 人工表刷新失败，先用缓存里的版本', e);
                }
            }
        }

        await database.meta.put({ key: 'dbSchemaVersion', value: DB_SCHEMA_VERSION });
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

    /**
     * 只重拉 ``Api/GetV2Extra``（人工维护的那六块），只更新 IndexedDB 里对应的 meta，
     * 解包表（角色 / 技能 / 装备 / 道具 …）一条都不动。
     *
     * 改完效果种类名、装备特典、遗物类别后点一下调试按钮走这里；
     * ``extraVersion`` 传空时顺手把 ``Api/Version`` 的 ``extra`` 记下来。
     */
    async function refreshExtra(extraVersion?: number): Promise<void> {
        const database = getDb();
        const extra = await fetchExtra();
        const sections = decodeExtraSections(extra);
        // 接口这次缺的块沿用当前内存里的，避免一次异常把已有数据清空
        const merged: ExtraSections = {
            characterExtras: extra.characterExtra ? sections.characterExtras : extraSections.characterExtras,
            equipmentBaseStat: extra.equipmentBaseStat ? sections.equipmentBaseStat : extraSections.equipmentBaseStat,
            equipmentExtras: extra.equipmentExtra ? sections.equipmentExtras : extraSections.equipmentExtras,
            relicExtras: extra.relicExtra ? sections.relicExtras : extraSections.relicExtras,
            relicCategories: extra.relicCategory ? sections.relicCategories : extraSections.relicCategories,
            effectKinds: sections.effectKinds ?? extraSections.effectKinds,
        };

        let nextVersion = extraVersion;
        if (nextVersion === undefined) {
            nextVersion = (await fetchDataVersion())?.extra ?? 0;
        }
        // ref 里的是 Vue 的响应式代理，IndexedDB 结构化克隆不了，先转回普通对象再落库
        const plain = JSON.parse(JSON.stringify(merged)) as ExtraSections;
        await database.meta.bulkPut(extraMetaRows(plain, nextVersion));
        applyExtraSections(plain);
    }

    /** drop the cache and pull everything again */
    async function refresh(): Promise<void> {
        const database = getDb();
        await database.characters.clear();
        await database.jobs.clear();
        await database.skills.clear();
        await database.equipments.clear();
        await database.items.clear();
        await database.relics.clear();
        await database.shops.clear();
        await database.enemies.clear();
        await database.mapFloors.clear();
        await database.enemyPools.clear();
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
        /** 道具（`Api/GetV2Item.items`） */
        items,
        /** 遗物（`Api/GetV2Item.relics`，掉落怪物 / 推荐类别已由 `Api/GetV2Extra` 合并） */
        relics,
        /** 遗物推荐类别可选项（`Api/GetV2Extra.relicCategory`） */
        relicCategories,
        /** 商店（`Api/GetV2Shop.items`） */
        shops,
        /** 敌人（`Api/GetV2Enemy.items`，一条 = 一个敌人分类） */
        enemies,
        /** 地图（`Api/GetV2Map.items`，一条 = 一层） */
        mapFloors,
        /** 地图分类（`Api/GetV2Map.maps`） */
        mapCategories,
        /** 敌群（`Api/GetV2EnemyPool.items`，一条 = 一个敌群） */
        enemyPools,
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
        /** 只重拉人工表（`Api/GetV2Extra`），调试用 */
        refreshExtra,
    };
});
