<template>
    <table v-if="chart" class="wikitable w-full text-sm border-collapse m-0!">
        <tbody>
            <tr>
                <th class="bg-black/50 px-2 py-1 border! border-[#463d38]!">{{ chart.title }}</th>
            </tr>
            <tr>
                <td class="px-2 py-2 align-top border! border-[#463d38]!">
                    <!-- 单手 / 双手是两套倍率与阈值；双属性可切换 X 轴，点击图表还能固定另一属性 -->
                    <div
                        v-if="twoHandAvailable || dualAvailable"
                        class="flex flex-wrap items-center gap-3 text-xs mb-1"
                    >
                        <span v-if="twoHandAvailable" class="inline-flex items-center gap-1">
                            <span class="opacity-50">武器</span>
                            <span
                                v-for="opt in handOptions"
                                :key="opt.value"
                                class="cursor-pointer rounded px-1.5 py-0.5"
                                :class="mode === opt.value ? 'bg-white/15' : 'opacity-50 hover:opacity-100'"
                                @click="setMode(opt.value)"
                            >
                                {{ opt.label }}
                            </span>
                        </span>
                        <span v-if="dualAvailable" class="inline-flex items-center gap-1">
                            <span class="opacity-50">X 轴</span>
                            <span
                                v-for="opt in paramOptions"
                                :key="opt.value"
                                class="cursor-pointer rounded px-1.5 py-0.5"
                                :class="xSel === opt.value ? 'bg-white/15' : 'opacity-50 hover:opacity-100'"
                                @click="setXSel(opt.value)"
                            >
                                {{ opt.label }}
                            </span>
                            <span
                                v-if="locked"
                                class="relative inline-flex items-center gap-1 text-amber-300"
                                @mouseenter="lockTip = true"
                                @mouseleave="lockTip = false"
                            >
                                {{ lockedLabel }} {{ compact(locked.value) }}(锁定)
                                <span
                                    class="cursor-pointer opacity-60 hover:opacity-100"
                                    title="取消锁定"
                                    @click="clearLock"
                                >
                                    ×
                                </span>
                                <!-- 悬停标签：只按这一个属性计算该锁定值对应的效果量 -->
                                <div
                                    v-if="lockTip"
                                    class="absolute left-0 top-full z-10 mt-1 rounded bg-black/85 px-2 py-1 text-xs leading-5 whitespace-nowrap"
                                >
                                    <div class="opacity-80 mb-1">
                                        {{ lockedLabel }} {{ compact(locked.value) }}(锁定) · 仅该属性
                                    </div>
                                    <div
                                        class="grid grid-cols-[4.5rem_4.5rem_4.5rem_5.5rem] gap-x-2 text-right opacity-50"
                                    >
                                        <span class="text-left">等级</span>
                                        <span>效果量</span>
                                        <span>变化</span>
                                        <span>每消耗</span>
                                    </div>
                                    <div
                                        v-for="(p, i) in lockTipPoints"
                                        :key="`lp${i}`"
                                        class="grid grid-cols-[4.5rem_4.5rem_4.5rem_5.5rem] gap-x-2 items-center"
                                    >
                                        <span class="flex items-center gap-1 text-left">
                                            <span
                                                class="inline-block w-2 h-2 rounded-full shrink-0"
                                                :style="{ backgroundColor: COLORS[p.colorIndex % COLORS.length] }"
                                            ></span>
                                            <span class="opacity-70">Lv {{ p.level }}</span>
                                        </span>
                                        <span
                                            class="text-right"
                                            :class="
                                                p.state === 'low'
                                                    ? 'text-red-400'
                                                    : p.state === 'high'
                                                      ? 'text-amber-300'
                                                      : 'text-green-400'
                                            "
                                        >
                                            {{ fmt(p.y) }}
                                        </span>
                                        <span class="text-right opacity-50">{{
                                            i > 0 ? '+' + fmt(p.y - lockTipPoints[i - 1].y) : '—'
                                        }}</span>
                                        <span class="text-right opacity-50">{{
                                            p.perCost != null ? fmt(p.perCost) + '/' + chart.costUnit : '—'
                                        }}</span>
                                    </div>
                                    <div class="opacity-50 mt-1">另一属性按 0 计算</div>
                                </div>
                            </span>
                        </span>
                    </div>

                    <!-- 图例：点击开关等级，关闭的等级不画曲线、不进 tooltip -->
                    <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs mb-1">
                        <span
                            v-for="(s, i) in chart.series"
                            :key="s.level"
                            class="inline-flex items-center gap-1 cursor-pointer"
                            :class="isLevelOn(s.level) ? '' : 'opacity-30 line-through'"
                            title="点击显示 / 隐藏该等级"
                            @click="toggleLevel(s.level)"
                        >
                            <span
                                class="inline-block w-2 h-2 rounded-full"
                                :style="{ backgroundColor: COLORS[i % COLORS.length] }"
                            ></span>
                            <span class="opacity-80">Lv {{ s.level }}</span>
                        </span>
                        <span class="ml-auto opacity-50">{{ chart.xLabel }} / 效果值</span>
                    </div>

                    <div ref="box" class="relative" @mouseleave="hover = null">
                        <svg
                            :width="W"
                            :height="H"
                            :viewBox="`0 0 ${W} ${H}`"
                            class="block"
                            :class="dualAvailable ? 'cursor-crosshair' : ''"
                            @mousemove="onMove"
                            @click="onChartClick"
                        >
                            <!-- 网格 -->
                            <g stroke="currentColor" stroke-width="1" opacity="0.12">
                                <line
                                    v-for="t in chart.yTicks"
                                    :key="`gy${t}`"
                                    :x1="PAD.l"
                                    :x2="W - PAD.r"
                                    :y1="yOf(t)"
                                    :y2="yOf(t)"
                                />
                                <line
                                    v-for="t in chart.xTicks"
                                    :key="`gx${t}`"
                                    :x1="xOf(t)"
                                    :x2="xOf(t)"
                                    :y1="PAD.t"
                                    :y2="H - PAD.b"
                                />
                            </g>

                            <!-- 阈值线：每级不同，虚线为上限、点线为下限 -->
                            <g v-for="m in visibleVlines" :key="`m${m.value}`">
                                <line
                                    :x1="xOf(m.value)"
                                    :x2="xOf(m.value)"
                                    :y1="PAD.t"
                                    :y2="H - PAD.b"
                                    stroke="currentColor"
                                    stroke-width="1"
                                    :stroke-dasharray="m.kind === 'cap' ? '4 3' : '2 4'"
                                    :opacity="m.kind === 'cap' ? 0.35 : 0.2"
                                />
                                <text
                                    :x="xOf(m.value)"
                                    :y="PAD.t + m.dy"
                                    text-anchor="middle"
                                    font-size="9"
                                    fill="currentColor"
                                    :opacity="m.kind === 'cap' ? 0.6 : 0.4"
                                >
                                    {{ m.label }}
                                </text>
                            </g>

                            <!-- 各等级曲线（只画开着的等级） -->
                            <polyline
                                v-for="{ s, colorIndex } in visibleSeries"
                                :key="`s${s.level}`"
                                :points="s.points"
                                fill="none"
                                :stroke="COLORS[colorIndex % COLORS.length]"
                                stroke-width="1.6"
                                stroke-linejoin="round"
                            />

                            <!-- 每级自己的阈值折点（上限 / 非零下限） -->
                            <template v-for="{ s, colorIndex } in visibleSeries" :key="`pt${s.level}`">
                                <circle
                                    v-if="s.cap > 0 && s.cap < NO_CAP"
                                    :cx="xOf(s.cap)"
                                    :cy="yOf(valueAt(s.cap, s))"
                                    r="2.8"
                                    :fill="COLORS[colorIndex % COLORS.length]"
                                />
                                <circle
                                    v-if="s.start > 0"
                                    :cx="xOf(s.start)"
                                    :cy="yOf(valueAt(s.start, s))"
                                    r="2.2"
                                    :fill="COLORS[colorIndex % COLORS.length]"
                                    opacity="0.75"
                                />
                            </template>

                            <!-- 轴 -->
                            <g stroke="currentColor" opacity="0.35">
                                <line :x1="PAD.l" :x2="PAD.l" :y1="PAD.t" :y2="H - PAD.b" />
                                <line :x1="PAD.l" :x2="W - PAD.r" :y1="H - PAD.b" :y2="H - PAD.b" />
                            </g>

                            <!-- 刻度文字 -->
                            <g fill="currentColor" opacity="0.55" font-size="10">
                                <text
                                    v-for="t in chart.yTicks"
                                    :key="`ty${t}`"
                                    :x="PAD.l - 6"
                                    :y="yOf(t) + 3"
                                    text-anchor="end"
                                >
                                    {{ compact(t) }}
                                </text>
                                <text
                                    v-for="t in chart.xTicks"
                                    :key="`tx${t}`"
                                    :x="xOf(t)"
                                    :y="H - PAD.b + 12"
                                    text-anchor="middle"
                                >
                                    {{ compact(t) }}
                                </text>
                                <text :x="W - PAD.r" :y="H - 2" text-anchor="end" opacity="0.8">
                                    {{ chart.xLabel }}
                                </text>
                            </g>

                            <!-- hover：竖线 + 各线交点 -->
                            <g v-if="hover">
                                <line
                                    :x1="xOf(hover.x)"
                                    :x2="xOf(hover.x)"
                                    :y1="PAD.t"
                                    :y2="H - PAD.b"
                                    stroke="currentColor"
                                    stroke-width="1"
                                    stroke-dasharray="3 3"
                                    opacity="0.6"
                                />
                                <circle
                                    v-for="(p, i) in hover.points"
                                    :key="`h${i}`"
                                    :cx="xOf(hover.x)"
                                    :cy="yOf(p.y)"
                                    r="2.6"
                                    :fill="COLORS[p.colorIndex % COLORS.length]"
                                />
                            </g>
                        </svg>

                        <!-- 提示框：能力值 + 各等级效果值与增量 -->
                        <div
                            v-if="hover"
                            class="pointer-events-none absolute top-0 rounded bg-black/85 px-2 py-1 text-xs leading-5 whitespace-nowrap"
                            :style="{
                                left: `${hover.leftPct}%`,
                                transform: hover.leftPct > 60 ? 'translateX(-100%)' : 'translateX(6px)',
                            }"
                        >
                            <div class="opacity-80 mb-1">{{ hoverHead }}</div>
                            <div v-if="dualAvailable" class="opacity-50 mb-1">{{ clickHint }}</div>
                            <!-- 4 列定宽：等级 / 效果量 / 变化值 / 每消耗值 -->
                            <div
                                class="grid grid-cols-[4.5rem_4.5rem_4.5rem_5.5rem] gap-x-2 text-right opacity-50"
                            >
                                <span class="text-left">等级</span>
                                <span>效果量</span>
                                <span>变化</span>
                                <span>每消耗</span>
                            </div>
                            <div
                                v-for="(p, i) in hover.points"
                                :key="`t${i}`"
                                class="grid grid-cols-[4.5rem_4.5rem_4.5rem_5.5rem] gap-x-2 items-center"
                            >
                                <span class="flex items-center gap-1 text-left">
                                    <span
                                        class="inline-block w-2 h-2 rounded-full shrink-0"
                                        :style="{ backgroundColor: COLORS[p.colorIndex % COLORS.length] }"
                                    ></span>
                                    <span class="opacity-70">Lv {{ p.level }}</span>
                                </span>
                                <span
                                    class="text-right"
                                    :class="
                                        p.state === 'low'
                                            ? 'text-red-400'
                                            : p.state === 'high'
                                              ? 'text-amber-300'
                                              : 'text-green-400'
                                    "
                                >
                                    {{ fmt(p.y) }}
                                </span>
                                <span class="text-right opacity-50">{{
                                    i > 0 ? '+' + fmt(p.y - hover.points[i - 1].y) : '—'
                                }}</span>
                                <span class="text-right opacity-50">{{
                                    p.perCost != null ? fmt(p.perCost) + '/' + chart.costUnit : '—'
                                }}</span>
                            </div>
                        </div>
                    </div>

                    <!-- 计算口径说明：固定值 / 双属性 / 锁定值 -->
                    <div v-if="chart.hint" class="mt-1 text-xs opacity-50">{{ chart.hint }}</div>
                </td>
            </tr>
        </tbody>
    </table>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import type { SkillLevel, SkillSubEffect, SubEffectBrief } from './types';

const props = defineProps<{
    /** 当前动作下的等级数据（多动作技能已按页签过滤） */
    levels: SkillLevel[];
    /** 能力值 id → 名称（复用 SkillDetail 的 REFERENCE_PARAM） */
    paramLabels?: Record<number, string>;
}>();

const COLORS = ['#7aa2f7', '#73daca', '#e0af68', '#bb9af7', '#9ece6a', '#ff9e64', '#f7768e'];

/** 宽度按容器实际像素走（1:1 坐标，鼠标位置才和绘制位置对得上） */
const W = ref(640);
const H = 320;
const PAD = { l: 46, r: 14, t: 22, b: 28 };

const box = ref<HTMLElement | null>(null);
let observer: ResizeObserver | null = null;

onMounted(() => {
    const el = box.value;
    if (!el) return;
    W.value = Math.round(el.clientWidth || 640);
    observer = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        if (width > 0) W.value = Math.round(width);
    });
    observer.observe(el);
});

onBeforeUnmount(() => observer?.disconnect());

/** 效果值上限的默认"无上限"哨兵 */
const NO_CAP = 10000;

/**
 * HP 回复（kind 1000）：效果量 = 能力值 × 系数 + 参数 1 的固定值。
 * 也可能藏在别的 sub effect 参数里（例 118001010 的 kind 6800 → param_refs）。
 */
const HEAL_KIND = 1000;

/** 顶层 sub effect 与被引用摘要共有的「恢复量计算」字段 */
type HealRow = Pick<
    SkillSubEffect,
    | 'kind'
    | 'calc_reference_parameter'
    | 'calc_reference_parameter_2'
    | 'calc_reference_parameter_rate'
    | 'calc_reference_parameter_rate_2'
    | 'calc_valid_cap_parameter_value'
    | 'calc_valid_start_parameter_value'
> & { params?: Array<number | null> | null };

/**
 * 摊平一层等级里的所有 HP 回复效果：顶层 sub_effects，以及
 * param_refs / child_sub_effects / extension_effects / step_replace 里被引用的摘要。
 */
const healRowsOf = (lv: SkillLevel): HealRow[] => {
    const out: HealRow[] = [];
    const brief = (b: SubEffectBrief) => {
        out.push(b);
        for (const child of b.children ?? []) out.push(child);
    };
    for (const s of lv.sub_effects ?? []) {
        out.push(s);
        for (const ref of Object.values(s.param_refs ?? {})) if (ref) brief(ref);
        for (const child of s.child_sub_effects ?? []) brief(child);
        for (const ext of s.extension_effects ?? []) brief(ext);
        for (const step of s.step_replace ?? []) for (const e of step.effects ?? []) out.push(e);
    }
    return out.filter((r) => r.kind === HEAL_KIND);
};

interface SeriesIn {
    level: number;
    /** 当前 X 轴属性的百分比系数 */
    rate: number;
    /** 另一属性的百分比系数（锁定该属性时按它折算） */
    rate2: number;
    addRate: number;
    /** 数据里的固定值：伤害的 fixed_damage / HP 回复的参数 1 */
    fixed: number;
    /** 被锁定属性按本级阈值折算后的固定贡献 */
    lockedAdd: number;
    start: number;
    cap: number;
    /** 该等级的消耗，用于 tooltip 里的「每消耗效果量」 */
    cost: number;
}

interface SeriesOut extends SeriesIn {
    points: string;
}

interface ChartData {
    title: string;
    xLabel: string;
    xMin: number;
    xMax: number;
    yMax: number;
    xTicks: number[];
    yTicks: number[];
    /** 各级阈值（同一数值只画一条线；levels 是来源等级，供等级开关过滤） */
    vlines: Array<{ value: number; label: string; kind: 'start' | 'cap'; dy: number; levels: number[] }>;
    /** 未计入图表的次要因素说明（双属性等） */
    hint: string;
    /** 消耗单位：1 SP / 2 MP */
    costUnit: 'SP' | 'MP';
    series: SeriesOut[];
}

const compact = (value: number) => {
    if (Math.abs(value) >= 10000) return `${Math.round(value / 100) / 10}万`;
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
};

const fmt = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(1));

/** 取一个"好看"的刻度间隔 */
const niceStep = (raw: number) => {
    if (!Number.isFinite(raw) || raw <= 0) return 1;
    const exp = Math.floor(Math.log10(raw));
    const base = Math.pow(10, exp);
    const n = raw / base;
    const mult = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return mult * base;
};

/** 阈值补正后的有效能力值：低于下限整个能力值只算 75%，超过上限的部分只算 50% */
const effective = (x: number, s: SeriesIn) => {
    if (s.start > 0 && x < s.start) return x * 0.75;
    if (s.cap < NO_CAP && x > s.cap) return s.cap + (x - s.cap) * 0.5;
    return x;
};

const valueAt = (x: number, s: SeriesIn) =>
    (effective(x, s) * s.rate) / 100 * (s.addRate / 100) + s.lockedAdd + s.fixed;

/** 纯坐标换算（图表计算过程中使用，不读 chart 本身以免循环依赖） */
const xPos = (x: number, xMax: number) => PAD.l + (x / (xMax || 1)) * (W.value - PAD.l - PAD.r);
const yPos = (y: number, yMax: number) => H - PAD.b - (y / (yMax || 1)) * (H - PAD.t - PAD.b);

/** 单手 / 双手：装备双手武器时倍率与阈值都是另一套（attack_rate_both_hands / valid_cap_*_both_hands） */
const mode = ref<'one' | 'two'>('one');

/** 双属性：选第 1 / 第 2 个参照能力值作为 X 轴 */
const xSel = ref<0 | 1>(0);

/** 每级摊平后的治疗行（含被引用的嵌套 sub effect） */
const healRowsByLevel = computed(() => (props.levels ?? []).map(healRowsOf));

/** 只要任一级有双手倍率，就允许切换 */
const twoHandAvailable = computed(() =>
    (props.levels ?? []).some((lv) => (lv.damage ?? []).some((d) => (d.attack_rate_both_hands ?? 0) > 0)),
);

/** 双属性治疗：calc_reference_parameter(_2) 与 rate(_2) 都有值（解码后缺省是 0 / null） */
const dualHealAvailable = computed(() =>
    healRowsByLevel.value.some((rows) =>
        rows.some(
            (s) =>
                (s.calc_reference_parameter_2 ?? 0) > 0 &&
                (s.calc_reference_parameter_rate_2 ?? 0) > 0,
        ),
    ),
);

/**
 * 双属性伤害：``reference_parameter`` / ``reference_parameter_2`` 都有值。
 * 注意伤害表里没有第二个威力系数，两属性共用 ``attack_rate`` 与同一套阈值。
 */
const dualDamageAvailable = computed(() =>
    (props.levels ?? []).some((lv) =>
        (lv.damage ?? []).some(
            (d) => (d.reference_parameter ?? 0) > 0 && (d.reference_parameter_2 ?? 0) > 0,
        ),
    ),
);

/** 图表优先画伤害；有伤害行时，双属性只认伤害行，避免附带的治疗子效果干扰 */
const hasDamageRow = computed(() =>
    (props.levels ?? []).some((lv) =>
        (lv.damage ?? []).some(
            (d) =>
                (d.reference_parameter ?? 0) > 0 &&
                ((d.attack_rate ?? 0) > 0 ||
                    (d.attack_rate_both_hands ?? 0) > 0 ||
                    (d.fixed_damage ?? 0) > 0),
        ),
    ),
);

const dualAvailable = computed(() =>
    hasDamageRow.value ? dualDamageAvailable.value : dualHealAvailable.value,
);

const handOptions = [
    { value: 'one' as const, label: '单手' },
    { value: 'two' as const, label: '双手' },
];

/** 双属性时两个选项的名字（神力 / 魔力 …）；嵌套治疗行也要算进去 */
const paramOptions = computed(() => {
    let first = 0;
    let second = 0;
    (props.levels ?? []).forEach((lv, index) => {
        if (hasDamageRow.value) {
            for (const d of lv.damage ?? []) {
                if (!first && d.reference_parameter) first = d.reference_parameter;
                if (!second && d.reference_parameter_2) second = d.reference_parameter_2;
            }
        } else {
            for (const s of healRowsByLevel.value[index] ?? []) {
                if (!first && s.calc_reference_parameter) first = s.calc_reference_parameter;
                if (!second && s.calc_reference_parameter_2) second = s.calc_reference_parameter_2;
            }
        }
    });
    return [
        { value: 0 as const, label: props.paramLabels?.[first] ?? '主属性' },
        { value: 1 as const, label: props.paramLabels?.[second] ?? '副属性' },
    ];
});

/** 左击图表固定当前 X 轴属性的数值，然后自动切到另一属性页 */
const locked = ref<{ param: 0 | 1; value: number } | null>(null);

/** 鼠标悬停在「(锁定)」标签上，显示只算该属性的效果量 */
const lockTip = ref(false);

const lockedLabel = computed(() =>
    locked.value ? (paramOptions.value[locked.value.param]?.label ?? '属性') : '',
);

// 锁定值一变（点击图表 / 手动换页 / 换技能），标签浮层先收起来
watch(locked, () => {
    lockTip.value = false;
});

const clearLock = () => {
    locked.value = null;
    lockTip.value = false;
};

const setMode = (value: 'one' | 'two') => {
    mode.value = value;
};

/** 手动换页取消锁定；点击图表引起的自动换页不走这里 */
const setXSel = (value: 0 | 1) => {
    if (value !== xSel.value) locked.value = null;
    xSel.value = value;
};

// 换技能 / 换动作后回到默认视图，避免上一个技能的状态带过来
watch(
    () => props.levels,
    () => {
        mode.value = 'one';
        xSel.value = 0;
        locked.value = null;
    },
);

const chart = computed<ChartData | null>(() => {
    const list = props.levels ?? [];
    if (!list.length) return null;

    const twoHand = mode.value === 'two';
    const second = xSel.value === 1;
    // 只认当前图表的数据源，避免伤害技能附带的治疗子效果误触发锁定
    const lock = dualAvailable.value ? locked.value : null;
    const lockedName = lock ? (paramOptions.value[lock.param]?.label ?? '属性') : '';
    let title = twoHand ? '技能伤害（双手）' : '技能伤害';
    let xLabel = '能力值';
    let raw: SeriesIn[] = [];
    let dualNote = '';
    let hasFixedDamage = false;
    let hasFixedHeal = false;

    // 优先：伤害行（attack_rate × 参照能力值 + fixed_damage）
    for (const lv of list) {
        const dmgRows = lv.damage ?? [];
        const dmg = dmgRows.find((d) => {
            const rate = twoHand ? d.attack_rate_both_hands : d.attack_rate;
            // 纯固定值伤害（attack_rate 为 0）也要画成水平线
            return (d.reference_parameter ?? 0) > 0 && ((rate ?? 0) > 0 || (d.fixed_damage ?? 0) > 0);
        });
        if (!dmg) continue;
        const rate = (twoHand ? dmg.attack_rate_both_hands : dmg.attack_rate) ?? 0;
        // 多段 / 追加伤害行的固定伤害一并计入，避免只画首行时漏掉
        const fixed = dmgRows.reduce((sum, d) => sum + (d.fixed_damage ?? 0), 0);
        if (fixed > 0) hasFixedDamage = true;
        raw.push({
            level: lv.level,
            rate,
            // 伤害表没有第二套倍率：两属性共用 attack_rate
            rate2: rate,
            addRate: dmg.add_damage_rate ?? 100,
            fixed,
            lockedAdd: 0,
            cost: lv.cost ?? 0,
            start: dmg.valid_start_parameter_value ?? 0,
            cap:
                (twoHand ? dmg.valid_cap_parameter_value_both_hands : dmg.valid_cap_parameter_value) ??
                NO_CAP,
        });
        const ref =
            second && (dmg.reference_parameter_2 ?? 0) > 0
                ? dmg.reference_parameter_2
                : dmg.reference_parameter;
        xLabel = props.paramLabels?.[ref ?? 0] ?? xLabel;
        if ((dmg.reference_parameter_2 ?? 0) > 0) {
            const otherRef = (second ? dmg.reference_parameter : dmg.reference_parameter_2) ?? 0;
            const other = props.paramLabels?.[otherRef] ?? `#${otherRef}`;
            dualNote = lock
                ? '两属性共用同一威力系数，分别按阈值折算后相加'
                : `两属性共用同一威力系数与阈值，另一属性「${other}」按 0 计算；点击图表可固定当前属性值`;
        }
    }

    // 伤害为空时退回治疗：HP 回复（kind 1000）= 能力值 × 系数 + 参数 1 的固定值，含嵌套引用
    if (!raw.length) {
        title = second ? '恢复量（副属性）' : '恢复量';
        list.forEach((lv, index) => {
            const sub = (healRowsByLevel.value[index] ?? []).find((s) => {
                const ref = second ? s.calc_reference_parameter_2 : s.calc_reference_parameter;
                const rate = second ? s.calc_reference_parameter_rate_2 : s.calc_reference_parameter_rate;
                return (ref ?? 0) > 0 && (rate ?? 0) > 0;
            });
            if (!sub) return;
            const fixed = Number(sub.params?.[0] ?? 0) || 0;
            if (fixed > 0) hasFixedHeal = true;
            const ref = (second ? sub.calc_reference_parameter_2 : sub.calc_reference_parameter) ?? 0;
            raw.push({
                level: lv.level,
                rate: (second ? sub.calc_reference_parameter_rate_2 : sub.calc_reference_parameter_rate) ?? 0,
                rate2: (second ? sub.calc_reference_parameter_rate : sub.calc_reference_parameter_rate_2) ?? 0,
                addRate: 100,
                fixed,
                lockedAdd: 0,
                cost: lv.cost ?? 0,
                start: sub.calc_valid_start_parameter_value ?? 0,
                cap: sub.calc_valid_cap_parameter_value ?? NO_CAP,
            });
            xLabel = props.paramLabels?.[ref] ?? xLabel;
            if ((sub.calc_reference_parameter_2 ?? 0) > 0) {
                const otherRef = (second ? sub.calc_reference_parameter : sub.calc_reference_parameter_2) ?? 0;
                const other = props.paramLabels?.[otherRef] ?? `#${otherRef}`;
                dualNote = lock
                    ? '两属性分别按阈值折算后相加'
                    : `另一属性「${other}」按 0 计算；点击图表可固定当前属性值`;
            }
        });
    }

    if (!raw.length) return null;
    raw = raw.sort((a, b) => a.level - b.level);

    // 锁定的另一属性按本级阈值折算后作为常数叠加；两属性贡献相加
    if (lock) {
        for (const s of raw) {
            const lockedRate = lock.param === xSel.value ? s.rate : s.rate2;
            s.lockedAdd = ((effective(lock.value, s) * lockedRate) / 100) * (s.addRate / 100);
        }
    }
    const notes: string[] = [];
    if (lock) {
        notes.push(`已固定「${lockedName}」= ${compact(lock.value)}，再次点击图表可改为固定另一属性`);
    }
    if (dualNote) notes.push(dualNote);
    if (hasFixedDamage) notes.push('各级伤害行的 fixed_damage 已合计计入曲线');
    if (hasFixedHeal) notes.push('HP 回复参数 1 的固定值已计入曲线');
    const hint = notes.join('；');

    const costKind = list.find((lv) => lv.cost_kind != null)?.cost_kind;
    const costUnit: 'SP' | 'MP' = costKind === 2 ? 'MP' : 'SP';

    // X 轴：覆盖所有阈值，并留出超过上限后的一小段
    const caps = raw.map((s) => s.cap).filter((c) => c < NO_CAP);
    const far = Math.max(...caps, 0);
    // 至少画到 800，超过上限时再往外多留一段（对应阈值的折点不会被挤到最左边）
    const xMax = Math.max(800, Math.round((far > 0 ? far * 1.35 : 800) / 100) * 100);
    const xStep = niceStep(xMax / 4);
    const xTicks: number[] = [];
    for (let v = 0; v <= xMax + 1; v += xStep) xTicks.push(v);

    const xPoints = (s: SeriesIn) => {
        const xs = new Set<number>([0, xMax]);
        if (s.start > 0 && s.start < xMax) xs.add(s.start);
        if (s.cap < NO_CAP && s.cap < xMax) xs.add(s.cap);
        return [...xs].sort((a, b) => a - b);
    };

    const yValues = raw.flatMap((s) => xPoints(s).map((x) => valueAt(x, s)));
    const yRaw = Math.max(1, ...yValues) * 1.08;
    const yStep = niceStep(yRaw / 4);
    const yMax = Math.ceil(yRaw / yStep) * yStep;
    const yTicks: number[] = [];
    for (let v = 0; v <= yMax + 0.001; v += yStep) yTicks.push(v);

    // 阈值逐级不同：把每级的上下限都标出来，同值只画一条线
    const capSet = new Set(
        raw.map((s) => s.cap).filter((c) => c > 0 && c < NO_CAP && c < xMax),
    );
    const startSet = new Set(raw.map((s) => s.start).filter((v) => v > 0 && v < xMax));
    const lineLevels = new Map<number, number[]>();
    for (const s of raw) {
        for (const v of [s.start, s.cap]) {
            if (v > 0 && v < NO_CAP && v < xMax) {
                const levels = lineLevels.get(v) ?? [];
                levels.push(s.level);
                lineLevels.set(v, levels);
            }
        }
    }
    const vlines = [...new Set([...capSet, ...startSet])]
        .sort((a, b) => a - b)
        .map((value, index) => ({
            value,
            kind: capSet.has(value) ? ('cap' as const) : ('start' as const),
            label: compact(value),
            levels: lineLevels.get(value) ?? [],
            // 相邻阈值可能只差 20，标签上下错开才读得清
            dy: index % 2 === 0 ? 9 : 19,
        }));

    return {
        title,
        xLabel,
        xMin: 0,
        xMax,
        yMax,
        xTicks,
        yTicks,
        vlines,
        hint,
        costUnit,
        series: raw.map((s) => ({
            ...s,
            points: xPoints(s)
                .map((x) => `${xPos(x, xMax)},${yPos(valueAt(x, s), yMax)}`)
                .join(' '),
        })),
    };
});

/** 模板用：按当前图表范围换算 */
const xOf = (x: number) => xPos(x, chart.value?.xMax ?? 1000);
const yOf = (y: number) => yPos(y, chart.value?.yMax ?? 1);

const hover = ref<{
    x: number;
    leftPct: number;
    /** low = 低于下限（红）/ high = 超过上限（黄）/ ok = 阈值之间（绿） */
    points: Array<{
        level: number;
        /** 原始等级对应的颜色下标（隐藏等级后颜色不串位） */
        colorIndex: number;
        y: number;
        state: 'low' | 'high' | 'ok';
        /** 每消耗效果量 = 效果值 ÷ 该等级消耗；无消耗时为 null */
        perCost: number | null;
    }>;
} | null>(null);

const stateOf = (x: number, s: SeriesIn): 'low' | 'high' | 'ok' => {
    if (s.start > 0 && x < s.start) return 'low';
    if (s.cap < NO_CAP && x > s.cap) return 'high';
    return 'ok';
};

/** 图例开关：被关闭的等级不画曲线、不进 tooltip（坐标轴范围仍按全部等级固定） */
const hiddenLevels = ref<number[]>([]);

const isLevelOn = (level: number) => !hiddenLevels.value.includes(level);

const toggleLevel = (level: number) => {
    const set = new Set(hiddenLevels.value);
    if (set.has(level)) set.delete(level);
    else set.add(level);
    hiddenLevels.value = [...set];
    // 旧 tooltip 行已失效，下次移动鼠标再按可见等级生成
    hover.value = null;
};

/** 可见曲线，附带原始颜色下标；变化值按这个序列的相邻项计算 */
const visibleSeries = computed(() =>
    (chart.value?.series ?? [])
        .map((s, colorIndex) => ({ s, colorIndex }))
        .filter(({ s }) => isLevelOn(s.level)),
);

/** 阈值线只留仍可见等级的；标签按可见序列重新错行 */
const visibleVlines = computed(() =>
    (chart.value?.vlines ?? [])
        .filter((m) => m.levels.length === 0 || m.levels.some(isLevelOn))
        .map((m, index) => ({ ...m, dy: index % 2 === 0 ? 9 : 19 })),
);

/** tooltip 首行：锁定时把「当前属性 + 锁定属性」并列显示 */
const hoverHead = computed(() => {
    const c = chart.value;
    const h = hover.value;
    if (!c || !h) return '';
    const head = `${c.xLabel} ${compact(h.x)}`;
    const lock = dualAvailable.value ? locked.value : null;
    return lock ? `${head} + ${lockedLabel.value} ${compact(lock.value)}(锁定)` : head;
});

/** tooltip 里的操作提示：提示左键可锁定当前 X 轴属性 */
const clickHint = computed(() => {
    const name = chart.value?.xLabel ?? '当前属性';
    return locked.value ? `左键点击可改为锁定 ${name}` : `左键点击可锁定 ${name}`;
});

/**
 * 悬停「(锁定)」标签时的数据：只算被锁定这一个属性（另一属性按 0）。
 * 曲线的常量部分正好 = 该属性贡献 + 数据固定值，直接取用即可。
 */
const lockTipPoints = computed(() => {
    const c = chart.value;
    const lock = dualAvailable.value ? locked.value : null;
    if (!c || !lock) return [];
    return visibleSeries.value.map(({ s, colorIndex }) => {
        const y = s.lockedAdd + s.fixed;
        return {
            level: s.level,
            colorIndex,
            y,
            state: stateOf(lock.value, s),
            perCost: s.cost > 0 ? y / s.cost : null,
        };
    });
});

/** 鼠标 X → 能力值（hover 与点击锁定共用同一套换算） */
const xFromEvent = (event: MouseEvent, c: ChartData): number | null => {
    const svg = event.currentTarget as SVGSVGElement;
    const rect = svg.getBoundingClientRect();
    const px = ((event.clientX - rect.left) / (rect.width || 1)) * W.value;
    if (px < PAD.l || px > W.value - PAD.r) return null;
    const ratio = (px - PAD.l) / (W.value - PAD.l - PAD.r);
    return Math.round((c.xMin + ratio * (c.xMax - c.xMin)) / 5) * 5;
};

const onMove = (event: MouseEvent) => {
    const c = chart.value;
    if (!c) return;
    const x = xFromEvent(event, c);
    if (x == null) {
        hover.value = null;
        return;
    }
    hover.value = {
        x,
        leftPct: (xOf(x) / W.value) * 100,
        points: visibleSeries.value.map(({ s, colorIndex }) => {
            const y = valueAt(x, s);
            return {
                level: s.level,
                colorIndex,
                y,
                state: stateOf(x, s),
                perCost: s.cost > 0 ? y / s.cost : null,
            };
        }),
    };
};

/** 左击固定当前 X 轴属性的数值并切到另一属性页；再次点击则锁定另一属性、切回来 */
const onChartClick = (event: MouseEvent) => {
    const c = chart.value;
    if (!c || !dualAvailable.value) return;
    const x = xFromEvent(event, c);
    if (x == null) return;
    locked.value = { param: xSel.value, value: x };
    xSel.value = xSel.value === 0 ? 1 : 0;
    hover.value = null;
};
</script>
