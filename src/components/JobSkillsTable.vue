<template>
    <div>
        <!-- 武士属性过滤：与角色搜索器的属性过滤同一套图标按钮 -->
        <div v-if="isAptitudeMode" class="flex flex-col mb-2">
            <div class="flex flex-row gap-2 items-center h-12">
                <div
                    v-for="tab in APTITUDE_TABS"
                    :key="tab.key"
                    class="w-8 h-8 relative group cursor-pointer"
                    :class="activeAptitude === tab.key ? '' : 'inactive'"
                    @click="activeAptitude = tab.key"
                >
                    <ElementIcon :element="tab.element" class="group-[.inactive]:opacity-30 w-8 h-8" />
                    <div
                        class="hidden md:group-hover:!block absolute z-10 -bottom-8 left-1/2 -translate-x-1/2 w-max px-2 bg-black/70 rounded text-center drop-shadow-inline"
                    >
                        {{ tab.element }}
                    </div>
                </div>
            </div>
        </div>

        <table class="wikitable">
            <thead>
                <tr>
                    <th class="md:w-20">等级</th>
                    <th class="md:w-60">名称</th>
                    <th class="md:w-50">可继承自</th>
                    <th>技能描述</th>
                </tr>
            </thead>

            <!-- 数据还没加载完：先占位，避免把 data-extra 的技能渲染成「未找到数据」 -->
            <tbody v-if="!isReady">
                <tr v-for="index in SKELETON_ROWS" :key="index">
                    <th class="text-gray-500">—</th>
                    <td class="text-gray-500">加载中…</td>
                    <td class="text-center text-gray-500">—</td>
                    <td class="text-gray-500">—</td>
                </tr>
            </tbody>

            <tbody v-else>
                <tr
                    v-for="(row, index) in rows"
                    :key="`${row.skillId}-${index}`"
                    :class="row.isPassive ? 'bg-black/20' : ''"
                >
                    <th>
                        <span v-if="row.level != null">{{ row.level }}</span>
                        <span v-else class="text-gray-500 text-sm">仅继承</span>
                    </th>
                    <td>
                        <div
                            class="text-light cursor-pointer hover:opacity-70"
                            :title="`点击查看「${row.name}」详情`"
                            @click="openSkill(row.skillId)"
                        >
                            {{ row.name }}
                        </div>
                        <div class="text-gray-500 text-sm">{{ row.kindText }}</div>
                    </td>
                    <td class="text-center">
                        <div v-for="inheritor in row.inheritors" :key="inheritor.id">
                            <!-- 角色名沿用站点 a 标签样式 -->
                            <a
                                class="cursor-pointer"
                                :title="`点击查看「${inheritor.name}」`"
                                @click.prevent="openCharacter(inheritor.id, inheritor.name)"
                            >
                                {{ inheritor.name }}
                            </a>
                            <WikiImg
                                v-if="inheritor.potential"
                                imageName="icon_RareSkills.png"
                                class="w-5 h-5 inline-block align-middle"
                            />
                        </div>
                    </td>
                    <td>
                        <div class="flex flex-col gap-1">
                            <div>{{ row.description || '技能描述未找到' }}</div>
                            <div v-if="row.detail" class="text-gray-500 text-sm">{{ row.detail }}</div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <div v-if="isReady && !rows.length" class="py-4 text-sm opacity-50">{{ placeholder }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { useWikiDataStore } from '../stores/wikiData';
import { useDataV2Store } from '../views/DataV2/dataV2Store';
import type { JobDetail, JobSkill } from '../views/DataV2/types';
import { ELEMENT_TYPE } from '../views/DataSearcher/data/enum';
import ElementIcon from './ElementIcon.vue';
import WikiImg from './huiji/WikiImg.vue';
import { parseId, styledName, useInlineLink } from './inlineLink';

defineOptions({ name: '职业技能表' });

const props = defineProps<{
    /** 职业名（`data-job`）：也可以是纯数字 id */
    jobName?: string;
    /** 职业 id（`data-job-id`）：有就优先按它定位 */
    jobId?: string;
    /** 从职业技能里排除的技能 id，逗号 / 空格分隔（不影响手写列表） */
    excludeSkillIds?: string;
    /** 手写技能：`id` 或 `id:学习等级`，逗号 / 空格分隔；不带等级显示「仅继承」 */
    extraSkillIds?: string;
    /** `武士属性别技能`：按属性分页显示宿X之力这组技能的学习等级 */
    mode?: string;
}>();

const wiki = useWikiDataStore();
const store = useDataV2Store();
const link = useInlineLink();

onMounted(() => {
    void wiki.init();
});

/** 武士属性过滤：顺序按 wiki 需求；黑杖的武士与「无」一致，不再单列 */
const APTITUDE_TABS = [
    { key: '7', element: ELEMENT_TYPE.无 },
    { key: '1', element: ELEMENT_TYPE.火 },
    { key: '2', element: ELEMENT_TYPE.水 },
    { key: '3', element: ELEMENT_TYPE.风 },
    { key: '4', element: ELEMENT_TYPE.土 },
    { key: '6', element: ELEMENT_TYPE.暗 },
] as const;

const isAptitudeMode = computed(() => props.mode === '武士属性别技能');
const activeAptitude = ref<string>('7');

const job = computed<JobDetail | null>(() => {
    // 武士属性模式固定按「武士」取数
    if (isAptitudeMode.value) return store.jobById.get(106) ?? null;

    const id = parseId(props.jobId) ?? parseId(props.jobName);
    if (id != null) return store.jobById.get(id) ?? null;

    const name = (props.jobName ?? '').trim();
    if (!name) return null;
    return (
        store.jobs.find((item) => item.name === name) ??
        store.jobs.find((item) => item.name_jp === name || item.name_en === name) ??
        null
    );
});

/** 当前属性页的技能：直接取该属性的宿X之力变体（自带学习等级） */
const aptitudeJobSkills = computed<JobSkill[]>(() => {
    if (!isAptitudeMode.value) return [];
    const tab = APTITUDE_TABS.find((item) => item.key === activeAptitude.value);
    if (!tab) return [];
    return job.value?.skill_variants?.[tab.key] ?? [];
});

interface Inheritor {
    id: number;
    name: string;
    /** 潜在继承技能（wiki 上带 RareSkills 图标） */
    potential: boolean;
}

/** 技能 -> 可继承自的角色（固有继承 + 潜在继承） */
const inheritorsBySkill = computed(() => {
    const map = new Map<number, Inheritor[]>();

    const add = (skillId: number, inheritor: Inheritor) => {
        const list = map.get(skillId) ?? [];
        const existing = list.find((item) => item.id === inheritor.id);
        if (existing) {
            // 同时出现在固有 / 潜在里时，按固有显示（不带图标）
            existing.potential = existing.potential && inheritor.potential;
            return;
        }
        list.push(inheritor);
        map.set(skillId, list);
    };

    for (const character of store.characterById.values()) {
        if (character.hidden) continue;
        const inheritor: Inheritor = {
            id: character.id,
            name: styledName({ name: character.name ?? '', style: character.style }),
            potential: false,
        };
        for (const ref of character.skills.inherit) add(ref.identification, { ...inheritor });
        for (const ref of character.skills.potential_inherit) add(ref.identification, { ...inheritor, potential: true });
    }

    for (const list of map.values()) list.sort((a, b) => a.id - b.id);
    return map;
});

/** 数据没加载完时占位表格的行数 */
const SKELETON_ROWS = 6;

// 加载失败也结束占位，交给下面的提示文案说明
const isReady = computed(() => wiki.ready || wiki.status === 'error');

interface JobSkillRow {
    skillId: number;
    /** null = 仅继承（没有职业等级） */
    level: number | null;
    name: string;
    isPassive: boolean;
    kindText: string;
    description: string;
    detail: string;
    inheritors: Inheritor[];
}

const buildRow = (skillId: number, level: number | null): JobSkillRow => {
    const skill = store.skillById.get(skillId);
    return {
        skillId,
        level,
        name: skill?.name ?? `#${skillId}`,
        isPassive: skill?.is_passive === true,
        kindText: skill ? (skill.is_passive ? '被动' : (skill.kind_name ?? '')) : '',
        description: skill?.description ?? '',
        detail: skill?.detail_description ?? '',
        inheritors: inheritorsBySkill.value.get(skillId) ?? [],
    };
};

interface ManualSkill {
    id: number;
    /** null = 仅继承（没有学习等级） */
    level: number | null;
}

/** 技能行 id（11 位）归一成 identification，手写列表两种 id 都能用 */
const normalizeSkillId = (id: number) => (id >= 10_000_000_000 ? Math.floor(id / 100) : id);

/** `data-exclude`：只作用于职业来源，不会过滤手写指定的技能 */
const excludeIds = computed(
    () =>
        new Set(
            (props.excludeSkillIds ?? '')
                .split(/[,，\s]+/)
                .map((value) => parseId(value))
                .filter((value): value is number => value != null)
                .map(normalizeSkillId),
        ),
);

/** `data-extra`：`id` 或 `id:学习等级`；带等级显示等级，不带显示「仅继承」 */
const manualSkills = computed<ManualSkill[]>(() =>
    (props.extraSkillIds ?? '')
        .split(/[,，\s]+/)
        .filter(Boolean)
        .flatMap((token): ManualSkill[] => {
            const [idPart, levelPart] = token.split(/[:：]/);
            const rawId = parseId(idPart);
            if (rawId == null) return [];
            const level = levelPart && /^\d+$/.test(levelPart.trim()) ? Number(levelPart.trim()) : null;
            return [{ id: normalizeSkillId(rawId), level: level != null && level > 0 ? level : null }];
        }),
);

const rows = computed<JobSkillRow[]>(() => {
    // 武士属性模式按当前页取数；普通模式不指定职业时，整张表由手写列表生成
    const source = isAptitudeMode.value ? aptitudeJobSkills.value : (job.value?.skills ?? []);
    const jobSkills = source.filter((ref) => !excludeIds.value.has(ref.identification));
    const existed = new Set(jobSkills.map((ref) => ref.identification));

    const base = jobSkills.map((ref) => buildRow(ref.identification, ref.get_lv));
    const manual = manualSkills.value
        .filter((item) => !existed.has(item.id))
        .map((item) => buildRow(item.id, item.level));

    // 有学习等级的按等级排，没等级的「仅继承」统一放表尾
    return [...base, ...manual].sort(
        (a, b) => (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER),
    );
});

const placeholder = computed(() => {
    if (wiki.status === 'error') return wiki.error ? `加载失败：${wiki.error}` : '数据加载失败';
    if (!wiki.ready) return '加载中…';
    if (!props.jobName && !props.jobId && !manualSkills.value.length && !isAptitudeMode.value) {
        return '未指定职业（data-job / data-job-id）或手写技能（data-extra）';
    }
    return `未找到职业「${props.jobName || props.jobId || '武士'}」的技能`;
});

/** 技能名 -> 技能 modal */
const openSkill = (identification: number) => {
    void link.openSkill(identification);
};

/** 角色名 -> 角色 modal */
const openCharacter = (id: number, name: string) => {
    void link.openLink('character', { id, name });
};
</script>
