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
];

const SUB_BRIEF: FieldSpec[] = [
    ...SUB_BRIEF_LEAF,
    { long: 'children', short: 'cs', kind: 'objArr', fields: SUB_BRIEF_LEAF },
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
    { long: 'description', short: 'd', kind: 'str' },
    { long: 'detail_description', short: 'd2', kind: 'str' },
    { long: 'description_lang', short: 'dl', kind: 'str' },
    { long: 'job_limited', short: 'jl', kind: 'numArr' },
    { long: 'equipment_limited', short: 'el', kind: 'numArr' },
    { long: 'tags', short: 'tg', kind: 'numArr' },
    { long: 'learn', short: 'ln', kind: 'objArr', fields: LEARN },
    { long: 'levels', short: 'lv', kind: 'objArr', fields: LEVEL },
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
                out[spec.long] = spec.map ? reverseMap(spec)[value] ?? value : value;
                break;
            }
            case 'bool':
                out[spec.long] = raw === 1 || raw === true;
                break;
            case 'numArr':
            case 'strArr':
                out[spec.long] = Array.isArray(raw) ? raw : [];
                break;
            case 'numMap':
                out[spec.long] = raw && typeof raw === 'object' ? { ...(raw as Doc) } : {};
                break;
            case 'obj':
                out[spec.long] = decodeDoc(raw as Doc, spec.fields ?? []);
                break;
            case 'map': {
                const nested: Doc = {};
                for (const [key, value] of Object.entries((raw as Doc) ?? {})) {
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
                for (const [key, rows] of Object.entries((raw as Record<string, Doc[]>) ?? {})) {
                    nested[key] = (rows ?? []).map((item) => decodeDoc(item, spec.fields ?? []));
                }
                out[spec.long] = nested;
                break;
            }
        }
    }

    return out as T;
}
