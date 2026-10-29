/**
 * Short-key <-> long-key codec for the wiki data modules.
 *
 * The wiki stores short-key JSON (produced by
 * `local_scripts/clean/build_mock.py`); the frontend decodes it
 * back to long keys so components keep using readable field names.
 *
 * Compression rules (see docs/05-data-pipeline.md §3.2):
 *  - `num`      0 is omitted, decode defaults to 0
 *  - `str`      "" is omitted, decode defaults to ""
 *  - `bool`     only `1` is written, decode = key present
 *  - arrays     empty arrays are omitted
 *  - `obj`      only written when it has content
 *  - `raw`      copied as-is (ids)
 */

export type FieldKind =
    | 'num'
    | 'str'
    | 'bool'
    | 'raw'
    | 'numArr'
    | 'strArr'
    | 'numArrArr'
    | 'numMap'
    | 'obj'
    | 'map'
    | 'objArr'
    | 'objArrMap';

export interface FieldSpec {
    /** key used by the frontend (long key) */
    long: string;
    /** key used on the wiki (short key) */
    short: string;
    kind: FieldKind;
    /** nested spec for obj / objArr / map / objArrMap */
    fields?: FieldSpec[];
    /** value map for `str`, e.g. { damage: 'd' } */
    map?: Record<string, string>;
}

export type Doc = Record<string, unknown>;

const STAT_FIELDS: FieldSpec[] = [
    { long: 'str', short: 's', kind: 'num' },
    { long: 'int', short: 'i', kind: 'num' },
    { long: 'pie', short: 'p', kind: 'num' },
    { long: 'vit', short: 'v', kind: 'num' },
    { long: 'agi', short: 'a', kind: 'num' },
    { long: 'dex', short: 'd', kind: 'num' },
    { long: 'luk', short: 'l', kind: 'num' },
    { long: 'hp', short: 'h', kind: 'num' },
    { long: 'mp', short: 'm', kind: 'num' },
    { long: 'sp', short: 'sp', kind: 'num' },
];

const JOB_REF: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'get_lv', short: 'l', kind: 'num' },
];

const LEARN: FieldSpec[] = [
    { long: 'job', short: 'j', kind: 'num' },
    { long: 'get_lv', short: 'l', kind: 'num' },
];

const DISCIPLINE: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'level', short: 'l', kind: 'num' },
    { long: 'need_point', short: 'np', kind: 'num' },
];

const DAMAGE: FieldSpec[] = [
    { long: 'attack_rate', short: 'ar', kind: 'num' },
    { long: 'attack_rate_both_hands', short: 'a2', kind: 'num' },
    { long: 'add_damage_rate', short: 'ad', kind: 'num' },
    { long: 'add_critical_rate', short: 'cr', kind: 'num' },
    { long: 'valid_cap_parameter_value', short: 'vc', kind: 'num' },
    { long: 'valid_cap_parameter_value_both_hands', short: 'v2', kind: 'num' },
    { long: 'valid_start_parameter_value', short: 'vs', kind: 'num' },
    { long: 'attack_type', short: 'at', kind: 'num' },
    { long: 'reference_parameter', short: 'rf', kind: 'num' },
    { long: 'reference_parameter_2', short: 'r2', kind: 'num' },
    { long: 'damage_type', short: 'dt', kind: 'num' },
    { long: 'aptitude_ids', short: 'ap', kind: 'numArr' },
    { long: 'fixed_damage', short: 'fd', kind: 'num' },
    { long: 'hit_rate', short: 'hr', kind: 'num' },
    { long: 'damage_count', short: 'dc', kind: 'num' },
    { long: 'only_once', short: 'oo', kind: 'bool' },
    { long: 'target', short: 'tg', kind: 'num' },
];

/** 被引用的 sub effect 摘要（child_sub_effect_ids / extension_params 展开用） */
const SUB_BRIEF_LEAF: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'kind', short: 'k', kind: 'num' },
    { long: 'kind_name', short: 'kn', kind: 'str' },
    { long: 'params', short: 'p', kind: 'numArr' },
    { long: 'strength', short: 's', kind: 'num' },
    { long: 'turn', short: 't', kind: 'num' },
    { long: 'target', short: 'g', kind: 'num' },
    { long: 'target_text', short: 'gt', kind: 'str' },
    // 效果量（恢复量）：参照能力值 × 百分比 + 阈值窗口（同 build_mock.SUB_BRIEF_LEAF）
    { long: 'calc_reference_parameter', short: 'cp', kind: 'num' },
    { long: 'calc_reference_parameter_2', short: 'c2', kind: 'num' },
    { long: 'calc_reference_parameter_rate', short: 'cq', kind: 'num' },
    { long: 'calc_reference_parameter_rate_2', short: 'c3', kind: 'num' },
    { long: 'calc_valid_cap_parameter_value', short: 'cc', kind: 'num' },
    { long: 'calc_valid_start_parameter_value', short: 'cv', kind: 'num' },
];

const SUB_BRIEF: FieldSpec[] = [
    ...SUB_BRIEF_LEAF,
    { long: 'children', short: 'cs', kind: 'objArr', fields: SUB_BRIEF_LEAF },
];

/** kind 2790「敵のバフ数によってStepReplace」：step（敌人 buff 数量档）-> 实际效果组 */
const STEP_REPLACE: FieldSpec[] = [
    { long: 'step', short: 's', kind: 'num' },
    { long: 'effect_group', short: 'g', kind: 'num' },
    { long: 'effects', short: 'e', kind: 'objArr', fields: SUB_BRIEF_LEAF },
];

const SUB_EFFECT: FieldSpec[] = [
    { long: 'kind', short: 'k', kind: 'num' },
    { long: 'params', short: 'p', kind: 'numArr' },
    { long: 'strength', short: 's', kind: 'num' },
    { long: 'turn', short: 't', kind: 'num' },
    { long: 'target', short: 'g', kind: 'num' },
    { long: 'from', short: 'f', kind: 'str', map: { damage: 'd', effect_group: 'g', attack_start: 'a' } },
    { long: 'reference_parameter', short: 'rp', kind: 'num' },
    { long: 'reference_parameter_rate', short: 'rr', kind: 'num' },
    { long: 'abnormal_valid_start_parameter_value', short: 'as', kind: 'num' },
    { long: 'abnormal_valid_cap_parameter_value', short: 'ac', kind: 'num' },
    { long: 'force_apply', short: 'fa', kind: 'bool' },
    { long: 'is_ignore_resist', short: 'ir', kind: 'bool' },
    { long: 'calc_reference_parameter', short: 'cp', kind: 'num' },
    { long: 'calc_reference_parameter_2', short: 'c2', kind: 'num' },
    { long: 'calc_reference_parameter_rate', short: 'cq', kind: 'num' },
    { long: 'calc_reference_parameter_rate_2', short: 'c3', kind: 'num' },
    { long: 'calc_valid_cap_parameter_value', short: 'cc', kind: 'num' },
    { long: 'calc_valid_start_parameter_value', short: 'cv', kind: 'num' },
    { long: 'reference_resist', short: 'rs', kind: 'num' },
    { long: 'child_sub_effect_ids', short: 'ch', kind: 'numArr' },
    { long: 'target_race_ids', short: 'tr', kind: 'numArr' },
    { long: 'extension_params', short: 'xp', kind: 'numArr' },
    { long: 'child_sub_effects', short: 'cs', kind: 'objArr', fields: SUB_BRIEF },
    { long: 'extension_effects', short: 'xe', kind: 'objArr', fields: SUB_BRIEF },
    // 参数里指向的效果（参数序号 -> 摘要），前端按缩进行显示
    { long: 'param_refs', short: 'pr', kind: 'map', fields: SUB_BRIEF },
    // kind 2790：按敌人 buff 数量档替换的效果组
    { long: 'step_replace', short: 'sx', kind: 'objArr', fields: STEP_REPLACE },
];

const LEVEL: FieldSpec[] = [
    { long: 'level', short: 'l', kind: 'num' },
    { long: 'cost', short: 'c', kind: 'num' },
    { long: 'cost_kind', short: 'ck', kind: 'num' },
    { long: 'use_timing', short: 'ut', kind: 'num' },
    { long: 'use_limit', short: 'ul', kind: 'num' },
    { long: 'hate', short: 'ht', kind: 'num' },
    { long: 'range_type', short: 'rt', kind: 'num' },
    { long: 'skill_condition_ids', short: 'cd', kind: 'numArr' },
    { long: 'description', short: 'd', kind: 'str' },
    { long: 'description_lang', short: 'dl', kind: 'str' },
    // 该等级自己的名字（多级技能名字不同时才有，如「隙ダメージ上書き90%」）
    { long: 'name', short: 'nm', kind: 'str' },
    { long: 'name_lang', short: 'nl', kind: 'str' },
    { long: 'damage', short: 'dm', kind: 'objArr', fields: DAMAGE },
    { long: 'sub_effects', short: 'sb', kind: 'objArr', fields: SUB_EFFECT },
];

export const CHAR_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    { long: 'group', short: 'g', kind: 'num' },
    { long: 'guide_no', short: 'n', kind: 'num' },
    { long: 'name', short: 'zh', kind: 'str' },
    { long: 'name_jp', short: 'jp', kind: 'str' },
    { long: 'name_en', short: 'en', kind: 'str' },
    { long: 'style', short: 'sty', kind: 'str' },
    { long: 'default', short: 'd', kind: 'bool' },
    // 觉醒版：不进列表，只供角色 modal 的版本切换
    { long: 'hidden', short: 'hd', kind: 'bool' },
    { long: 'rarity', short: 'r', kind: 'num' },
    { long: 'race', short: 'ra', kind: 'num' },
    { long: 'attribute', short: 'at', kind: 'num' },
    { long: 'gender', short: 'ge', kind: 'num' },
    { long: 'personality', short: 'pe', kind: 'num' },
    { long: 'grade', short: 'gr', kind: 'num' },
    { long: 'alignment', short: 'al', kind: 'num' },
    { long: 'align_point', short: 'ap', kind: 'num' },
    {
        long: 'jobs',
        short: 'jo',
        kind: 'objArr',
        fields: [
            { long: 'id', short: 'i', kind: 'num' },
            { long: 'primary', short: 'p', kind: 'bool' },
        ],
    },
    { long: 'fate', short: 'fa', kind: 'num' },
    {
        long: 'stats',
        short: 'st',
        kind: 'obj',
        fields: [
            { long: 'base', short: 'b', kind: 'numMap' },
            { long: 'growth', short: 'g', kind: 'numMap' },
            {
                long: 'pools',
                short: 'p',
                kind: 'map',
                fields: [
                    { long: 'base', short: 'b', kind: 'num' },
                    { long: 'growth', short: 'g', kind: 'num' },
                ],
            },
            { long: 'growth_rate', short: 'r', kind: 'objArr', fields: STAT_FIELDS },
        ],
    },
    {
        long: 'talent',
        short: 'ta',
        kind: 'obj',
        fields: [
            { long: 'id', short: 'i', kind: 'num' },
            { long: 'min', short: 'lo', kind: 'numMap' },
            { long: 'max', short: 'hi', kind: 'numMap' },
        ],
    },
    { long: 'mental', short: 'me', kind: 'num' },
    {
        long: 'skills',
        short: 'sk',
        kind: 'obj',
        fields: [
            { long: 'unique', short: 'u', kind: 'numArr' },
            { long: 'inherit', short: 'ih', kind: 'numArr' },
            { long: 'potential', short: 'pt', kind: 'numArr' },
            { long: 'discipline', short: 'dc', kind: 'objArr', fields: DISCIPLINE },
            { long: 'same', short: 'sm', kind: 'numArr' },
            { long: 'exclude', short: 'ex', kind: 'numArr' },
            { long: 'get_lv', short: 'gl', kind: 'num' },
        ],
    },
    { long: 'potential_grade', short: 'pg', kind: 'num' },
    {
        long: 'images',
        short: 'im',
        kind: 'obj',
        fields: [
            { long: 'image', short: 'i', kind: 'str' },
            { long: 'fate_image', short: 'fi', kind: 'str' },
            { long: 'fate_chara', short: 'fc', kind: 'str' },
            { long: 'fate_face', short: 'ff', kind: 'str' },
            { long: 'gacha_item_banner', short: 'gb', kind: 'str' },
            { long: 'legend_character_sale', short: 'gd', kind: 'str' },
            { long: 'thumbnail', short: 't', kind: 'str' },
            { long: 'thumbnail_file', short: 'tf', kind: 'str' },
            { long: 'thumbnail_dir', short: 'td', kind: 'str' },
        ],
    },
    {
        long: 'voice',
        short: 'vo',
        kind: 'obj',
        fields: [
            { long: 'speech', short: 's', kind: 'str' },
            { long: 'speech_lang', short: 'sl', kind: 'str' },
            { long: 'breakup', short: 'b', kind: 'str' },
            { long: 'breakup_lang', short: 'bl', kind: 'str' },
            { long: 'group', short: 'g', kind: 'num' },
        ],
    },
    {
        long: 'self_restraint',
        short: 'sr',
        kind: 'obj',
        fields: [
            { long: 'id', short: 'i', kind: 'num' },
            { long: 'extra_tags', short: 't', kind: 'strArr' },
        ],
    },
    // 营地 / 酒馆对话：同一角色的各风格版本共用一份（酒馆只留议题 + 答案顺序 1..3）
    {
        long: 'dialogue',
        short: 'dg',
        kind: 'obj',
        fields: [
            {
                long: 'camp',
                short: 'c',
                kind: 'objArr',
                fields: [
                    { long: 'question', short: 'q', kind: 'str' },
                    { long: 'answer', short: 'a', kind: 'str' },
                ],
            },
            {
                long: 'tavern',
                short: 't',
                kind: 'objArr',
                fields: [
                    { long: 'topic', short: 'k', kind: 'str' },
                    { long: 'order', short: 'o', kind: 'num' },
                ],
            },
        ],
    },
];

export const JOB_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    { long: 'name', short: 'zh', kind: 'str' },
    { long: 'name_jp', short: 'jp', kind: 'str' },
    { long: 'name_en', short: 'en', kind: 'str' },
    { long: 'abbreviation', short: 'ab', kind: 'str' },
    { long: 'display_order', short: 'o', kind: 'num' },
    { long: 'category', short: 'c', kind: 'str' },
    { long: 'alignment', short: 'al', kind: 'numArr' },
    { long: 'base', short: 'b', kind: 'numMap' },
    { long: 'growth', short: 'g', kind: 'numMap' },
    { long: 'multipliers', short: 'm', kind: 'numMap' },
    { long: 'skills', short: 'sk', kind: 'objArr', fields: JOB_REF },
    { long: 'skill_variants', short: 'sv', kind: 'objArrMap', fields: JOB_REF },
    { long: 'skill_count', short: 'sc', kind: 'num' },
    {
        long: 'characters',
        short: 'ch',
        kind: 'obj',
        fields: [
            { long: 'primary', short: 'pr', kind: 'numArr' },
            { long: 'changeable', short: 'cd', kind: 'numArr' },
        ],
    },
    {
        long: 'change_items',
        short: 'ci',
        kind: 'objArr',
        fields: [
            { long: 'item', short: 'i', kind: 'num' },
            { long: 'quantity', short: 'q', kind: 'num' },
            { long: 'group', short: 'g', kind: 'num' },
        ],
    },
];

export const SKILL_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    { long: 'name', short: 'zh', kind: 'str' },
    { long: 'name_jp', short: 'jp', kind: 'str' },
    { long: 'name_en', short: 'en', kind: 'str' },
    { long: 'kind', short: 'k', kind: 'num' },
    { long: 'max_level', short: 'ml', kind: 'num' },
    { long: 'passive', short: 'p', kind: 'bool' },
    { long: 'player', short: 'pl', kind: 'bool' },
    { long: 'test', short: 't', kind: 'bool' },
    { long: 'level0', short: 'l0', kind: 'bool' },
    { long: 'sources', short: 's', kind: 'strArr' },
    { long: 'jobs', short: 'j', kind: 'numArr' },
    // 召唤：被召唤敌人的分类 + 等级 + 数量（EnemyFriendLayout）
    {
        long: 'summons',
        short: 'sm',
        kind: 'objArr',
        fields: [
            { long: 'category', short: 'c', kind: 'num' },
            { long: 'level', short: 'lv', kind: 'num' },
            { long: 'count', short: 'n', kind: 'num' },
        ],
    },
    { long: 'description', short: 'd', kind: 'str' },
    { long: 'detail_description', short: 'd2', kind: 'str' },
    { long: 'description_lang', short: 'dl', kind: 'str' },
    { long: 'job_limited', short: 'jl', kind: 'numArr' },
    { long: 'equipment_limited', short: 'el', kind: 'numArr' },
    { long: 'tags', short: 'tg', kind: 'numArr' },
    { long: 'learn', short: 'ln', kind: 'objArr', fields: LEARN },
    { long: 'levels', short: 'lv', kind: 'objArr', fields: LEVEL },
];

/** 装备特性：技能 identification + 引用等级（名字与说明由前端查技能数据） */
const EQUIP_REF: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'level', short: 'l', kind: 'num' },
    // 展示型 lock config 特性才带名字与手写说明
    { long: 'name', short: 'zh', kind: 'str' },
    { long: 'desc', short: 'd', kind: 'str' },
];

/** 装备数值：atk 攻击 / c 攻击次数 / mag 魔力 / div 神力 / def 防御 / mdef 魔防 /
 *  spe 速度 / acc 命中 / sur 会心 / eva 回避 / res 抵抗 */
const EQUIP_STAT: FieldSpec[] = [
    { long: 'atk', short: 'at', kind: 'num' },
    { long: 'c', short: 'c', kind: 'num' },
    { long: 'mag', short: 'mg', kind: 'num' },
    { long: 'div', short: 'dv', kind: 'num' },
    { long: 'def', short: 'df', kind: 'num' },
    { long: 'mdef', short: 'md', kind: 'num' },
    { long: 'spe', short: 'sp', kind: 'num' },
    { long: 'acc', short: 'ac', kind: 'num' },
    { long: 'sur', short: 'sr', kind: 'num' },
    { long: 'eva', short: 'ev', kind: 'num' },
    { long: 'res', short: 'rs', kind: 'num' },
    // 探索系（装备自身属性，也随强化成长）：探知 / 陷阱解除 / 陷阱回避
    { long: 'det', short: 'dt', kind: 'num' },
    { long: 'dtrap', short: 'dp', kind: 'num' },
    { long: 'etrap', short: 'et', kind: 'num' },
];

/** 强化曲线的一行：等级 + 该等级的完整数值（只输出与 +0 不同的等级） */
const EQUIP_LEVEL: FieldSpec[] = [{ long: 'lv', short: 'l', kind: 'num' }, ...EQUIP_STAT];

/** 材质补强的一行：目标阶级 / 阶级内次数 / 金币 / 五项累计加成 */
const EQUIP_OVER_RANK: FieldSpec[] = [
    { long: 'rank', short: 'r', kind: 'num' },
    { long: 'level', short: 'l', kind: 'num' },
    { long: 'cost', short: 'co', kind: 'num' },
    { long: 'atk', short: 'at', kind: 'num' },
    { long: 'mag', short: 'mg', kind: 'num' },
    { long: 'div', short: 'dv', kind: 'num' },
    { long: 'def', short: 'df', kind: 'num' },
    { long: 'mdef', short: 'md', kind: 'num' },
];

const EQUIP_SET: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'skill_id', short: 'si', kind: 'num' },
    { long: 'skill_name', short: 'sn', kind: 'str' },
    { long: 'require_count', short: 'rc', kind: 'num' },
    { long: 'max_level', short: 'ml', kind: 'num' },
    { long: 'add_skill_level', short: 'al', kind: 'num' },
];

/** 商店来源（来自 shop.py 清洗后的店铺，不含限时商店） */
const EQUIP_SHOP: FieldSpec[] = [
    { long: 'shop_name', short: 'sn', kind: 'str' },
    { long: 'price', short: 'p', kind: 'num' },
    { long: 'currency_name', short: 'cn', kind: 'str' },
];

export const EQUIP_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    { long: 'name', short: 'zh', kind: 'str' },
    { long: 'name_jp', short: 'jp', kind: 'str' },
    { long: 'name_en', short: 'en', kind: 'str' },
    { long: 'category', short: 'c', kind: 'str' },
    { long: 'type_id', short: 'ti', kind: 'num' },
    { long: 'type', short: 'ty', kind: 'str' },
    { long: 'part', short: 'pt', kind: 'num' },
    { long: 'rank', short: 'r', kind: 'num' },
    // 图鉴编号（数字；特殊装备为 "EX"）
    { long: 'collection_id', short: 'ci', kind: 'raw' },
    { long: 'element', short: 'el', kind: 'num' },
    { long: 'element_name', short: 'eln', kind: 'str' },
    { long: 'special', short: 'sp', kind: 'bool' },
    { long: 'note', short: 'nt', kind: 'str' },
    // 图标资源名：list_icon = 列表小图，icon = 背包大图（均不含 .png）
    { long: 'list_icon', short: 'li', kind: 'str' },
    { long: 'icon', short: 'ic', kind: 'str' },
    // 特典分类 / 获取途径已搬到 ``Api/GetV2Extra.equipmentExtra``（运行时按 id 合并）；
    // 旧数据页还带着这两列时仍按短键读出来当兜底。desc 中文说明 / 需求仍是占位。
    { long: 'soucate', short: 'so', kind: 'num' },
    { long: 'desc', short: 'd', kind: 'str' },
    { long: 'sou', short: 'su', kind: 'strArr' },
    { long: 'req', short: 'rq', kind: 'strArr' },
    { long: 'fa_can', short: 'fc', kind: 'num' },
    { long: 'fa_sk', short: 'fs', kind: 'str' },
    // 妖精技能描述
    { long: 'fa_sk_desc', short: 'fd', kind: 'str' },
    // 装备条件：职业限制（Job.id）/ 种族限制（CharacterSpecies.id），空 = 无限制
    { long: 'job_limited', short: 'jl', kind: 'numArr' },
    { long: 'race_limited', short: 'rl', kind: 'numArr' },
    { long: 'reinforce_max', short: 'rm', kind: 'num' },
    { long: 'stats', short: 'st', kind: 'obj', fields: EQUIP_STAT },
    { long: 'max_stats', short: 'mx', kind: 'obj', fields: EQUIP_STAT },
    { long: 'skills', short: 'sk', kind: 'objArr', fields: EQUIP_REF },
    { long: 'traits', short: 'tr', kind: 'objArr', fields: EQUIP_REF },
    { long: 'set_skills', short: 'ss', kind: 'objArr', fields: EQUIP_SET },
    // 强化曲线（每级完整数值，只输出与 +0 不同的等级）与加护概率（4 槽 × 19 属性）
    { long: 'levels', short: 'lv', kind: 'objArr', fields: EQUIP_LEVEL },
    { long: 'bonus', short: 'bn', kind: 'numArrArr' },
    // 材质补强（低于最高阶级时可继续提升；空数组 = 已是最上位阶级）
    { long: 'over_rank', short: 'or', kind: 'objArr', fields: EQUIP_OVER_RANK },
    // 商店来源（空数组 = 商店买不到）
    { long: 'shop', short: 'sh', kind: 'objArr', fields: EQUIP_SHOP },
];

/** 敌人数值块：base / growth / correction（修正率，100 = 原值）+ HP 浮动上下限 */
const ENEMY_STAT: FieldSpec[] = [
    { long: 'base', short: 'b', kind: 'num' },
    { long: 'growth', short: 'g', kind: 'num' },
    { long: 'correction', short: 'cr', kind: 'num' },
    { long: 'min', short: 'lo', kind: 'num' },
    { long: 'max', short: 'hi', kind: 'num' },
];

/** 冻结 / 破冰：半冻结 / 完全冻结 / 破冰层数 + 自然回复 + 待机浮动 */
const ENEMY_FREEZE: FieldSpec[] = [
    { long: 'half', short: 'h', kind: 'num' },
    { long: 'full', short: 'f', kind: 'num' },
    { long: 'break', short: 'b', kind: 'num' },
    { long: 'recovery', short: 'r', kind: 'num' },
    { long: 'wait_min', short: 'wm', kind: 'num' },
    { long: 'wait_max', short: 'wx', kind: 'num' },
    { long: 'intelligence', short: 'iq', kind: 'num' },
];

/** 体型统计：同一分类下可能出现多种 body_size */
const ENEMY_BODY: FieldSpec[] = [
    { long: 'size', short: 's', kind: 'numArr' },
    { long: 'count', short: 'c', kind: 'num' },
];

/** AI 技能池里的一行：技能 + 随机权重 + 选目标的条件文案 */
const ENEMY_AI_SKILL: FieldSpec[] = [
    { long: 'skill', short: 's', kind: 'num' },
    { long: 'weight', short: 'w', kind: 'num' },
    { long: 'target', short: 't', kind: 'str' },
];

/** 一条条件：整段文案，或「前缀 + 敌人分类 id / 子效果种类 id + 后缀」 */
const ENEMY_AI_CONDITION: FieldSpec[] = [
    { long: 'text', short: 't', kind: 'str' },
    { long: 'label', short: 'l', kind: 'str' },
    { long: 'ref', short: 'r', kind: 'num' },
    { long: 'status', short: 'k', kind: 'num' },
    { long: 'suffix', short: 'x', kind: 'str' },
];

/** AI 行动规则的一行 = 一条「条件成立 → 用这个技能池」 */
const ENEMY_AI_RULE: FieldSpec[] = [
    { long: 'priority', short: 'p', kind: 'num' },
    { long: 'conditions', short: 'c', kind: 'objArr', fields: ENEMY_AI_CONDITION },
    { long: 'skills', short: 's', kind: 'objArr', fields: ENEMY_AI_SKILL },
];

/** 一个出现变体：参数 id + 等级区间 + 技能 + 该变体的完整数值 */
const ENEMY_VARIANT: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    { long: 'kind', short: 'k', kind: 'num' },
    { long: 'param', short: 'p', kind: 'raw' },
    { long: 'exp', short: 'e', kind: 'num' },
    { long: 'ai', short: 'ai', kind: 'num' },
    { long: 'level', short: 'lv', kind: 'numArr' },
    { long: 'attribute', short: 'at', kind: 'numArr' },
    { long: 'attack_attribute', short: 'aa', kind: 'numArr' },
    { long: 'weak', short: 'wk', kind: 'numArr' },
    { long: 'characteristics', short: 'ch', kind: 'numArr' },
    { long: 'gimmicks', short: 'gm', kind: 'numArr' },
    { long: 'fly', short: 'f', kind: 'bool' },
    { long: 'body_size', short: 'bs', kind: 'numArr' },
    // 全部技能（行动 + 插入 + 被动 + 挣扎）与分栏明细
    { long: 'skills', short: 'sk', kind: 'numArr' },
    // 引用到的技能等级（identification -> level），只有多级技能的非 0 等级才记
    { long: 'skill_levels', short: 'sl', kind: 'numMap' },
    { long: 'action_skills', short: 'ak', kind: 'numArr' },
    // 插入技能：一次标记 + HP 触发阈值 + 触发条件文案
    {
        long: 'interrupts',
        short: 'ir',
        kind: 'objArr',
        fields: [
            { long: 'skill', short: 's', kind: 'num' },
            { long: 'once', short: 'o', kind: 'bool' },
            { long: 'hp', short: 'hp', kind: 'num' },
            { long: 'conditions', short: 'c', kind: 'objArr', fields: ENEMY_AI_CONDITION },
        ],
    },
    { long: 'passive_skills', short: 'pk', kind: 'numArr' },
    { long: 'struggle_skill', short: 'sg', kind: 'num' },
    // AI 行动规则：priority 升序，条件成立就用该技能池
    { long: 'ai_plan', short: 'ap', kind: 'objArr', fields: ENEMY_AI_RULE },
    // 键是属性名（hp / attack / …），值是 {b, g, cr, lo, hi}
    { long: 'stats', short: 'st', kind: 'map', fields: ENEMY_STAT },
    { long: 'resist', short: 'rs', kind: 'numMap' },
    { long: 'freeze', short: 'fz', kind: 'obj', fields: ENEMY_FREEZE },
];

/** 一条 = 一个 EnemyCategory（图鉴条目 + 只在解包数据里存在的分类） */
export const ENEMY_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    // 图鉴编号 / 图鉴条目 id；没有图鉴记录的分类为空
    { long: 'no', short: 'n', kind: 'num' },
    { long: 'book', short: 'bk', kind: 'raw' },
    { long: 'name', short: 'zh', kind: 'str' },
    { long: 'name_jp', short: 'jp', kind: 'str' },
    { long: 'name_en', short: 'en', kind: 'str' },
    // wiki 上的缩略图去掉 `_s.png` 后缀，例如 tmb_enemy_090_005_00
    { long: 'thumbnail', short: 'th', kind: 'str' },
    { long: 'boss', short: 'b', kind: 'bool' },
    { long: 'race', short: 'ra', kind: 'num' },
    { long: 'lineage', short: 'li', kind: 'num' },
    // 体型档位（1 小 / 2 中 / 3 大 / 4 特大）
    { long: 'size', short: 'sz', kind: 'num' },
    { long: 'attack_type', short: 'at', kind: 'num' },
    { long: 'damage_type', short: 'dt', kind: 'num' },
    { long: 'attribute', short: 'ar', kind: 'numArr' },
    { long: 'attack_attribute', short: 'aa', kind: 'numArr' },
    { long: 'weak', short: 'wk', kind: 'numArr' },
    { long: 'characteristics', short: 'ch', kind: 'numArr' },
    { long: 'gimmicks', short: 'gm', kind: 'numArr' },
    // 出现的强度档位（kind）
    { long: 'kinds', short: 'ks', kind: 'numArr' },
    {
        long: 'level',
        short: 'lv',
        kind: 'obj',
        fields: [
            { long: 'min', short: 'lo', kind: 'num' },
            { long: 'max', short: 'hi', kind: 'num' },
        ],
    },
    { long: 'fly', short: 'f', kind: 'bool' },
    { long: 'body_size', short: 'bs', kind: 'objArr', fields: ENEMY_BODY },
    { long: 'resist', short: 'rs', kind: 'numMap' },
    { long: 'freeze', short: 'fz', kind: 'obj', fields: ENEMY_FREEZE },
    { long: 'skills', short: 'sk', kind: 'numArr' },
    { long: 'variants', short: 'v', kind: 'objArr', fields: ENEMY_VARIANT },
];

// ---------- 地图（层为单位） / 敌群 ----------

/** 层里出现过的敌人：只留 id 与等级范围，名称 / 属性由敌人模块提供 */
const MAP_ENEMY: FieldSpec[] = [
    { long: 'enemy_id', short: 'i', kind: 'num' },
    { long: 'lv_min', short: 'lo', kind: 'num' },
    { long: 'lv_max', short: 'hi', kind: 'num' },
    { long: 'rows', short: 'r', kind: 'num' },
];

const MAP_MEMBER: FieldSpec[] = [
    { long: 'enemy_id', short: 'i', kind: 'num' },
    { long: 'lv_min', short: 'lo', kind: 'num' },
    { long: 'lv_max', short: 'hi', kind: 'num' },
    { long: 'pos_x', short: 'px', kind: 'num' },
    { long: 'pos_y', short: 'py', kind: 'num' },
    { long: 'notorious', short: 'no', kind: 'bool' },
    { long: 'wanted', short: 'wa', kind: 'bool' },
    { long: 'hate', short: 'ha', kind: 'bool' },
];

const MAP_FORMATION: FieldSpec[] = [
    { long: 'formation_id', short: 'i', kind: 'num' },
    { long: 'row_id', short: 'r', kind: 'num' },
    { long: 'layout_id', short: 'l', kind: 'num' },
    { long: 'weight', short: 'w', kind: 'num' },
    { long: 'lv_min', short: 'lo', kind: 'num' },
    { long: 'lv_max', short: 'hi', kind: 'num' },
    { long: 'escape', short: 'e', kind: 'num' },
    { long: 'surprise', short: 's', kind: 'num' },
    { long: 'preemption', short: 'p', kind: 'num' },
    { long: 'exp_rate', short: 'x', kind: 'num' },
    { long: 'drop_id', short: 'd', kind: 'num' },
    { long: 'special_drop_id', short: 'sd', kind: 'num' },
    { long: 'drop_probability', short: 'dp', kind: 'num' },
    { long: 'trap_id', short: 't', kind: 'num' },
    { long: 'rare_trap_id', short: 'rt', kind: 'num' },
    { long: 'condition_id', short: 'c', kind: 'num' },
    { long: 'respawn_kind', short: 'rk', kind: 'num' },
    { long: 'symbol_id', short: 'si', kind: 'num' },
    { long: 'symbol_kind', short: 'sk', kind: 'num' },
    { long: 'grade_id', short: 'g', kind: 'num' },
    { long: 'friend_prob', short: 'fp', kind: 'num' },
    { long: 'covert', short: 'cv', kind: 'num' },
    { long: 'win_condition', short: 'wc', kind: 'num' },
    { long: 'members', short: 'm', kind: 'objArr', fields: MAP_MEMBER },
];

/** 一条 = 一层（``DungeonFloor``）；分类标签在 ``Api/GetV2Map`` 顶层 ``maps`` */
export const MAP_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    { long: 'name', short: 'n', kind: 'str' },
    { long: 'map_id', short: 'mi', kind: 'num' },
    { long: 'map_name', short: 'mn', kind: 'str' },
    { long: 'area_id', short: 'a', kind: 'num' },
    { long: 'scene_name', short: 'sc', kind: 'str' },
    { long: 'ceiling', short: 'c', kind: 'bool' },
    { long: 'floor_attribute', short: 'fa', kind: 'num' },
    { long: 'enemy_placement', short: 'ep', kind: 'numArr' },
    { long: 'bgm', short: 'bg', kind: 'str' },
    { long: 'normal_enemies', short: 'ne', kind: 'objArr', fields: MAP_ENEMY },
    { long: 'notorious_enemies', short: 'sn', kind: 'objArr', fields: MAP_ENEMY },
    { long: 'formations', short: 'f', kind: 'objArr', fields: MAP_FORMATION },
];

/** 敌群能确定关联上的层 */
const POOL_FLOOR: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'name', short: 'n', kind: 'str' },
    { long: 'map_name', short: 'mn', kind: 'str' },
];

/** 一条 = 一个敌群（敌群页；含能确定关联的层，不做推断） */
export const ENEMY_POOL_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'row_count', short: 'rc', kind: 'num' },
    { long: 'lv_ranges', short: 'lr', kind: 'numArrArr' },
    { long: 'normal_enemies', short: 'ne', kind: 'objArr', fields: MAP_ENEMY },
    { long: 'notorious_enemies', short: 'sn', kind: 'objArr', fields: MAP_ENEMY },
    { long: 'floors', short: 'fl', kind: 'objArr', fields: POOL_FLOOR },
    { long: 'formations', short: 'f', kind: 'objArr', fields: MAP_FORMATION },
];

const ITEM_SHOP: FieldSpec[] = [
    // 商店名与点数名由 shop.py 清洗后写进道具数据，前端不再反查商店模块
    { long: 'shop_name', short: 'sn', kind: 'str' },
    { long: 'shop_kind', short: 'k', kind: 'num' },
    { long: 'price', short: 'p', kind: 'num' },
    { long: 'currency', short: 'cu', kind: 'num' },
    { long: 'currency_name', short: 'cn', kind: 'str' },
    { long: 'quantity', short: 'q', kind: 'num' },
    { long: 'limit_kind', short: 'lk', kind: 'num' },
    { long: 'limit_num', short: 'ln', kind: 'num' },
    { long: 'repeat', short: 'rp', kind: 'bool' },
    { long: 'condition', short: 'cd', kind: 'num' },
    { long: 'town', short: 't', kind: 'num' },
    { long: 'point_shop_id', short: 'ps', kind: 'num' },
];

const ITEM_FISHING: FieldSpec[] = [
    { long: 'volume', short: 'vo', kind: 'num' },
    { long: 'duration', short: 'du', kind: 'num' },
    { long: 'min_meet', short: 'mn', kind: 'num' },
    { long: 'max_meet', short: 'mx', kind: 'num' },
    { long: 'min_success', short: 'ms', kind: 'num' },
    { long: 'max_success', short: 'xs', kind: 'num' },
];

const ITEM_RELIC: FieldSpec[] = [
    { long: 'grade', short: 'g', kind: 'num' },
    { long: 'rank', short: 'r', kind: 'num' },
    { long: 'alignment', short: 'al', kind: 'num' },
    { long: 'skill_id', short: 'si', kind: 'num' },
];

const ITEM_SKILL: FieldSpec[] = [
    { long: 'kind', short: 'kd', kind: 'str' },
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'name', short: 'n', kind: 'str' },
];

/** 图鉴条目引用：条目 id + 编号，说明 / 售价归图鉴模块 */
const ITEM_COLLECTION: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'no', short: 'n', kind: 'num' },
];

export const ITEM_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    { long: 'name', short: 'zh', kind: 'str' },
    { long: 'name_jp', short: 'jp', kind: 'str' },
    { long: 'name_en', short: 'en', kind: 'str' },
    { long: 'type', short: 'ty', kind: 'str' },
    { long: 'category', short: 'c', kind: 'str' },
    { long: 'desc', short: 'd', kind: 'str' },
    { long: 'desc_lang', short: 'dl', kind: 'str' },
    { long: 'icon', short: 'ic', kind: 'str' },
    { long: 'list_icon', short: 'li', kind: 'str' },
    // 卖价（商店买价见 shop）
    { long: 'value', short: 'v', kind: 'num' },
    { long: 'sort_id', short: 'so', kind: 'num' },
    { long: 'use_skill', short: 'sk', kind: 'obj', fields: ITEM_SKILL },
    { long: 'shop', short: 'sh', kind: 'objArr', fields: ITEM_SHOP },
    { long: 'fishing', short: 'fi', kind: 'obj', fields: ITEM_FISHING },
    { long: 'relic', short: 're', kind: 'obj', fields: ITEM_RELIC },
    // 图鉴：出售 / 消耗品 / 贵重品 / 其他（只有进图鉴的道具有值）
    { long: 'collection_group', short: 'cg', kind: 'str' },
    { long: 'collection', short: 'col', kind: 'obj', fields: ITEM_COLLECTION },
    // 杂物二级分类：角色抽卡 / 装备抽卡 / 未分类（只有 Item::Junk 有值）
    { long: 'junk_group', short: 'jg', kind: 'str' },
];

/** 遗物掉落怪物（id = 怪物图鉴编号 `EnemyCategory.no`，名字由敌人表补） */
const RELIC_MONSTER: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'num' },
    { long: 'name', short: 'n', kind: 'str' },
];

/**
 * ``Api/GetV2Extra.equipmentExtra``：一条 = 装备 id + 特典分类 + 获取途径（长键）。
 * 以前是并进每件装备条目的 ``so`` / ``su``，现在单独一块、按 id 对回装备。
 */
export const EQUIPMENT_EXTRA_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'id', kind: 'raw' },
    { long: 'soucate', short: 'soucate', kind: 'num' },
    { long: 'sou', short: 'sou', kind: 'strArr' },
];

/**
 * ``Api/GetV2Item`` 顶层 ``relics_extra``：一条 = 遗物图鉴编号 + 掉落怪物编号 + 推荐类别。
 * ``id`` 是遗物的物品图鉴编号（道具数据 ``collection.no``，即 ``CollectionItem.list_number``），
 * 遗物行本身没有这个值，前端按 ``relics.id`` 查道具表再对回来。
 * 这份数据是长键（``id`` / ``monster_id`` / ``c``），只有类别用了短键。
 */
export const RELIC_EXTRA_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'id', kind: 'raw' },
    { long: 'monster_id', short: 'monster_id', kind: 'numArr' },
    { long: 'categories', short: 'c', kind: 'strArr' },
];

/** 遗物：一种遗物一条（同组取最低阶级）；掉落怪物 / 推荐类别来自顶层 ``relics_extra`` */
export const RELIC_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    { long: 'name', short: 'zh', kind: 'str' },
    // 遗物酒名
    { long: 'brew', short: 'b', kind: 'str' },
    // 遗物之力（技能名）与技能 identification
    { long: 'power', short: 'p', kind: 'str' },
    { long: 'skill_id', short: 'sk', kind: 'num' },
    // 性格：善 / 中立 / 恶
    { long: 'align', short: 'a', kind: 'str' },
    { long: 'grade', short: 'g', kind: 'num' },
    { long: 'icon', short: 'ic', kind: 'str' },
    // 提升 / 降低属性
    { long: 'inc', short: 'u', kind: 'strArr' },
    { long: 'dec', short: 'd', kind: 'strArr' },
    { long: 'monsters', short: 'm', kind: 'objArr', fields: RELIC_MONSTER },
    { long: 'categories', short: 'c', kind: 'strArr' },
];

const SHOP_ITEM: FieldSpec[] = [
    { long: 'shop_id', short: 'si', kind: 'num' },
    { long: 'name', short: 'n', kind: 'str' },
    { long: 'content_type', short: 'ct', kind: 'str' },
    { long: 'content_id', short: 'ci', kind: 'num' },
    { long: 'content_ident', short: 'ce', kind: 'num' },
    { long: 'icon', short: 'ic', kind: 'str' },
    { long: 'price', short: 'p', kind: 'num' },
    { long: 'currency', short: 'cu', kind: 'num' },
    { long: 'currency_name', short: 'cn', kind: 'str' },
    { long: 'quantity', short: 'q', kind: 'num' },
    { long: 'limit_kind', short: 'lk', kind: 'num' },
    { long: 'limit_num', short: 'ln', kind: 'num' },
    { long: 'repeat', short: 'rp', kind: 'bool' },
    { long: 'condition', short: 'cd', kind: 'num' },
];

export const SHOP_FIELDS: FieldSpec[] = [
    { long: 'id', short: 'i', kind: 'raw' },
    { long: 'key', short: 'k', kind: 'str' },
    { long: 'group', short: 'gp', kind: 'num' },
    { long: 'group_name', short: 'gn', kind: 'str' },
    { long: 'kind', short: 'kd', kind: 'num' },
    { long: 'kind_name', short: 'kn', kind: 'str' },
    { long: 'town', short: 't', kind: 'num' },
    { long: 'town_name', short: 'tn', kind: 'str' },
    { long: 'point_shop_id', short: 'ps', kind: 'num' },
    { long: 'point_shop_name', short: 'pn', kind: 'str' },
    { long: 'point_id', short: 'pi', kind: 'num' },
    { long: 'point_name', short: 'pt', kind: 'str' },
    { long: 'start_at', short: 'sa', kind: 'num' },
    { long: 'end_at', short: 'ea', kind: 'num' },
    { long: 'name', short: 'zh', kind: 'str' },
    { long: 'count', short: 'c', kind: 'num' },
    { long: 'items', short: 'it', kind: 'objArr', fields: SHOP_ITEM },
];

const reverseCache = new WeakMap<FieldSpec, Record<string, string>>();

const reverseMap = (spec: FieldSpec) => {
    if (!spec.map) return {};
    let cached = reverseCache.get(spec);
    if (!cached) {
        cached = Object.fromEntries(Object.entries(spec.map).map(([long, short]) => [short, long]));
        reverseCache.set(spec, cached);
    }
    return cached;
};

/**
 * 线上 Lua 模块序列化 table 时，「从 1 开始的连续整数 key」会被当成数组
 * （``{1:"a",2:"b"}`` → ``["a","b"]``），前端 ``Object.entries`` 拿到的 key 就变成
 * 0 起。这里把这种「0,1,2…」的连续数字键还原成 1 起；其余形态原样返回。
 */
export const restoreNumericKeys = <T>(entries: Array<[string, T]>): Array<[string, T]> => {
    if (entries.length === 0) return entries;
    if (!entries.every(([key]) => /^\d+$/.test(key))) return entries;
    const zeroBased = entries.every(([key], index) => Number(key) === index);
    if (!zeroBased) return entries;
    return entries.map(([, value], index) => [String(index + 1), value] as [string, T]);
};

/** short-key document -> long-key document */
export function decodeDoc<T = Doc>(src: Doc | null | undefined, fields: FieldSpec[]): T {
    const out: Doc = {};
    if (!src) return out as T;

    for (const spec of fields) {
        const raw = src[spec.short];

        switch (spec.kind) {
            case 'num':
                out[spec.long] = typeof raw === 'number' ? raw : 0;
                break;
            case 'raw':
                if (raw !== undefined) out[spec.long] = raw;
                break;
            case 'str': {
                const value = typeof raw === 'string' ? raw : '';
                out[spec.long] = spec.map ? (reverseMap(spec)[value] ?? value) : value;
                break;
            }
            case 'bool':
                out[spec.long] = raw === 1 || raw === true;
                break;
            case 'numArr':
            case 'strArr':
                out[spec.long] = Array.isArray(raw) ? raw : [];
                break;
            // 二维数字数组（加护概率 4 槽 × 19 属性），0 有含义，原样保留
            case 'numArrArr':
                out[spec.long] = Array.isArray(raw)
                    ? (raw as unknown[][]).map((row) => (Array.isArray(row) ? [...row] : []))
                    : [];
                break;
            case 'numMap':
                out[spec.long] =
                    raw && typeof raw === 'object'
                        ? Object.fromEntries(restoreNumericKeys(Object.entries(raw as Doc)))
                        : {};
                break;
            case 'obj':
                out[spec.long] = decodeDoc(raw as Doc, spec.fields ?? []);
                break;
            case 'map': {
                const nested: Doc = {};
                for (const [key, value] of restoreNumericKeys(Object.entries((raw as Doc) ?? {}))) {
                    nested[key] = decodeDoc(value as Doc, spec.fields ?? []);
                }
                out[spec.long] = nested;
                break;
            }
            case 'objArr':
                out[spec.long] = ((raw as Doc[]) ?? []).map((item) => decodeDoc(item, spec.fields ?? []));
                break;
            case 'objArrMap': {
                const nested: Doc = {};
                const rows = (raw as Record<string, Doc[]>) ?? {};
                for (const [key, value] of restoreNumericKeys(Object.entries(rows))) {
                    nested[key] = ((value as Doc[]) ?? []).map((item) => decodeDoc(item, spec.fields ?? []));
                }
                out[spec.long] = nested;
                break;
            }
        }
    }

    return out as T;
}
