<template>
    <NSpin :show="loading">
        <div v-if="data" class="flex flex-col gap-4 text-sm">
            <div v-if="data.flags.test || !data.player" class="flex flex-wrap items-center gap-1.5">
                <NTag v-if="data.flags.test" size="small" :bordered="false" type="error">测试数据</NTag>
                <NTag v-if="!data.player" size="small" :bordered="false">敌方专用</NTag>
            </div>

            <table class="wikitable w-full table-fixed! text-center text-sm border-collapse m-0!">
                <!-- 两个标题列定宽，剩下的宽度由第 2 / 4 列平分，保证值列起点一致 -->
                <colgroup>
                    <col class="w-[4.5rem]!" />
                    <col />
                    <col class="w-[4.5rem]!" />
                    <col />
                </colgroup>
                <tbody>
                    <tr>
                        <th colspan="4" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">基本信息</th>
                    </tr>
                    <tr v-for="pair in infoPairs" :key="pair.key">
                        <template v-for="cell in pair.cells" :key="cell.label">
                            <th
                                class="w-[4.5rem]! h-9 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!"
                            >
                                {{ cell.label }}
                            </th>
                            <td
                                class="h-9 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                                :colspan="pair.cells.length === 1 ? 3 : 1"
                            >
                                <div v-if="cell.tags?.length" class="flex flex-wrap items-center justify-center gap-1">
                                    <NTag v-for="tag in cell.tags" :key="tag" size="small" :bordered="false">
                                        {{ tag }}
                                    </NTag>
                                </div>
                                <template v-else>{{ cell.value }}</template>
                            </td>
                        </template>
                    </tr>
                    <template v-if="data.description || data.detail_description">
                        <tr>
                            <th colspan="4" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">描述</th>
                        </tr>
                        <tr>
                            <td colspan="4" class="text-left px-2 py-2 align-top border! border-[#463d38]!">
                                <div v-if="data.description" class="whitespace-pre-line">
                                    {{ data.description }}
                                </div>
                                <div v-if="data.detail_description" class="whitespace-pre-line opacity-70 mt-2">
                                    {{ data.detail_description }}
                                </div>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>

            <div v-if="detailRows.length" class="mt-3 overflow-x-auto thin-scrollbar">
                <table class="wikitable w-full min-w-[520px] text-center text-sm border-collapse m-0!">
                    <tbody>
                        <tr>
                            <th :colspan="detailCols" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">
                                详细数值
                            </th>
                        </tr>
                        <tr>
                            <th class="text-left px-2 py-1 whitespace-nowrap border! border-[#463d38]!">项目</th>
                            <th
                                v-for="lv in levels"
                                :key="lv.level"
                                class="px-2 py-1 whitespace-nowrap border! border-[#463d38]!"
                            >
                                Lv{{ lv.level }}
                            </th>
                        </tr>
                        <tr v-for="(row, index) in detailRows" :key="index">
                            <td
                                class="text-left px-2 py-1 whitespace-nowrap border! border-[#463d38]!"
                                :style="row.depth ? { paddingLeft: `${0.5 + row.depth * 0.9}rem` } : undefined"
                            >
                                <template v-if="row.group">
                                    <!-- 有编辑权限时标出 sub effect id，方便对照 EffectKind 表 -->
                                    <NTag
                                        v-if="canEdit && row.kind != null"
                                        size="tiny"
                                        :bordered="false"
                                        type="warning"
                                        class="mr-1! align-middle"
                                    >
                                        {{ row.kind }}
                                    </NTag>
                                    <span>{{ row.group }}</span>
                                    <template v-if="row.name">
                                        <span class="mx-1 opacity-50">·</span>
                                        <span class="opacity-60">{{ row.name }}</span>
                                    </template>
                                </template>
                                <template v-else>{{ row.label }}</template>
                            </td>
                            <td
                                v-if="row.constant"
                                :colspan="levels.length"
                                class="px-2 py-1 border! border-[#463d38]! text-center whitespace-normal break-words"
                                :class="row.dim ? 'opacity-60' : ''"
                            >
                                <span
                                    v-if="constantLink(row) != null"
                                    class="cursor-pointer hover:underline"
                                    @click="openSkill(constantLink(row))"
                                >
                                    {{ row.values[0] }}
                                </span>
                                <template v-else>{{ row.values[0] }}</template>
                            </td>
                            <template v-else>
                                <td
                                    v-for="(v, i) in row.values"
                                    :key="i"
                                    class="px-2 py-1 border! border-[#463d38]! whitespace-nowrap"
                                    :class="row.dim ? 'opacity-60' : ''"
                                >
                                    <!-- 低级时的空位用更暗更小的占位符 -->
                                    <span v-if="!v" class="text-[0.75rem] leading-none opacity-30">—</span>
                                    <!-- 参数里识别出来的技能：点开详情 -->
                                    <span
                                        v-else-if="row.links?.[i] != null"
                                        class="cursor-pointer hover:underline"
                                        @click="openSkill(row.links[i])"
                                    >
                                        {{ v }}
                                    </span>
                                    <template v-else>{{ v }}</template>
                                </td>
                            </template>
                        </tr>
                    </tbody>
                </table>
            </div>

            <table class="wikitable w-full table-fixed! text-center text-sm border-collapse m-0!">
                <colgroup>
                    <col class="w-[4.5rem]!" />
                    <col />
                </colgroup>
                <tbody>
                    <tr>
                        <th colspan="2" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">学习 / 获取</th>
                    </tr>
                    <template v-if="learnRows.length || sourceTags.length">
                        <tr v-if="learnRows.length">
                            <th class="h-9 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!">学习</th>
                            <td
                                class="h-9 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                            >
                                <div class="flex flex-wrap items-center justify-center gap-1">
                                    <NTag
                                        v-for="learn in learnRows"
                                        :key="learn"
                                        size="small"
                                        :bordered="false"
                                        type="info"
                                    >
                                        {{ learn }}
                                    </NTag>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="sourceTags.length">
                            <th class="h-9 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!">获取</th>
                            <td
                                class="h-9 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                            >
                                <div class="flex flex-wrap items-center justify-center gap-1">
                                    <NTag
                                        v-for="s in sourceTags"
                                        :key="s"
                                        size="small"
                                        :bordered="false"
                                        type="success"
                                    >
                                        {{ s }}
                                    </NTag>
                                </div>
                            </td>
                        </tr>
                    </template>
                    <tr v-else>
                        <td colspan="2" class="px-2 py-1 opacity-40 border! border-[#463d38]!">无</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <NEmpty v-else-if="!loading" description="加载失败" />
    </NSpin>
</template>

<script setup lang="ts">
import { NEmpty, NSpin, NTag } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { MwConfig } from '../../huiji/MwConfig';
import { useDataV2Store } from './dataV2Store';
import type {
    EffectParamLabel,
    SkillDamage,
    SkillDetail,
    SkillLevel,
    SkillSubEffect,
    SubEffectBrief,
    SubEffectBriefLeaf,
} from './types';

defineOptions({ name: '技能详情V2' });

const props = defineProps<{ identification: number }>();
const store = useDataV2Store();

/** 有编辑权限的人才会看到 sub effect id（方便去改 EffectKind 表） */
const canEdit = MwConfig.getInstance().canEdit;

/** 参数里识别出的技能可以点开详情（由外面的 SkillModal 切换当前技能） */
const emit = defineEmits<{ openSkill: [identification: number] }>();
const openSkill = (identification?: number | null) => {
    if (identification == null) return;
    emit('openSkill', identification);
};

const data = ref<SkillDetail | null>(null);
const loading = ref(false);

const SOURCE_LABEL: Record<string, string> = {
    job: '职业',
    potential: '潜在',
    discipline: '克己',
    equipment: '装备',
    equip_set: '套装',
    relic: '遗物',
    fate: '才能',
    bond: '羁绊',
};

/**
 * 获取标签的口径：
 * - 角色 ``unique_skill_ids`` 里的被动技能 = 固有技能，主动技能 = 角色专用技能；
 * - 同时出现在继承列表里的一律叫继承技能，不再重复显示固有 / 角色专用。
 */
const sourceTags = computed(() => {
    const d = data.value;
    if (!d) return [];
    const tags: string[] = [];
    if (d.sources.includes('inherit')) tags.push('继承技能');
    else if (d.sources.includes('unique')) tags.push(d.is_passive ? '固有技能' : '角色专用技能');
    for (const [key, label] of Object.entries(SOURCE_LABEL)) {
        if (d.sources.includes(key)) tags.push(label);
    }
    return tags;
});

/** ``Skill.cost_kind``: 1 = SP (weapon skills), 2 = MP (magic / prayers). */
const COST_UNIT: Record<number, string> = { 1: 'SP', 2: 'MP' };

/** ``SkillDamageEffect.damage_type``. */
const DAMAGE_TYPE: Record<number, string> = { 1: '物理', 2: '魔法', 3: '特殊' };

/** ``SkillDamageEffect.aptitude_ids``: only the six named elements are printed. */
const ELEMENT: Record<number, string> = { 1: '火', 2: '水', 3: '风', 4: '土', 5: '光', 6: '暗' };

/** ``Skill.use_timing``: 1 / 5 are the always-on (passive) timings. */
const PASSIVE_TIMING = new Set([1, 5]);

/** ``Skill.skill_kind`` of the four spell kinds (攻击 / 回复 / 强化 / 妨碍魔法). */
const SPELL_KINDS = new Set([4, 5, 6, 7]);

/** ``SkillDamageEffect.damage_count`` = 99 means "one hit per weapon swing". */
const WEAPON_COUNT = 99;

/** ``SkillSubEffect.reference_parameter`` = the stat the apply rate scales with. */
const REFERENCE_PARAM: Record<number, string> = {
    1: '攻击力',
    2: '魔力',
    3: '神力',
    4: '防御力',
    5: '法术防御力',
    6: '抵抗',
    7: '暴击',
    8: '暴击回避',
    9: '探知',
    10: '陷阱解除',
    11: '陷阱回避',
    12: '行动速度',
    13: '回避',
    14: '命中',
    20: '力量',
    21: '智力',
    22: '信仰',
    23: '体力',
    24: '敏捷',
    25: '灵巧',
    26: '运气',
    27: '等级',
    28: '当前HP',
    29: '最大HP',
};

const levels = computed<SkillLevel[]>(() => data.value?.levels ?? []);

const jobName = (id: number) => store.jobById.get(id)?.name ?? `职业 #${id}`;

const integer = (v: number | null | undefined) => (v == null ? '' : String(v));

interface Row {
    label: string;
    values: string[];
    /** two-part rows: 「效果名 · 参数名」, only the second part is dimmed */
    group?: string;
    name?: string;
    /** sub effect kind id（只挂在每组第一行，供编辑者核对） */
    kind?: number;
    /** 追加子效果的缩进层级（1 = 直接挂在父效果下），项目列按层级右移 */
    depth?: number;
    /** 没有任何数值也要占一行（例如无参数的子效果） */
    always?: boolean;
    /** 即使整组只有这一行，也保留「· 参数名」（组里有参数引用时需要靠它区分） */
    keepName?: boolean;
    /** dim the value itself (e.g. 「依武器」) */
    dim?: boolean;
    /** 每格如果识别出了技能，这里放它的 identification（可点击打开详情） */
    links?: Array<number | undefined>;
}

const collect = (label: string, fn: (lv: SkillLevel) => string): Row | null => {
    const values = levels.value.map((lv) => fn(lv));
    return values.some((v) => v !== '') ? { label, values } : null;
};

const damageValues = (label: string, fn: (d: SkillDamage) => string) =>
    collect(label, (lv) => (lv.damage ?? []).map(fn).filter(Boolean).join(' / '));

/** 攻击开始时触发的效果单独成行，避免和同名的伤害后效果混在一起 */
const subLabel = (s: SkillSubEffect) =>
    `${s.from === 'attack_start' ? '攻击前 · ' : ''}${s.kind_name ?? `效果 #${s.kind}`}`;

/**
 * 参数名末尾的 ``%`` 表示「这个值是百分数」（如 百分比% / 概率%）。
 * 显示时名称去掉 ``%``，数值后面补上 ``%``。
 */
const PERCENT = /%+$/;

const paramName = (label: EffectParamLabel | null | undefined, index: number) =>
    (label?.name ?? `参数${index + 1}`).replace(PERCENT, '');

const paramValue = (label: EffectParamLabel | null | undefined, value: number) => {
    const percent = PERCENT.test(label?.name ?? '') || label?.unit === '%';
    return percent ? `${value}%` : String(value);
};

/**
 * 参数名以 effect_kinds.json 为准（未确认的在那儿写成 参数1 / 参数2 …），
 * 只有完全缺失时才在前端按位置补一个占位名。
 */
interface SubField {
    name: string;
    value: string;
    /** 参数位置（0-based），用于把参数引用插回参数顺序里；其他字段没有 */
    slot?: number;
    /** 这个值识别成了技能时，记录它的 identification */
    skill?: number;
}

/** HP 回复类效果，效果量按「恢复量」命名 */
const RECOVER_KINDS = new Set([1000, 1010, 1060]);

/**
 * 效果量：参照能力值 × 百分比，配阈值窗口。
 * 例：HP 回复为「恢复量 · 神力 140%，阈值 100，阈值起点 0」。
 */
const amountFields = (s: SkillSubEffect): SubField[] => {
    const out: SubField[] = [];
    const base = RECOVER_KINDS.has(s.kind ?? 0) ? '恢复量' : '效果量';
    const refName = (id: number | null | undefined) =>
        id == null || id === 0 ? '' : (REFERENCE_PARAM[id] ?? `#${id}`);

    if (s.calc_reference_parameter_rate) {
        const stat = refName(s.calc_reference_parameter);
        out.push({
            name: stat ? `${base} · ${stat}` : base,
            value: `${s.calc_reference_parameter_rate}%`,
        });
    }
    if (s.calc_reference_parameter_rate_2) {
        const stat = refName(s.calc_reference_parameter_2);
        out.push({
            name: stat ? `${base}2 · ${stat}` : `${base}2`,
            value: `${s.calc_reference_parameter_rate_2}%`,
        });
    }
    // 没有任何参照能力值时，阈值只是个孤立数字（敌方专用技能常见 10000），不单独显示
    const hasRef = Boolean(s.calc_reference_parameter_rate || s.calc_reference_parameter);
    if (hasRef && s.calc_valid_cap_parameter_value) {
        out.push({ name: `${base}阈值`, value: String(s.calc_valid_cap_parameter_value) });
    }
    if (hasRef && s.calc_valid_start_parameter_value) {
        out.push({ name: `${base}阈值起点`, value: String(s.calc_valid_start_parameter_value) });
    }
    return out;
};

const kindName = (id: number) => store.effectKinds[String(id)]?.name ?? `#${id}`;

/** 效果种类名：wiki 上的名字（可手改成中文）优先于数据里的日文名 */
const effectLabel = (e: SubEffectBriefLeaf) =>
    (e.kind == null ? null : store.effectKinds[String(e.kind)]?.name) || e.kind_name || `效果 #${e.kind}`;

/**
 * 参数里的七位数以上都是原始 id（sub effect / 效果组 / 技能 / 怪物 …），
 * 普通数值（百分比 / 回合 / 个数 / 种类 id）都在 7 位数以下，不受影响。
 */
const isRawId = (value: number) => value >= 1000000;

/**
 * 原始 id 里有一部分是技能 id，可以自动认出来：
 * 要么等于 ``identification``，要么是 ``Skill`` 表的行 id ``identification×100+等级``。
 * 认得出来就显示成技能名（带等级），认不出来的原始 id（sub effect / 效果组）仍然隐藏。
 */
const skillRef = (value: number): { id: number; name: string } | null => {
    const direct = store.skillById.get(value);
    if (direct) return { id: direct.identification, name: direct.name ?? direct.name_jp ?? '' };
    const id = Math.floor(value / 100);
    const skill = store.skillById.get(id);
    if (!skill) return null;
    const name = skill.name ?? skill.name_jp ?? '';
    const level = value % 100;
    return { id, name: level > 0 && level <= 9 ? `${name} Lv${level}` : name };
};

/** 参数 -> 「参数名 / 值」；0 也照常显示，只有原始 id 对不上技能时才跳过 */
const paramFields = (
    params: Array<number | null> | null | undefined,
    labels: Array<EffectParamLabel | null> | null | undefined,
): SubField[] => {
    const out: SubField[] = [];
    (params ?? []).forEach((raw, index) => {
        const label = labels?.[index] ?? null;
        const value = raw ?? 0;
        if (isRawId(value)) {
            const skill = skillRef(value);
            if (skill) {
                out.push({ name: paramName(label, index), value: skill.name, slot: index, skill: skill.id });
            }
            return;
        }
        out.push({ name: paramName(label, index), value: paramValue(label, value), slot: index });
    });
    return out;
};

/** 抵抗类型 / 目标种族 / 效果互斥与移除 */
const miscFields = (s: SkillSubEffect): SubField[] => {
    const out: SubField[] = [];
    if (s.reference_resist) out.push({ name: '抵抗类型', value: String(s.reference_resist) });
    if (s.target_race_ids?.length) {
        out.push({ name: '目标种族', value: s.target_race_ids.map((id) => store.raceName(id)).join(' / ') });
    }
    const kind = s.kind == null ? null : store.effectKinds[String(s.kind)];
    if (kind?.invalid_kinds?.length) {
        out.push({ name: '互斥', value: kind.invalid_kinds.map(kindName).join(' / ') });
    }
    if (kind?.remove_kinds?.length) {
        out.push({ name: '移除', value: kind.remove_kinds.map(kindName).join(' / ') });
    }
    return out;
};

/**
 * ``SkillSubEffect`` carries ``param_1..7`` (names from effect_kinds.json),
 * ``strength`` and ``turn``. Every used value becomes its own row instead of one
 * long cell, so ``turn == 9999`` (permanent) reads as its own line too.
 */
const subFields = (s: SkillSubEffect): SubField[] => {
    const out: SubField[] = [...paramFields(s.params, s.param_labels)];
    // ``strength`` often duplicates param_2 (e.g. 气绝), don't list it twice
    if (s.strength && !(s.params ?? []).includes(s.strength)) {
        out.push({ name: '强度', value: String(s.strength) });
    }
    if (s.turn) out.push({ name: '回合', value: s.turn >= 9999 ? '永久' : String(s.turn) });
    out.push(...amountFields(s), ...miscFields(s));
    return out;
};

/**
 * ``child_sub_effects``（追加子效果）/ ``extension_effects``（扩展参数）里的效果
 * 也要逐行显示：效果名放进项目列并按层级缩进，参数名各自占一行，和父效果口径一致。
 */
interface EffectNode {
    /** 缩进层级，1 = 直接挂在父效果下 */
    depth: number;
    /** 层级路径（含序号），用来区分不同父效果下的同名子效果 */
    path: string;
    label: string;
    kind: number | null;
    fields: SubField[];
    /** 由参数引用产生时，记录参数位置，用于插回参数顺序 */
    slot?: number;
}

/** brief 版的效果 -> 参数名 / 值（参数名同样以 effect_kinds.json 为准） */
const briefFields = (e: SubEffectBriefLeaf): SubField[] => {
    const kind = e.kind == null ? null : store.effectKinds[String(e.kind)];
    const out: SubField[] = [...paramFields(e.params, kind?.params)];
    if (e.strength && !(e.params ?? []).includes(e.strength)) {
        out.push({ name: '强度', value: String(e.strength) });
    }
    if (e.turn) out.push({ name: '回合', value: e.turn >= 9999 ? '永久' : String(e.turn) });
    return out;
};

/**
 * 递归展开成「层级 + 效果名 + 参数」。同名兄弟（例：多阶花バフ）按出现顺序加序号，
 * 否则不同阶段会被合并到同一组里挤成一个单元格。
 */
const effectNodes = (list: SubEffectBriefLeaf[], depth: number, out: EffectNode[] = [], parent = ''): EffectNode[] => {
    const total = new Map<string, number>();
    for (const e of list) total.set(effectLabel(e), (total.get(effectLabel(e)) ?? 0) + 1);
    const seen = new Map<string, number>();
    for (const e of list) {
        const base = effectLabel(e);
        let label = base;
        if ((total.get(base) ?? 1) > 1) {
            const index = (seen.get(base) ?? 0) + 1;
            seen.set(base, index);
            label = `${base} ${index}`;
        }
        const path = parent ? `${parent} › ${label}` : label;
        out.push({ depth, path, kind: e.kind, label, fields: briefFields(e) });
        // 清洗时只展开一层，children 只会出现在第一层
        effectNodes((e as SubEffectBrief).children ?? [], depth + 1, out, path);
    }
    return out;
};

/**
 * 参数里指向的效果（例：2820 第一个参数是技能、后面几个是系数）：
 * 按参数序号排好，标签带上参数名，展开成缩进的行。
 */
const paramRefNodes = (s: SkillSubEffect): EffectNode[] =>
    Object.entries(s.param_refs ?? {})
        .sort((a, b) => Number(a[0]) - Number(b[0]))
        // 「扩展参数」行本身就是一串配置值，由调用方摊平成一列；这里只处理真效果
        .filter(([, ref]) => ref.kind != null || Boolean(ref.children?.length))
        .flatMap(([index, ref]) => {
            const no = Number(index);
            const prefix = paramName(s.param_labels?.[no - 1], no - 1);
            return effectNodes([ref], 1, [], prefix).map((node) => ({
                ...node,
                label: `${prefix} · ${node.label}`,
                slot: no - 1,
            }));
        });

/** 一个 sub effect 挂在下面的所有效果（追加子效果 + 扩展参数 + 参数指向的效果） */
const childEffects = (s: SkillSubEffect): EffectNode[] => [
    ...effectNodes([...(s.child_sub_effects ?? []), ...(s.extension_effects ?? [])], 1),
    ...paramRefNodes(s),
];

/**
 * ``SkillDamageEffect.reference_parameter`` (SkillReferenceParamType) decides which stat
 * 威力 is a percentage of - 攻击力 for martial skills, 魔力 / 神力 for spells.
 */
const powerRef = computed(() => {
    const refs = new Set<number>();
    const extra = new Set<number>();
    for (const lv of levels.value) {
        for (const d of lv.damage ?? []) {
            if (d.reference_parameter) refs.add(d.reference_parameter);
            if (d.reference_parameter_2) extra.add(d.reference_parameter_2);
        }
    }
    if (refs.size !== 1) return '';
    const [only] = [...refs];
    const base = only == null ? undefined : REFERENCE_PARAM[only];
    if (!base) return '';
    // double scaling: 11800001 is 魔力＋神力, 11100009 is 攻击力＋灵巧 …
    const second = [...extra].map((id) => REFERENCE_PARAM[id]).filter((name): name is string => Boolean(name));
    return second.length === 1 ? `${base}＋${second[0]}` : base;
});

const powerLabel = computed(() => (powerRef.value ? `威力 · ${powerRef.value}` : '威力'));

const rows = computed<Row[]>(() => {
    const out: Row[] = [];
    const add = (row: Row | null) => {
        if (row) out.push(row);
    };

    // 单位放进项目列（消耗 SP / 消耗 MP），值列只留数字
    const costKind = levels.value.find((lv) => lv.cost != null)?.cost_kind;
    const costUnit = costKind == null ? '' : (COST_UNIT[costKind] ?? '');
    add(collect(`消耗${costUnit ? ` ${costUnit}` : ''}`, (lv) => (lv.cost == null ? '' : String(lv.cost))));
    add(collect('使用次数', (lv) => (lv.use_limit ? String(lv.use_limit) : '')));
    add(collect('仇恨', (lv) => (lv.hate ? String(lv.hate) : '')));
    add(
        collect('使用条件', (lv) =>
            lv.skill_condition_ids?.length ? lv.skill_condition_ids.map((id) => `#${id}`).join(' / ') : '',
        ),
    );
    add(damageValues('固定伤害', (d) => (d.fixed_damage ? integer(d.fixed_damage) : '')));

    // 威力: the reference stat is its own dimmed segment, like a sub effect parameter
    const powerRow = damageValues(powerLabel.value, (d) => (d.attack_rate == null ? '' : `${d.attack_rate}%`));
    if (powerRow && powerRef.value) {
        powerRow.group = '威力';
        powerRow.name = powerRef.value;
    }
    add(powerRow);

    add(damageValues('阈值', (d) => (d.valid_cap_parameter_value ? integer(d.valid_cap_parameter_value) : '')));
    add(damageValues('双手威力', (d) => (d.attack_rate_both_hands ? `${d.attack_rate_both_hands}%` : '')));
    add(
        damageValues('双手阈值', (d) =>
            d.valid_cap_parameter_value_both_hands ? integer(d.valid_cap_parameter_value_both_hands) : '',
        ),
    );
    // 下限阈值是单手 / 双手共用的，放在两行阈值之后
    add(damageValues('下限阈值', (d) => (d.valid_start_parameter_value ? integer(d.valid_start_parameter_value) : '')));
    add(damageValues('命中修正', (d) => integer(d.hit_rate)));
    // 直接写数值，不显示 %
    add(damageValues('会心修正', (d) => (d.add_critical_rate ? String(d.add_critical_rate) : '')));
    add(
        damageValues('伤害倍率修正', (d) =>
            d.add_damage_rate && d.add_damage_rate !== 100 ? `${d.add_damage_rate}%` : '',
        ),
    );

    // 射程放在攻击次数前；「依武器」和攻击次数一样变暗
    const rangeRow = collect('射程', (lv) => store.rangeName(lv.range_type));
    if (rangeRow && rangeRow.values.every((v) => v === '依武器')) rangeRow.dim = true;
    add(rangeRow);

    const countRow = damageValues('攻击次数', (d) => {
        if (!d.damage_count) return '';
        return d.damage_count === WEAPON_COUNT ? '依武器' : `×${d.damage_count}`;
    });
    if (countRow && countRow.values.every((v) => v === '依武器')) countRow.dim = true;
    add(countRow);

    add(damageValues('仅一次', (d) => (d.only_once ? '是' : '')));

    // sub effects: one row per kind, merged inside a level. Sorted by kind id so every
    // skill lists its effects in the same order, whatever the master data emits first.
    const labels = new Map<string, number>();
    for (const lv of levels.value) {
        for (const s of lv.sub_effects ?? []) {
            const label = subLabel(s);
            if (!labels.has(label)) labels.set(label, s.kind ?? 0);
        }
    }
    const ordered = [...labels].sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]));
    // 顶层效果的种类，用来判断某个子效果 / 扩展参数是不是已经单独列过了
    const topKinds = new Set(labels.values());
    for (const [label, kindId] of ordered) {
        const pick = (lv: SkillLevel) => (lv.sub_effects ?? []).filter((s) => subLabel(s) === label);

        // 组内先收集、最后按顺序写下：参数引用和参数值按参数序号穿插，
        // 其他字段（回合 / 效果量 / 施加率）在下，下级效果最后
        const group: Array<{ order: number; row: Row }> = [];
        const push = (order: number, row: Row) => group.push({ order, row });

        const paramLabel = (no: number) => {
            for (const lv of levels.value) {
                for (const s of pick(lv)) {
                    const found = s.param_labels?.[no - 1];
                    if (found?.name) return paramName(found, no - 1);
                }
            }
            return `参数${no}`;
        };

        // 参数引用的配置系数（例：2820 的三个系数组）：一个系数一行，跟着参数序号走
        const refRows = new Map<number, Map<string, string[]>>();
        for (const [li, lv] of levels.value.entries()) {
            for (const s of pick(lv)) {
                for (const [index, ref] of Object.entries(s.param_refs ?? {})) {
                    // 指向真实效果的交给 childEffects 展开，这里只摊平纯数值行
                    if (ref.kind != null || ref.children?.length || !ref.params?.length) continue;
                    const no = Number(index);
                    let byName = refRows.get(no);
                    if (!byName) refRows.set(no, (byName = new Map()));
                    ref.params.forEach((value, i) => {
                        const name = `扩展参数${i + 1}`;
                        const values = byName.get(name) ?? levels.value.map(() => '');
                        values[li] = String(value);
                        byName.set(name, values);
                    });
                }
            }
        }
        for (const [no, byName] of [...refRows].sort((a, b) => a[0] - b[0])) {
            const prefix = paramLabel(no);
            for (const [name, values] of byName) {
                push((no - 1) * 10 + 5, {
                    label: `${label} · ${prefix} · ${name}`,
                    values,
                    group: label,
                    name: `${prefix} · ${name}`,
                    kind: kindId,
                    // 即使整组只剩这一行，也要保留「参数N · 扩展参数K」
                    keepName: true,
                });
            }
        }

        // one row per parameter: 防御力下降 防御变化 / 防御力下降 回合 / …
        const names: string[] = [];
        const slots = new Map<string, number>();
        for (const lv of levels.value) {
            for (const s of pick(lv)) {
                for (const field of subFields(s)) {
                    if (names.includes(field.name)) continue;
                    names.push(field.name);
                    if (field.slot != null) slots.set(field.name, field.slot);
                }
            }
        }
        // 参数全是被隐藏的原始 id 时，只保留效果名，避免整组从表里消失
        if (!names.length && levels.value.some((lv) => pick(lv).some((s) => (s.params ?? []).some(Boolean)))) {
            push(-1, { label, values: levels.value.map(() => ''), group: label, kind: kindId, always: true });
        }
        for (const name of names) {
            const perLevel = levels.value.map((lv) =>
                pick(lv)
                    .map((s) => subFields(s).find((f) => f.name === name))
                    .filter((f): f is SubField => Boolean(f)),
            );
            const values = perLevel.map((fields) => fields.map((f) => f.value).join(' / '));
            if (!values.some((v) => v !== '')) continue;
            const slot = slots.get(name);
            push(slot != null ? slot * 10 : 1000 + names.indexOf(name), {
                label: `${label} · ${name}`,
                values,
                group: label,
                name,
                kind: kindId,
                // 组里有参数引用时，参数名要和「参数N · 扩展参数K」区分开，不能省
                keepName: refRows.size > 0,
                links: perLevel.map((fields) => fields.find((f) => f.skill != null)?.skill),
            });
        }

        // 施加率: base rate + the stat window it is scaled by
        if (levels.value.some((lv) => pick(lv).some((s) => s.reference_parameter_rate))) {
            const stat = levels.value
                .map((lv) => pick(lv).find((s) => s.reference_parameter_rate)?.reference_parameter)
                .map((p) => (p == null ? undefined : REFERENCE_PARAM[p]))
                .find(Boolean);

            const addSubRow = (suffix: string, fn: (s: SkillSubEffect) => string) => {
                const values = levels.value.map((lv) => pick(lv).map(fn).filter(Boolean).join(' / '));
                if (values.some((v) => v !== '')) {
                    push(2000 + group.length, {
                        label: `${label} · ${suffix}`,
                        values,
                        group: label,
                        name: suffix,
                        kind: kindId,
                    });
                }
            };

            addSubRow(stat ? `施加率（${stat}）` : '施加率', (s) =>
                s.reference_parameter_rate ? `${s.reference_parameter_rate}%` : '',
            );
            addSubRow('施加率阈值', (s) =>
                s.abnormal_valid_cap_parameter_value ? integer(s.abnormal_valid_cap_parameter_value) : '',
            );
            addSubRow('施加率下限阈值', (s) =>
                s.abnormal_valid_start_parameter_value ? integer(s.abnormal_valid_start_parameter_value) : '',
            );
        }

        // 追加子效果 / 扩展参数：效果名进项目列并按层级缩进，参数名继续逐行
        const children = new Map<string, EffectNode>();
        for (const lv of levels.value) {
            for (const s of pick(lv)) {
                for (const child of childEffects(s)) {
                    // 顶层已经有同种类的效果了（同一个效果又被当扩展参数引用一次），
                    // 例如 2810 的扩展参数就是 2820，不再重复展开一遍
                    if (child.kind != null && topKinds.has(child.kind)) continue;
                    const saved = children.get(child.path);
                    if (!saved) {
                        children.set(child.path, { ...child, fields: [...child.fields] });
                        continue;
                    }
                    for (const field of child.fields) {
                        if (!saved.fields.some((f) => f.name === field.name)) saved.fields.push(field);
                    }
                }
            }
        }
        for (const child of children.values()) {
            const pickChild = (lv: SkillLevel) =>
                pick(lv)
                    .flatMap((s) => childEffects(s))
                    .filter((c) => c.path === child.path);
            const pushChild = (
                name: string | undefined,
                values: string[],
                always = false,
                links?: Array<number | undefined>,
            ) =>
                push(child.slot != null ? child.slot * 10 + 6 : 3000 + group.length, {
                    label: name ? `${child.label} · ${name}` : child.label,
                    values,
                    group: child.label,
                    name,
                    kind: child.kind ?? undefined,
                    depth: child.depth,
                    always,
                    links,
                });
            if (!child.fields.length) {
                // 没有参数的子效果也要占一行，名字本身就是全部信息
                pushChild(
                    undefined,
                    levels.value.map(() => ''),
                    true,
                );
                continue;
            }
            for (const field of child.fields) {
                const perLevel = levels.value.map((lv) =>
                    pickChild(lv)
                        .map((c) => c.fields.find((f) => f.name === field.name))
                        .filter((f): f is SubField => Boolean(f)),
                );
                const values = perLevel.map((fields) => fields.map((f) => f.value).join(' / '));
                if (!values.some((v) => v !== '')) continue;
                pushChild(
                    field.name,
                    values,
                    false,
                    perLevel.map((fields) => fields.find((f) => f.skill != null)?.skill),
                );
            }
        }

        // 组内按参数顺序写回总表
        group.sort((a, b) => a.order - b.order);
        for (const item of group) out.push(item.row);
    }

    // 双手数值和单手完全一致时不再单独占一行
    const dropIfSame = (label: string, base: string) => {
        const row = out.find((r) => r.label === label);
        const ref = out.find((r) => r.label === base);
        if (row && ref && row.values.join('|') === ref.values.join('|')) {
            out.splice(out.indexOf(row), 1);
        }
    };
    dropIfSame('双手威力', powerLabel.value);
    dropIfSame('双手阈值', '阈值');

    // 整个 sub effect 只输出一行时（例如 5010 只有一个参数有值），省掉「· 参数名」，
    // 只保留效果名。判断依据是最终行数，而不是参数个数：一个参数也可能同时带了
    // 强度 / 回合 / 施加率，那样仍然是多行。
    const groupSizes = new Map<string, number>();
    for (const row of out) {
        if (row.kind != null && row.group) groupSizes.set(row.group, (groupSizes.get(row.group) ?? 0) + 1);
    }
    for (const row of out) {
        if (row.kind != null && row.group && !row.keepName && groupSizes.get(row.group) === 1) {
            row.name = undefined;
        }
    }

    return out;
});

/**
 * Keep the natural order - a value that never changes must stay where it belongs, not be
 * pushed to the bottom; such a row just spans every level column.
 */
const detailRows = computed(() =>
    rows.value
        .filter((r) => r.always || r.values.some((v) => v !== ''))
        .map((r) => ({ ...r, constant: new Set(r.values).size === 1 })),
);

/** 合并成一格的常量行：只有各等级都指向同一个技能时才可点 */
const constantLink = (row: Row) => {
    const ids = new Set((row.links ?? []).filter((id): id is number => id != null));
    return ids.size === 1 ? [...ids][0] : undefined;
};

interface InfoRow {
    label: string;
    value?: string;
    /** rendered as tags instead of text (the 类型 cell) */
    tags?: string[];
}

const infoRows = computed<InfoRow[]>(() => {
    const d = data.value;
    if (!d) return [];
    const firstLevel = levels.value[0];
    const damages = firstLevel?.damage ?? [];
    const targets = [
        ...new Set(
            [...damages.map((x) => x.target_text), ...(firstLevel?.sub_effects ?? []).map((x) => x.target_text)].filter(
                (x): x is string => Boolean(x) && x !== '#N/A',
            ),
        ),
    ];

    const out: InfoRow[] = [];

    // 类型 = 被动 / 主动 / 咒文 + skill_kind, both as tags in the same cell
    const form = SPELL_KINDS.has(d.kind ?? 0)
        ? '咒文'
        : d.is_passive || PASSIVE_TIMING.has(firstLevel?.use_timing ?? 0)
          ? '被动'
          : '主动';
    out.push({ label: '类型', tags: [form, d.kind_name ?? `#${d.kind}`] });

    out.push({ label: '最大等级', value: String(d.max_level) });

    if (targets.length) out.push({ label: '技能目标', value: targets.join(' / ') });

    // 伤害种类 = 物理 / 魔法 / 特殊 + 元素, only for skills that deal damage
    if (damages.length) {
        const labels = [
            ...new Set(
                damages.map((x) => {
                    const element = (x.aptitude_ids ?? [])
                        .map((id) => ELEMENT[id])
                        .filter((name): name is string => Boolean(name))
                        .join('');
                    const kind = DAMAGE_TYPE[x.damage_type ?? 0] ?? `#${x.damage_type}`;
                    return element ? `${kind} · ${element}` : kind;
                }),
            ),
        ];
        out.push({ label: '伤害种类', value: labels.join(' / ') });
    }

    // 职业限制 / 武器限制: only the ones that actually apply
    if (d.job_limited.length) {
        out.push({ label: '职业限制', value: d.job_limited.map(jobName).join(' / ') });
    }
    if (d.equipment_limited.length) {
        out.push({
            label: '武器限制',
            value: d.equipment_limited.map((x) => store.equipmentName(x)).join(' / '),
        });
    }

    return out;
});

/** two label/value pairs per row, like the V1 information tables */
const infoPairs = computed(() => {
    const rows = infoRows.value;
    const out: Array<{ key: string; cells: InfoRow[] }> = [];
    for (let i = 0; i < rows.length; i += 2) {
        out.push({ key: rows[i].label, cells: rows.slice(i, i + 2) });
    }
    return out;
});

/** 详细数值 table: the 项目 column plus one column per level */
const detailCols = computed(() => 1 + levels.value.length);

const learnRows = computed(() =>
    (data.value?.learn ?? []).map((x) => (x.get_lv == null ? jobName(x.job) : `${jobName(x.job)} Lv${x.get_lv}`)),
);

const load = async (id: number) => {
    loading.value = true;
    data.value = null;
    try {
        data.value = await store.getSkill(id);
    } finally {
        loading.value = false;
    }
};

watch(() => props.identification, load, { immediate: true });
</script>
