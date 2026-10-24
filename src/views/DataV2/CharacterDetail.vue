<template>
    <NSpin :show="loading">
        <div v-if="data" class="p-4 bg-[#312721]! border! border-[#463d38]! rounded">
            <div
                class="grid md:grid-flow-col grid-rows-[127px_auto] grid-cols-[128px_auto] md:grid-cols-[200px_auto] gap-4"
            >
                <!-- 角色卡 -->
                <div class="col-span-2 md:col-auto flex justify-center items-center">
                    <div class="w-full">
                        <div class="relative">
                            <WikiImg
                                v-if="thumb"
                                :imageName="thumb"
                                :isLazy="true"
                                class="block w-full rounded-sm"
                            />
                            <div
                                v-else
                                class="w-full py-8 flex items-center justify-center text-xs opacity-40 bg-black/40"
                            >
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
                        <div class="bg-black/30 text-sm flex">
                            <div class="flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                {{ data.race.name }} / {{ data.alignment.name }}
                            </div>
                            <div class="flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                                {{ jobText }}
                            </div>
                        </div>
                    </div>
                </div>

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
                                                <div class="hidden md:flex! items-center justify-center gap-1 leading-none">
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
                                <th :class="hasSubJob ? 'md:w-1/3' : 'md:w-2/3'">{{ primaryJob?.name ?? '—' }}</th>
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
                <div class="row-span-2 md:col-auto">
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
                                                <div class="whitespace-pre-line">{{ descOf(s.identification) }}</div>
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

            <div class="flex flex-wrap justify-center mt-4 gap-4">
                <NButton size="small" type="primary" @click="gotoDetail">查看详情页</NButton>
                <NButton v-if="onClose" size="small" type="warning" @click="onClose">关闭</NButton>
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
import { NButton, NEmpty, NIcon, NModal, NSpin, NTooltip } from 'naive-ui';
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

/** 属性行，顺序沿用 V1（力 / 智慧 / 信仰心 / 生命力 / 灵巧 / 敏捷 / 运） */
const STAT_ROWS: Array<{ key: StatKey; label: string }> = [
    { key: 'str', label: '力' },
    { key: 'int', label: '智慧' },
    { key: 'pie', label: '信仰心' },
    { key: 'vit', label: '生命力' },
    { key: 'dex', label: '灵巧' },
    { key: 'agi', label: '敏捷' },
    { key: 'luk', label: '运' },
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

const jobText = computed(() => (data.value?.jobs ?? []).map((job) => job.name).join(' / '));

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

const descOf = (identification: number) =>
    store.skillById.get(identification)?.description || '技能描述未找到';

const gotoDetail = () => {
    if (!data.value?.name) return;
    window.open(`/wiki/${data.value.name}`, '_blank');
};

const load = async (id: number) => {
    loading.value = true;
    data.value = null;
    try {
        data.value = await store.getCharacter(id);
    } finally {
        loading.value = false;
    }
};

watch(() => props.id, load, { immediate: true });
</script>
