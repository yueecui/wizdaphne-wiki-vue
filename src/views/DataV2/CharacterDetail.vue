<template>
    <NSpin :show="loading">
        <div
            v-if="data"
            class="p-4 bg-[#312721]! border! border-[#463d38]! rounded md:h-[min(86vh,550px)] md:overflow-y-auto thin-scrollbar"
        >
            <div class="grid grid-cols-1 md:grid-cols-[200px_minmax(0,1fr)] gap-4">
                <!-- 角色卡 + 翻页 -->
                <div class="flex flex-col gap-3 w-full max-w-[360px] mx-auto md:max-w-none md:mx-0">
                    <div>
                        <div class="relative overflow-hidden rounded bg-black/40">
                            <WikiImg v-if="thumb" :imageName="thumb" :isLazy="true" class="block w-full" />
                            <div v-else class="w-full py-8 flex items-center justify-center text-xs opacity-40">
                                无图
                            </div>
                            <div class="absolute right-1 top-1 flex gap-1">
                                <div
                                    v-if="data.style"
                                    class="text-xs text-blue-300 bg-black/70 border! border-solid border-black/40 rounded-sm px-1 py-0.5 shadow"
                                >
                                    SP
                                </div>
                                <div
                                    v-if="data.rarity.id === 300"
                                    class="text-xs text-orange-300 bg-black/70 border! border-solid border-black/40 rounded-sm px-1 py-0.5 shadow"
                                >
                                    传说
                                </div>
                            </div>
                            <div v-if="poolBadge.text" class="absolute right-1 bottom-1 flex gap-1">
                                <div
                                    class="text-xs bg-black/70 border! border-solid border-black/40 rounded-sm px-1 py-0.5 shadow"
                                    :class="poolBadge.color"
                                >
                                    {{ poolBadge.text }}
                                </div>
                            </div>
                            <div class="absolute left-1 bottom-1">
                                <ElementIcon
                                    :element="elementOf(data.attribute.name)"
                                    class="w-6 h-6 drop-shadow-1px"
                                />
                            </div>
                        </div>
                        <div class="bg-black/50 py-1 text-center text-light truncate">{{ data.name }}</div>
                    </div>

                    <!-- 翻页 -->
                    <div class="flex md:flex-col gap-2">
                        <div
                            v-for="item in TABS"
                            :key="item.value"
                            class="flex-1 md:flex-none text-center cursor-pointer select-none px-3 py-1 text-sm rounded border! border-solid"
                            :class="
                                tab === item.value
                                    ? 'bg-black/60 text-light border-light/40 font-bold'
                                    : 'bg-black/20 border-transparent opacity-70 hover:opacity-100'
                            "
                            @click="tab = item.value"
                        >
                            {{ item.label }}
                        </div>
                    </div>

                    <!-- 底部操作 -->
                    <div class="flex flex-col gap-1 mt-1 opacity-70 hover:opacity-100">
                        <NButton size="tiny" secondary block @click="gotoDetail">查看详情页</NButton>
                        <NButton v-if="onClose" size="tiny" quaternary block @click="onClose">关闭</NButton>
                    </div>
                </div>

                <!-- 右侧内容 -->
                <div class="flex flex-col gap-3 min-w-0">
                    <!-- 第一页：基本信息 -->
                    <div v-if="tab === 'basic'" class="grid gap-4 md:grid-cols-[minmax(0,16rem)_minmax(0,1fr)]">
                        <!-- 信息 -->
                        <div>
                            <table class="wikitable my-0! w-full text-center">
                                <tbody>
                                    <tr>
                                        <th colspan="3">信息</th>
                                    </tr>
                                    <tr>
                                        <th class="w-20 md:w-1/3">风格</th>
                                        <td colspan="2" class="md:w-2/3">{{ data.style || '基本' }}</td>
                                    </tr>
                                    <tr>
                                        <th>种族</th>
                                        <td colspan="2">{{ data.race.name }}</td>
                                    </tr>
                                    <tr>
                                        <th>性别</th>
                                        <td colspan="2">{{ data.gender.name }}</td>
                                    </tr>
                                    <tr>
                                        <th>性格</th>
                                        <td colspan="2">{{ data.alignment.name }}</td>
                                    </tr>
                                    <tr>
                                        <th>缘类型</th>
                                        <td colspan="2">{{ fateText }}</td>
                                    </tr>
                                    <tr>
                                        <th class="md:w-1/3">特性</th>
                                        <th colspan="2" class="md:w-2/3">
                                            <div class="flex gap-1 justify-center">
                                                <div>
                                                    1级
                                                    <span class="hidden md:inline!">数值</span>
                                                </div>
                                                <!-- NModal 内的浮层默认挂到 modal 元素上，会被滚动容器的 overflow 裁掉，这里强制挂到 body -->
                                                <NTooltip trigger="hover" to="body">
                                                    <template #trigger>
                                                        <div
                                                            class="hidden md:flex! items-center justify-center gap-1 leading-none"
                                                        >
                                                            <NIcon><QuestionIcon /></NIcon>
                                                        </div>
                                                    </template>
                                                    1级基准特性值是用来对比检查角色的个体情况
                                                    <br />
                                                    <span>
                                                        <span class="bg-red-800/70 font-bold">亮红色背景</span>
                                                        为根据官方数据，该特性个体，确定无法在1级看出
                                                    </span>
                                                    <br />
                                                    <span>
                                                        <span class="bg-violet-800/70 font-bold">亮紫色背景</span>
                                                        为根据官方数据，该特性个体，有一部分无法在1级时看出
                                                    </span>
                                                    <br />
                                                    <span>
                                                        <span class="bg-red-800/30 font-bold">暗红色背景</span>
                                                        为根据其他数据推断，该特性个体，可能无法在1级看出
                                                    </span>
                                                    <br />
                                                    <span>
                                                        <span class="bg-violet-800/30 font-bold">暗紫色背景</span>
                                                        为根据其他数据推断，该特性个体，有一部分可能无法在1级时看出
                                                    </span>
                                                    <br />
                                                    具体可参考
                                                    <a href="/wiki/能力值#个体的识别" target="_blank">这里</a>
                                                </NTooltip>
                                            </div>
                                        </th>
                                    </tr>
                                    <tr>
                                        <th class="md:w-1/3">职业</th>
                                        <th :class="hasSubJob ? 'md:w-1/3' : 'md:w-2/3'">
                                            {{ primaryJob?.name ?? '—' }}
                                        </th>
                                        <th v-if="hasSubJob" class="md:w-1/3">{{ subJob?.name }}</th>
                                    </tr>
                                    <tr v-for="row in STAT_ROWS" :key="row.key">
                                        <th class="md:w-1/3">{{ row.label }}</th>
                                        <td :class="[hasSubJob ? 'md:w-1/3' : 'md:w-2/3', mainBg(row.key)]">
                                            {{ levelStat(row.key, primaryJob) }}
                                        </td>
                                        <td v-if="hasSubJob" :class="['md:w-1/3', staticBg(subJob, row.key)]">
                                            {{ levelStat(row.key, subJob) }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                            <div v-if="showRateButton" class="mt-2 flex items-center justify-center">
                                <NButton size="tiny" @click="rateModal = true">查看个体概率</NButton>
                            </div>
                        </div>

                        <!-- 技能 -->
                        <div>
                            <table class="wikitable my-0! w-full">
                                <tbody>
                                    <template v-for="group in skillGroups" :key="group.label">
                                        <template v-for="s in group.skills" :key="`${group.label}-${s.identification}`">
                                            <tr>
                                                <th class="text-center">
                                                    {{ group.label }}
                                                    <WikiImg
                                                        v-if="group.label === '潜在继承技能'"
                                                        imageName="icon_RareSkills.png"
                                                        class="w-5 h-5 inline-block align-middle"
                                                    />
                                                    <span
                                                        v-if="group.label === '潜在继承技能' && data.potential_grade"
                                                        class="text-xs opacity-60"
                                                    >
                                                        (Lv{{ data.potential_grade }} 解锁)
                                                    </span>
                                                </th>
                                            </tr>
                                            <tr>
                                                <td>
                                                    <div class="p-2">
                                                        <div
                                                            class="text-light pb-0.5 border-b! mb-2 relative cursor-pointer hover:opacity-80"
                                                            @click="openSkill(s.identification)"
                                                        >
                                                            {{ s.name }}
                                                            <span v-if="s.level" class="text-xs opacity-60">
                                                                Lv{{ s.level }}
                                                            </span>
                                                        </div>
                                                        <div class="whitespace-pre-line">
                                                            {{ descOf(s.identification) }}
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </template>
                                    </template>
                                    <tr v-if="!skillGroups.length">
                                        <td class="text-center py-2 opacity-40">—</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 第二页：特性/能力值 -->
                    <div v-else class="flex flex-col gap-3">
                        <!-- 参数 -->
                        <div class="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm">
                            <div class="flex items-center gap-1.5 h-8">
                                <span class="shrink-0">等级</span>
                                <NSlider
                                    class="w-20!"
                                    :value="calcLevel"
                                    :min="CALC_LEVEL_MIN"
                                    :max="CALC_LEVEL_MAX"
                                    :step="1"
                                    @update:value="onSlide"
                                />
                                <NInputNumber
                                    size="small"
                                    class="w-12!"
                                    :value="calcLevel"
                                    :min="CALC_LEVEL_MIN"
                                    :max="CALC_LEVEL_MAX"
                                    :show-button="false"
                                    @update:value="setCalcLevel"
                                />
                            </div>
                            <div class="flex items-center gap-1.5 h-8">
                                <span class="shrink-0">阶级</span>
                                <NSelect
                                    size="small"
                                    class="w-28!"
                                    :value="calcGrade"
                                    :options="gradeOptions"
                                    :consistent-menu-width="false"
                                    @update:value="setGrade"
                                />
                            </div>
                            <div class="flex items-center gap-1.5 h-8">
                                <span class="shrink-0">个体</span>
                                <NSelect
                                    size="small"
                                    class="w-24!"
                                    :value="calcIndividual"
                                    :options="individualOptions"
                                    :consistent-menu-width="false"
                                    @update:value="setIndividual"
                                />
                            </div>
                            <div class="flex items-center gap-1.5 h-8">
                                <span class="shrink-0">意志力</span>
                                <NSelect
                                    size="small"
                                    class="w-20!"
                                    :value="calcMental"
                                    :options="mentalOptions"
                                    :consistent-menu-width="false"
                                    @update:value="setMental"
                                />
                            </div>
                            <div v-if="hasDiscipline" class="flex items-center gap-1.5 h-8">
                                <span class="shrink-0">克己</span>
                                <NSelect
                                    size="small"
                                    class="w-20!"
                                    :value="disciplineLevel"
                                    :options="disciplineOptions"
                                    :consistent-menu-width="false"
                                    @update:value="setDisciplineLevel"
                                />
                            </div>
                            <div v-if="hasSubJob" class="flex items-center gap-1.5 h-8">
                                <span class="shrink-0">职业</span>
                                <NSelect
                                    size="small"
                                    class="w-20!"
                                    :value="calcJob?.id ?? null"
                                    :options="calcJobOptions"
                                    :consistent-menu-width="false"
                                    @update:value="setCalcJob"
                                />
                            </div>
                        </div>

                        <!-- 数值表 -->
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <table class="wikitable my-0! w-full text-center text-sm">
                                    <thead>
                                        <tr>
                                            <th class="md:w-[5em]">特性</th>
                                            <th>成长率</th>
                                            <th class="md:w-[7em]">特性值</th>
                                            <th class="md:w-[6em]">修正值</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="row in calcRows" :key="row.key">
                                            <th
                                                class="whitespace-nowrap"
                                                :class="row.individual ? 'text-orange-300' : ''"
                                            >
                                                {{ row.label }}
                                            </th>
                                            <td class="whitespace-nowrap opacity-80">{{ row.growthText }}</td>
                                            <td
                                                class="whitespace-nowrap"
                                                :class="row.individual ? 'text-orange-300' : ''"
                                            >
                                                {{ row.rangeText }}
                                                <span v-if="row.discipline" class="opacity-60">
                                                    (+{{ row.discipline }})
                                                </span>
                                            </td>
                                            <td>
                                                <div class="bonus-cell">
                                                    <NInputNumber
                                                        size="tiny"
                                                        class="w-14!"
                                                        :value="bonus[row.key]"
                                                        :min="0"
                                                        :show-button="false"
                                                        placeholder="0"
                                                        @update:value="(v: number | null) => setBonus(row.key, v)"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                                <div class="text-xs opacity-60 mt-2">
                                    所有特性值、能力值均不包含任何被动技能、装备等效果，克己技能除外：按上方的克己等级叠加，
                                    括号内为克己部分
                                </div>
                            </div>

                            <!-- 能力值 -->
                            <div class="flex flex-col gap-4">
                                <div class="grid grid-cols-2 gap-2">
                                    <table class="wikitable my-0! w-full table-fixed text-center text-sm">
                                        <colgroup>
                                            <col class="w-[50%]" />
                                            <col />
                                        </colgroup>
                                        <thead>
                                            <tr>
                                                <th>能力值</th>
                                                <th>数值</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="row in abilityTopLeftRows" :key="row.label">
                                                <th class="whitespace-nowrap">{{ row.label }}</th>
                                                <td class="whitespace-nowrap">{{ row.text }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table class="wikitable my-0! w-full table-fixed text-center text-sm">
                                        <colgroup>
                                            <col class="w-[50%]" />
                                            <col />
                                        </colgroup>
                                        <thead>
                                            <tr>
                                                <th>能力值</th>
                                                <th>数值</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="row in abilityTopRightRows" :key="row.label">
                                                <th class="whitespace-nowrap">{{ row.label }}</th>
                                                <td class="whitespace-nowrap">{{ row.text }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="grid grid-cols-2 gap-2">
                                    <table class="wikitable my-0! w-full table-fixed text-center text-sm">
                                        <colgroup>
                                            <col class="w-[50%]" />
                                            <col />
                                        </colgroup>
                                        <thead>
                                            <tr>
                                                <th>能力值</th>
                                                <th>数值</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="row in abilityBottomLeftRows" :key="row.label">
                                                <th class="whitespace-nowrap">{{ row.label }}</th>
                                                <td class="whitespace-nowrap">{{ row.text }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                    <table class="wikitable my-0! w-full table-fixed text-center text-sm">
                                        <colgroup>
                                            <col class="w-[50%]" />
                                            <col />
                                        </colgroup>
                                        <thead>
                                            <tr>
                                                <th>能力值</th>
                                                <th>数值</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-for="row in abilityBottomRightRows" :key="row.label">
                                                <th class="whitespace-nowrap">{{ row.label }}</th>
                                                <td class="whitespace-nowrap">{{ row.text }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <!-- 克己带来的额外能力值：不在上面两张小表里的（异常耐性等） -->
                                <table
                                    v-if="disciplineExtraRows.length"
                                    class="wikitable my-0! w-full table-fixed text-center text-sm"
                                >
                                    <colgroup>
                                        <col class="w-[50%]" />
                                        <col />
                                    </colgroup>
                                    <thead>
                                        <tr>
                                            <th>克己能力值</th>
                                            <th>数值</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr v-for="row in disciplineExtraRows" :key="row.label">
                                            <th class="whitespace-nowrap">{{ row.label }}</th>
                                            <td class="whitespace-nowrap">+{{ row.value }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <NEmpty v-else-if="!loading" description="加载失败" />

        <!-- 概率查看模态框 -->
        <NModal v-model:show="rateModal">
            <div class="w-[90%] md:h-auto md:w-[400px] m-auto huiji-css-hook bg-transparent!">
                <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
                    <div class="flex justify-between items-center">
                        <div class="text-xl text-light font-bold">角色个体出现几率</div>
                    </div>
                    <p>该角色的个体抽出概率不是均等，具体参考下表</p>
                    <table class="wikitable w-full text-center border-collapse m-0!">
                        <thead>
                            <tr class="border-b!">
                                <th class="p-2 text-left pl-4">属性</th>
                                <th class="p-2 text-left">几率 (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in rateRows" :key="row.key" class="border-b!">
                                <td class="p-2 pl-4">{{ row.name }}</td>
                                <td class="p-2">
                                    <div
                                        :class="
                                            (row.value ?? 0) > 12.5
                                                ? 'text-green-500 font-bold'
                                                : (row.value ?? 0) < 12.5
                                                  ? 'text-red-500 font-bold'
                                                  : ''
                                        "
                                    >
                                        {{ row.value ?? 0 }}%
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="flex justify-center">
                        <NButton size="tiny" type="warning" class="mt-0" @click="rateModal = false">关闭</NButton>
                    </div>
                </div>
            </div>
        </NModal>

        <SkillModal v-model:show="modal" :identification="skillId" />
    </NSpin>
</template>

<script setup lang="ts">
import { QuestionCircle as QuestionIcon } from '@vicons/fa';
import { NButton, NEmpty, NIcon, NInputNumber, NModal, NSelect, NSlider, NSpin, NTooltip } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import ElementIcon from '../../components/ElementIcon.vue';
import WikiImg from '../../components/huiji/WikiImg.vue';
import type { RawCharacterRate } from '../../stores/wikiData';
import { ELEMENT_TYPE } from '../DataSearcher/data/enum';
import SkillModal from './SkillModal.vue';
import { useDataV2Store } from './dataV2Store';
import type { CharacterDetail, JobRef, SkillRef, StatKey } from './types';

defineOptions({ name: '角色详情V2' });

const props = defineProps<{ id: number; onClose?: () => void }>();
const store = useDataV2Store();

const data = ref<CharacterDetail | null>(null);
const loading = ref(false);

const rateModal = ref(false);

const modal = ref(false);
const skillId = ref<number | null>(null);
const openSkill = (identification: number) => {
    skillId.value = identification;
    modal.value = true;
};

/** 属性行，顺序沿用 V1（力量 / 智慧 / 信仰心 / 生命力 / 灵巧 / 敏捷 / 幸运） */
const STAT_ROWS: Array<{ key: StatKey; label: string }> = [
    { key: 'str', label: '力量' },
    { key: 'int', label: '智慧' },
    { key: 'pie', label: '信仰心' },
    { key: 'vit', label: '生命力' },
    { key: 'dex', label: '灵巧' },
    { key: 'agi', label: '敏捷' },
    { key: 'luk', label: '幸运' },
];

/** ``StatKey`` -> 个体几率里的属性系数（V1 的 STAT_KEY_MAP，命名不同） */
const RATE_KEY: Record<StatKey, keyof RawCharacterRate> = {
    str: 'str',
    int: 'iq',
    pie: 'pie',
    vit: 'vit',
    dex: 'dex',
    agi: 'spe',
    luk: 'luck',
};

/** 卡片小图：wiki 上为 `thumbnail` + `_s`，首字母大写（例如 Tmb_chara_01001_00_02_s.png） */
const thumb = computed(() => {
    const stem = data.value?.images?.thumbnail;
    if (!stem) return null;
    return `${stem.charAt(0).toUpperCase()}${stem.slice(1)}_s.png`;
});

const rate = computed(() => store.characterRate(props.id));

const rateRows = computed(() => {
    const r = rate.value;
    if (!r) return [];
    return [
        { name: '力', value: r.rstr, key: 'rstr' },
        { name: '智慧', value: r.riq, key: 'riq' },
        { name: '信仰心', value: r.rpie, key: 'rpie' },
        { name: '生命力', value: r.rvit, key: 'rvit' },
        { name: '敏捷', value: r.rspe, key: 'rspe' },
        { name: '灵巧', value: r.rdex, key: 'rdex' },
        { name: '运', value: r.rluck, key: 'rluck' },
        { name: '无', value: r.rbase, key: 'rbase' },
    ].filter((row) => typeof row.value === 'number');
});

/** 概率全部是 12.5（均等）时不显示按钮 */
const showRateButton = computed(() => rateRows.value.some((row) => row.value !== 12.5));

const primaryJob = computed<JobRef | null>(
    () => data.value?.jobs.find((job) => job.primary) ?? data.value?.jobs[0] ?? null,
);
const subJob = computed<JobRef | null>(() => {
    const jobs = data.value?.jobs ?? [];
    if (jobs.length < 2) return null;
    return jobs.find((job) => job !== primaryJob.value) ?? null;
});
const hasSubJob = computed(() => subJob.value !== null);

const fateText = computed(() => {
    const fate = data.value?.fate;
    if (!fate) return '—';
    return fate.type ?? fate.name ?? '—';
});

const elementOf = (name?: string | null) => (name ?? '') as ELEMENT_TYPE;

/** 卡池组标记：-1 限定 / -2 联动 / 1 Ⅰ组 / 2 Ⅱ组（0 共用不显示） */
const POOL_BADGE: Record<string, { text: string; color: string }> = {
    '-1': { text: '限', color: 'text-orange-300' },
    '-2': { text: '联动', color: 'text-orange-300' },
    '1': { text: 'Ⅰ', color: 'text-green-300' },
    '2': { text: 'Ⅱ', color: 'text-blue-300' },
};

const poolBadge = computed(() => POOL_BADGE[String(data.value?.pool_group ?? 0)] ?? { text: '', color: '' });

/**
 * 1 级数值 = 基础值（种族 + 属性 + 阶级 + 性别 + 职业基础）
 *          + ⌈成长率 × 1⌉。
 *
 * 成长率 = (种族 + 属性 + 职业的 growth 之和) / 100。
 * ``CharacterGrowthRate`` 的 Lv1 行里，被个体成长占用的那一项系数是 2
 * （个体差异，不写进固定数值），所以这里 1 级的等级项统一按 1 计算。
 */
const levelStat = (key: StatKey, job: JobRef | null) => {
    const stats = data.value?.stats;
    const jobDetail = job ? store.jobById.get(job.id) : undefined;
    const base = (stats?.base[key] ?? 0) + (jobDetail?.base[key] ?? 0);
    const growth = (stats?.growth[key] ?? 0) + (jobDetail?.growth?.[key] ?? 0);
    return base + Math.ceil(growth / 100);
};

const STAT_TABLES: Record<string, string> = {
    '矮人-战士-敏捷': 'bg-violet-800/30',
    '矮人-骑士-运': 'bg-violet-800/30',
    '精灵-盗贼-力': 'bg-violet-800/30',
    '精灵-盗贼-生命力': 'bg-violet-800/30',
    '精灵-法师-运': 'bg-violet-800/30',
};

const JOB_STAT_TABLES: Record<string, string> = {
    '战士-智慧': 'bg-red-800/30',
    '战士-信仰心': 'bg-red-800/30',
    '骑士-智慧': 'bg-red-800/30',
    '骑士-敏捷': 'bg-red-800/30',
    '盗贼-智慧': 'bg-red-800/30',
    '盗贼-信仰心': 'bg-red-800/30',
    '法师-力': 'bg-red-800/30',
    '法师-生命力': 'bg-red-800/30',
    '僧侣-敏捷': 'bg-red-800/30',
    '忍者-信仰心': 'bg-red-800/30',
    '游侠-信仰心': 'bg-red-800/30',
};

const labelOf = (key: StatKey) => STAT_ROWS.find((row) => row.key === key)?.label ?? '';

/** 副职业列：按种族 / 职业静态表着色（V1 的 getStatBgColor） */
const staticBg = (job: JobRef | null, key: StatKey) => {
    if (!job?.name) return '';
    const race = data.value?.race.name ?? '';
    const label = labelOf(key);
    return STAT_TABLES[`${race}-${job.name}-${label}`] ?? JOB_STAT_TABLES[`${job.name}-${label}`] ?? '';
};

/** 主职业列：优先按个体几率系数着色（V1 的 getMainBgColor） */
const mainBg = (key: StatKey) => {
    const job = primaryJob.value;
    if (!job) return '';
    const r = rate.value;
    if (!r) return staticBg(job, key);
    const value = r[RATE_KEY[key]];
    if (value === 0) return 'bg-red-800/70';
    if (typeof value === 'number' && value < 1) return 'bg-violet-800/70';
    return '';
};

interface SkillGroup {
    label: string;
    skills: CharacterDetail['skills']['unique'];
}

/**
 * 同名的继承技能有两个版本：角色自己用的（同时出现在 ``unique_skill_ids`` 里，通常更强）
 * 和给其他角色继承用的版本。只保留自己用的那个。
 */
const dedupeInherit = (list: SkillRef[], same: number[], unique: SkillRef[]): SkillRef[] => {
    const uniqueIds = new Set(unique.map((s) => s.identification));
    const rank = (s: SkillRef) => (same.includes(s.identification) ? 2 : uniqueIds.has(s.identification) ? 1 : 0);
    const picked = new Map<string, SkillRef>();
    for (const s of list) {
        const key = s.name ?? `#${s.identification}`;
        const prev = picked.get(key);
        if (!prev || rank(s) > rank(prev)) picked.set(key, s);
    }
    return [...picked.values()];
};

/** 固有技能 / 角色专用技能 / 继承技能 / 潜在继承技能 / 克己技能（V1 的五个分组） */
const skillGroups = computed<SkillGroup[]>(() => {
    const skills = data.value?.skills;
    if (!skills) return [];
    const passive = (identification: number) => store.skillById.get(identification)?.is_passive ?? false;
    // 能继承给别人的技能统一归到「继承技能」，不再在固有 / 角色专用里重复显示一遍
    const inheritIds = new Set(skills.inherit.map((s) => s.identification));
    const own = skills.unique.filter((s) => !inheritIds.has(s.identification));
    const groups: SkillGroup[] = [
        { label: '固有技能', skills: own.filter((s) => passive(s.identification)) },
        { label: '角色专用技能', skills: own.filter((s) => !passive(s.identification)) },
        {
            label: '继承技能',
            skills: dedupeInherit(skills.inherit, skills.same_identifications, skills.unique),
        },
        { label: '潜在继承技能', skills: skills.potential_inherit },
        // 克己各等级的描述相同，只展示一条（与 V1 一致，不显示等级）
        { label: '克己技能', skills: skills.discipline.slice(0, 1).map((s) => ({ ...s, level: undefined })) },
    ];
    return groups.filter((group) => group.skills.length);
});

const descOf = (identification: number) => store.skillById.get(identification)?.description || '技能描述未找到';

const gotoDetail = () => {
    if (!data.value?.name) return;
    window.open(`/wiki/${data.value.name}`, '_blank');
};

/* ------------------------------------------------------------------ */
/* 特性值计算                                                          */
/* ------------------------------------------------------------------ */

type TabKey = 'basic' | 'stats';
const TABS: Array<{ label: string; value: TabKey }> = [
    { label: '基本信息', value: 'basic' },
    { label: '特性/能力值', value: 'stats' },
];
const tab = ref<TabKey>('basic');

const CALC_LEVEL_MIN = 1;
const CALC_LEVEL_MAX = 70;
/** 阶级：上限等级 20 → 70（每档 +10），目前只开到铜阶 */
const GRADE_MAX_LV = [20, 30, 40, 50, 60, 70];
/** 阶级对全部特性值的加成（``CharacterGrade.base_*``） */
const GRADE_BONUS = [0, 1, 2, 3, 4, 6];
/** 个体：在这些等级额外获得 1 级成长 */
const INDIVIDUAL_LEVELS = [1, 11, 30, 40, 50, 60, 70];
/**
 * 个体对成长率的修正：对应特性 +0.04，另两项 −0.02
 * （攻略站「个体也会改变成长率」表）
 */
const INDIVIDUAL_GROWTH: Record<StatKey, Partial<Record<StatKey, number>>> = {
    str: { str: 0.04, int: -0.02, pie: -0.02 },
    int: { int: 0.04, str: -0.02, vit: -0.02 },
    pie: { pie: 0.04, agi: -0.02, dex: -0.02 },
    vit: { vit: 0.04, agi: -0.02, luk: -0.02 },
    agi: { agi: 0.04, str: -0.02, int: -0.02 },
    dex: { dex: 0.04, str: -0.02, pie: -0.02 },
    luk: { luk: 0.04, str: -0.02, vit: -0.02 },
};
/** 意志力只提升成长率上限：90 → +0.01，80 → +0.02 */
const MENTAL_GROWTH_MAX: Record<number, number> = { 100: 0, 90: 0.01, 80: 0.02 };
/** 稀有度对成长率的加成：传说 +0.02，其余不变 */
const RARITY_GROWTH: Record<number, number> = { 100: 0, 200: 0, 300: 0.02 };
/** 每个特性有 4 档成长率，随机部分为 +0.06 ~ +0.09 */
const RANDOM_GROWTH_MIN = 0.06;
const RANDOM_GROWTH_MAX = 0.09;

const calcLevel = ref(CALC_LEVEL_MAX);
const calcJobId = ref<number | null>(null);
const calcGrade = ref<number | 'auto'>('auto');
const calcIndividual = ref<StatKey | 'none'>('none');
const calcMental = ref(100);

const emptyStats = () => ({ str: 0, int: 0, pie: 0, vit: 0, agi: 0, dex: 0, luk: 0 }) as Record<StatKey, number>;
const bonus = ref<Record<StatKey, number>>(emptyStats());

const setCalcLevel = (value: number | null) => {
    const next = Math.round(value ?? CALC_LEVEL_MIN);
    calcLevel.value = Math.min(CALC_LEVEL_MAX, Math.max(CALC_LEVEL_MIN, next));
};

/** NSlider 的 value 可能是区间，这里只取单值 */
const onSlide = (value: number | Array<number> | null) => {
    setCalcLevel(Array.isArray(value) ? (value[0] ?? null) : value);
};

const calcJob = computed<JobRef | null>(
    () => (data.value?.jobs ?? []).find((job) => job.id === calcJobId.value) ?? primaryJob.value,
);
const calcJobOptions = computed(() =>
    (data.value?.jobs ?? []).map((job) => ({ label: job.name ?? `#${job.id}`, value: job.id })),
);
const calcJobDetail = computed(() => {
    const job = calcJob.value;
    return job ? store.jobById.get(job.id) : undefined;
});

/** 等级对应的「自动」阶级：按上限等级逐档提升（20 级自动取铅阶） */
const autoGradeId = (level: number) =>
    Math.min(GRADE_MAX_LV.length, 1 + GRADE_MAX_LV.filter((maxLv) => maxLv <= level).length);

/** 当前等级可选的阶级（上限等级不低于当前等级，最高只到铜阶） */
const gradeOptions = computed(() => {
    const options: Array<{ label: string; value: number | 'auto' }> = [
        {
            label: `自动·${store.grades[autoGradeId(calcLevel.value) - 1]?.name ?? '—'}`,
            value: 'auto',
        },
    ];
    for (const grade of store.grades.slice(0, GRADE_MAX_LV.length)) {
        const maxLv = GRADE_MAX_LV[grade.id - 1] ?? 0;
        if (maxLv >= calcLevel.value) options.push({ label: grade.name ?? `#${grade.id}`, value: grade.id });
    }
    return options;
});

/** 实际生效的阶级 id（手选但已不适用时回退到自动） */
const gradeId = computed(() => {
    const selected = calcGrade.value;
    if (selected === 'auto') return autoGradeId(calcLevel.value);
    const maxLv = GRADE_MAX_LV[selected - 1] ?? 0;
    return maxLv >= calcLevel.value ? selected : autoGradeId(calcLevel.value);
});

const individualOptions = computed(() => [
    { label: '无', value: 'none' },
    ...STAT_ROWS.map((row) => ({ label: row.label, value: row.key as string })),
]);

const mentalOptions = [100, 90, 80].map((value) => ({ label: String(value), value }));

const setGrade = (value: string | number | Array<string | number> | null) => {
    const first = Array.isArray(value) ? value[0] : value;
    calcGrade.value = first === 'auto' || first == null ? 'auto' : Number(first);
};
const setIndividual = (value: string | number | Array<string | number> | null) => {
    const first = Array.isArray(value) ? value[0] : value;
    calcIndividual.value = first === 'none' || first == null ? 'none' : (String(first) as StatKey);
};
const setMental = (value: string | number | Array<string | number> | null) => {
    const first = Array.isArray(value) ? value[0] : value;
    calcMental.value = Number(first ?? 100);
};
const setCalcJob = (value: string | number | Array<string | number> | null) => {
    const first = Array.isArray(value) ? value[0] : value;
    calcJobId.value = first == null ? null : Number(first);
};

/** 修正值：直接加到特性值上，不限点数 */
const setBonus = (key: StatKey, value: number | null) => {
    bonus.value[key] = Math.max(0, Math.round(value ?? 0));
};

/* ------------------------------------------------------------------ */
/* 克己加成（不改清洗数据，全部按 `skills.discipline` 的等级行现算）      */
/* ------------------------------------------------------------------ */

/** 克己等级 0~9；0 = 不计算克己加成 */
const disciplineLevel = ref(0);
const DISCIPLINE_LEVEL_MAX = 9;
const disciplineOptions = Array.from({ length: DISCIPLINE_LEVEL_MAX + 1 }, (_, index) => ({
    label: String(index),
    value: index,
}));

/**
 * 克己技能里出现的效果种类 → 能力值名称（硬编码）。
 * 口径：105 个角色、95 个克己技能、level 1~9 的全部 sub effect，共 27 种 kind。
 * 表里没有的种类（异常耐性等）走「额外能力值」表。
 */
const DISCIPLINE_ABILITY_KIND: Record<number, string> = {
    5010: 'HP',
    5020: 'MP',
    5030: 'SP',
    5040: '攻击力',
    5050: '魔力',
    5060: '神力',
    5070: '防御力',
    5080: '法术防御力',
    5090: '命中',
    5100: '回避',
    5110: '抵抗',
    5140: '会心',
    5160: '行动速度',
    5170: '探知',
    5180: '陷阱解除',
    5190: '陷阱回避',
};

/** 克己里提升「特性值」的种类：常時PIEアップ → 信仰心（会继续影响神力 / 法术防御 / 抵抗 / MP） */
const DISCIPLINE_STAT_KIND: Record<number, StatKey> = { 8120: 'pie' };

/** 额外能力值（异常耐性等）的显示名；表里没有的回退成 wiki 上的效果名 */
const DISCIPLINE_EXTRA_LABEL: Record<number, string> = {
    5300: '毒耐性',
    5320: '睡眠耐性',
    5330: '气绝耐性',
    5340: '麻痹耐性',
    5350: '诅咒耐性',
    5370: '封印耐性',
    5380: '恐惧耐性',
    5390: '混乱耐性',
    5400: '魅惑耐性',
    5430: '暴击耐性',
};

/** 角色自带的克己技能（`skills.discipline` 第一条；各等级描述相同） */
const disciplineSkill = computed(() => {
    const first = data.value?.skills.discipline?.[0];
    return first ? (store.skillById.get(first.identification) ?? null) : null;
});

const hasDiscipline = computed(() => Boolean(disciplineSkill.value));

/** 当前克己等级的 sub effect 汇总：kind → 数值（同种类叠加） */
const disciplineKindValues = computed(() => {
    const map = new Map<number, number>();
    const level = disciplineLevel.value;
    if (level <= 0) return map;
    const row = disciplineSkill.value?.levels.find((item) => item.level === level);
    for (const sub of row?.sub_effects ?? []) {
        if (sub.kind == null) continue;
        const value = sub.params?.[0] ?? 0;
        if (!value) continue;
        map.set(sub.kind, (map.get(sub.kind) ?? 0) + value);
    }
    return map;
});

/** 特性值加成（信仰心等），参与能力值计算 */
const disciplineStatBonus = computed(() => {
    const out: Partial<Record<StatKey, number>> = {};
    for (const [kind, value] of disciplineKindValues.value) {
        const key = DISCIPLINE_STAT_KIND[kind];
        if (key) out[key] = (out[key] ?? 0) + value;
    }
    return out;
});

/** 能力值加成：能力值名 → 数值（特性加成已经在 calcRows 里算过，不重复） */
const disciplineAbilityBonus = computed(() => {
    const out = new Map<string, number>();
    for (const [kind, value] of disciplineKindValues.value) {
        const label = DISCIPLINE_ABILITY_KIND[kind];
        if (label) out.set(label, (out.get(label) ?? 0) + value);
    }
    return out;
});

/** 不在能力值小表里的加成（异常耐性等） */
const disciplineExtraRows = computed(() => {
    const rows: Array<{ label: string; value: number }> = [];
    for (const [kind, value] of disciplineKindValues.value) {
        if (DISCIPLINE_ABILITY_KIND[kind] || DISCIPLINE_STAT_KIND[kind]) continue;
        const label =
            DISCIPLINE_EXTRA_LABEL[kind] ?? store.effectKinds[String(kind)]?.name ?? `效果 #${kind}`;
        rows.push({ label, value });
    }
    return rows.sort((a, b) => a.label.localeCompare(b.label, 'zh-Hans-CN'));
});

const setDisciplineLevel = (value: string | number | Array<string | number> | null) => {
    const first = Array.isArray(value) ? value[0] : value;
    const next = Number(first ?? 0);
    disciplineLevel.value = Math.min(DISCIPLINE_LEVEL_MAX, Math.max(0, Number.isFinite(next) ? next : 0));
};

/** 抹平浮点误差后再向上取整 */
const ceilGrowth = (growth: number, levelItem: number) => Math.ceil(Math.round(growth * levelItem * 1e6) / 1e6);

interface CalcRow {
    key: StatKey;
    label: string;
    individual: boolean;
    growthText: string;
    rangeText: string;
    valueMin: number;
    valueMax: number;
    /** 克己给这一项特性加的点数（已计入特性值，界面上标个 `(+N)`） */
    discipline: number;
}

const calcRows = computed<CalcRow[]>(() => {
    const detail = data.value;
    if (!detail) return [];
    const stats = detail.stats;
    const jobDetail = calcJobDetail.value;
    const gradeBonus = GRADE_BONUS[gradeId.value - 1] ?? 0;
    const rarityBonus = RARITY_GROWTH[detail.rarity.id] ?? 0;
    // 意志力只抬高成长率上限（100 → +0，90 → +0.01，80 → +0.02）
    const mentalMaxBonus = MENTAL_GROWTH_MAX[calcMental.value] ?? 0;
    const individualGrowth: Partial<Record<StatKey, number>> =
        calcIndividual.value === 'none' ? {} : INDIVIDUAL_GROWTH[calcIndividual.value];
    const level = calcLevel.value;
    const extraLevels = INDIVIDUAL_LEVELS.filter((lv) => lv <= level).length;
    const disciplineStats = disciplineStatBonus.value;

    return STAT_ROWS.map((row) => {
        const key = row.key;
        const individual = calcIndividual.value === key;
        const levelItem = level + (individual ? extraLevels : 0);
        const discipline = disciplineStats[key] ?? 0;

        const base =
            (stats.base[key] ?? 0) +
            (jobDetail?.base[key] ?? 0) +
            gradeBonus +
            (bonus.value[key] ?? 0) +
            discipline;
        const growthBase = ((stats.growth[key] ?? 0) + (jobDetail?.growth?.[key] ?? 0)) / 100 + rarityBonus;
        const growthFix = individualGrowth[key] ?? 0;
        const growthMin = growthBase + RANDOM_GROWTH_MIN + growthFix;
        const growthMax = growthBase + RANDOM_GROWTH_MAX + growthFix + mentalMaxBonus;

        const valueMin = base + ceilGrowth(growthMin, levelItem);
        const valueMax = base + ceilGrowth(growthMax, levelItem);

        const growthText =
            growthMin === growthMax ? growthMin.toFixed(2) : `${growthMin.toFixed(2)}~${growthMax.toFixed(2)}`;
        const rangeText = valueMin === valueMax ? String(valueMin) : `${valueMin}~${valueMax}`;

        return {
            key,
            label: row.label,
            individual,
            growthText,
            rangeText,
            valueMin,
            valueMax,
            discipline,
        };
    });
});

/* 能力值 = ⌈ Σ(特性值 × 基本倍率) × 职业倍率 ⌉（会心不乘职业倍率） */
interface AbilityDef {
    label: string;
    parts: Array<[StatKey, number]>;
    /** 职业倍率字段名（Job.multipliers） */
    multiplier?: string;
}

const ABILITY_DEFS: AbilityDef[] = [
    { label: '攻击力', parts: [['str', 1]], multiplier: 'atk' },
    { label: '魔力', parts: [['int', 1]], multiplier: 'mag' },
    { label: '神力', parts: [['pie', 1]], multiplier: 'div' },
    { label: '防御力', parts: [['vit', 1]], multiplier: 'def' },
    { label: '法术防御力', parts: [['pie', 1]], multiplier: 'mdef' },
    { label: '会心', parts: [['dex', 0.2]] },
    {
        label: '探知',
        parts: [
            ['int', 0.7],
            ['luk', 0.3],
        ],
        multiplier: 'det',
    },
    {
        label: '陷阱解除',
        parts: [
            ['dex', 0.7],
            ['luk', 0.3],
        ],
        multiplier: 'dtrap',
    },
    {
        label: '陷阱回避',
        parts: [
            ['agi', 0.7],
            ['luk', 0.3],
        ],
        multiplier: 'etrap',
    },
    { label: '行动速度', parts: [['agi', 1]], multiplier: 'speed' },
    {
        label: '命中',
        parts: [
            ['dex', 0.7],
            ['luk', 0.3],
        ],
        multiplier: 'acc',
    },
    {
        label: '回避',
        parts: [
            ['agi', 0.7],
            ['luk', 0.3],
        ],
        multiplier: 'eva',
    },
    {
        label: '抵抗',
        parts: [
            ['pie', 0.6],
            ['vit', 0.3],
        ],
        multiplier: 'res',
    },
];

/** 抹平浮点误差后向上取整（能力值一律进位） */
const ceilValue = (value: number) => Math.ceil(Math.round(value * 1e6) / 1e6);

const fmtRange = (min: number, max: number) => (min === max ? String(min) : `${min}~${max}`);

const abilityValues = computed<Record<string, string>>(() => {
    const rows = calcRows.value;
    const detail = data.value;
    if (!rows.length || !detail) return {};
    const byKey = new Map(rows.map((row) => [row.key, row]));
    const jobDetail = calcJobDetail.value;
    const multipliers = jobDetail?.multipliers ?? {};
    const out: Record<string, string> = {};

    const statSum = (parts: Array<[StatKey, number]>, pick: (row: CalcRow) => number) =>
        parts.reduce((sum, [key, weight]) => {
            const row = byKey.get(key);
            return sum + (row ? pick(row) * weight : 0);
        }, 0);

    // 常规能力：特性值加权求和 × 职业倍率（会心不乘职业倍率）
    for (const def of ABILITY_DEFS) {
        const rate = def.multiplier ? (multipliers[def.multiplier] ?? 100) / 100 : 1;
        out[def.label] = fmtRange(
            ceilValue(statSum(def.parts, (row) => row.valueMin) * rate),
            ceilValue(statSum(def.parts, (row) => row.valueMax) * rate),
        );
    }

    // HP / MP / SP：基础值 +（1 + 特性值 × 倍率 ÷ 1000）× 成长率 × 等级（× 职业倍率），40~89 级按低 1 级
    const level = calcLevel.value;
    const levelEff = level >= 40 && level <= 89 ? level - 1 : level;
    const poolOf = (key: 'hp' | 'mp' | 'sp') => ({
        base: (detail.stats.pools[key]?.base ?? 0) + (jobDetail?.base?.[key] ?? 0),
        growth: ((detail.stats.pools[key]?.growth ?? 0) + (jobDetail?.growth?.[key] ?? 0)) / 100,
    });
    const poolValue = (base: number, growth: number, stat: number, rate: number) =>
        ceilValue(base + (1 + stat / 1000) * growth * levelEff * rate);

    const hpPool = poolOf('hp');
    const mpPool = poolOf('mp');
    const spPool = poolOf('sp');
    const mpRate = (multipliers.mp ?? 100) / 100;
    const spRate = (multipliers.sp ?? 100) / 100;

    const HP_STAT: Array<[StatKey, number]> = [['vit', 1]];
    const MP_STAT: Array<[StatKey, number]> = [
        ['int', 0.7],
        ['pie', 0.3],
    ];
    const SP_STAT: Array<[StatKey, number]> = [
        ['str', 0.25],
        ['vit', 0.25],
        ['agi', 0.25],
        ['dex', 0.25],
    ];

    out.HP = fmtRange(
        poolValue(
            hpPool.base,
            hpPool.growth,
            statSum(HP_STAT, (row) => row.valueMin),
            1,
        ),
        poolValue(
            hpPool.base,
            hpPool.growth,
            statSum(HP_STAT, (row) => row.valueMax),
            1,
        ),
    );
    out.MP = fmtRange(
        poolValue(
            mpPool.base,
            mpPool.growth,
            statSum(MP_STAT, (row) => row.valueMin),
            mpRate,
        ),
        poolValue(
            mpPool.base,
            mpPool.growth,
            statSum(MP_STAT, (row) => row.valueMax),
            mpRate,
        ),
    );
    out.SP = fmtRange(
        poolValue(
            spPool.base,
            spPool.growth,
            statSum(SP_STAT, (row) => row.valueMin),
            spRate,
        ),
        poolValue(
            spPool.base,
            spPool.growth,
            statSum(SP_STAT, (row) => row.valueMax),
            spRate,
        ),
    );

    return out;
});

/** 四张能力值小表：左上 / 右上 / 左下 / 右下 */
const ABILITY_TOP_LEFT = ['HP', 'MP', 'SP'];
const ABILITY_TOP_RIGHT = ['探知', '陷阱解除', '陷阱回避'];
const ABILITY_BOTTOM_LEFT = ['攻击力', '魔力', '神力', '防御力', '法术防御力'];
const ABILITY_BOTTOM_RIGHT = ['行动速度', '命中', '会心', '回避', '抵抗'];

/** 数值可能是 `123~130` 这样的区间：两端一起加上克己加成 */
const addExtra = (text: string, extra: number) => {
    if (!extra) return text;
    return text
        .split('~')
        .map((part) => {
            const value = Number(part);
            return Number.isFinite(value) ? String(value + extra) : part;
        })
        .join('~');
};

const abilityList = (labels: string[]) => {
    const values = abilityValues.value;
    const extras = disciplineAbilityBonus.value;
    // 克己加成直接并进数值，不再单独写 (+N)
    return labels.map((label) => ({
        label,
        text: addExtra(values[label] ?? '—', extras.get(label) ?? 0),
    }));
};

const abilityTopLeftRows = computed(() => abilityList(ABILITY_TOP_LEFT));
const abilityTopRightRows = computed(() => abilityList(ABILITY_TOP_RIGHT));
const abilityBottomLeftRows = computed(() => abilityList(ABILITY_BOTTOM_LEFT));
const abilityBottomRightRows = computed(() => abilityList(ABILITY_BOTTOM_RIGHT));

const load = async (id: number) => {
    loading.value = true;
    data.value = null;
    try {
        data.value = await store.getCharacter(id);
    } finally {
        loading.value = false;
    }
};

watch(
    () => props.id,
    (id) => {
        calcJobId.value = null;
        calcGrade.value = 'auto';
        calcIndividual.value = 'none';
        disciplineLevel.value = 0;
        bonus.value = emptyStats();
        void load(id);
    },
    { immediate: true },
);

watch(
    () => data.value?.mental.value,
    (value) => {
        calcMental.value = value ?? 100;
    },
);

// 等级变高后，手选的阶级如果已装不下这个等级，就回退到「自动」
watch(calcLevel, (level) => {
    if (calcGrade.value === 'auto') return;
    const maxLv = GRADE_MAX_LV[calcGrade.value - 1] ?? 0;
    if (maxLv < level) calcGrade.value = 'auto';
});
</script>

<style scoped>
/* 修正值输入框：框在单元格内居中（naive-ui 的根元素是 flex，td 的 text-center 管不到） */
.bonus-cell {
    display: flex;
    justify-content: center;
}

/* 数字在框内居中（naive-ui 的 <input> 默认靠左） */
.bonus-cell :deep(.n-input__input-el) {
    text-align: center;
}
</style>
