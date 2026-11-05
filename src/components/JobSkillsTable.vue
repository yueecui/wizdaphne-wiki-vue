<template>
    <div>
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
import { computed, onMounted } from 'vue';
import { useWikiDataStore } from '../stores/wikiData';
import { useDataV2Store } from '../views/DataV2/dataV2Store';
import type { JobDetail } from '../views/DataV2/types';
import WikiImg from './huiji/WikiImg.vue';
import { parseId, styledName, useInlineLink } from './inlineLink';

defineOptions({ name: '职业技能表' });

const props = defineProps<{
    /** 职业名（`data-job`）：也可以是纯数字 id */
    jobName?: string;
    /** 职业 id（`data-job-id`）：有就优先按它定位 */
    jobId?: string;
    /** 额外作为「仅继承」加入的技能 id，逗号 / 空格分隔 */
    extraSkillIds?: string;
}>();

const wiki = useWikiDataStore();
const store = useDataV2Store();
const link = useInlineLink();

onMounted(() => {
    void wiki.init();
});

const job = computed<JobDetail | null>(() => {
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

/** `data-extra` 里的额外技能：只作为「仅继承」行，已经出现在职业表里的会跳过 */
const extraSkillIds = computed(() =>
    (props.extraSkillIds ?? '')
        .split(/[,，\s]+/)
        .map((value) => parseId(value))
        .filter((value): value is number => value != null),
);

const rows = computed<JobSkillRow[]>(() => {
    const jobSkills = job.value?.skills ?? [];
    const existed = new Set(jobSkills.map((ref) => ref.identification));

    const base = jobSkills
        .map((ref) => buildRow(ref.identification, ref.get_lv))
        .sort((a, b) => (a.level ?? Number.MAX_SAFE_INTEGER) - (b.level ?? Number.MAX_SAFE_INTEGER));

    const extra = extraSkillIds.value.filter((id) => !existed.has(id)).map((id) => buildRow(id, null));

    return [...base, ...extra];
});

const placeholder = computed(() => {
    if (wiki.status === 'error') return wiki.error ? `加载失败：${wiki.error}` : '数据加载失败';
    if (!wiki.ready) return '加载中…';
    if (!props.jobName && !props.jobId) return '未指定职业（data-job / data-job-id）';
    return `未找到职业「${props.jobName || props.jobId}」的技能`;
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
