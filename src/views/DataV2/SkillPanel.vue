<template>
    <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <NInput
                v-model:value="keyword"
                clearable
                placeholder="搜索技能名（中/日/英）或 9 位 ID"
                class="w-72!"
            />
            <NSelect v-model:value="kind" :options="kindOptions" clearable placeholder="类型" class="w-32!" />
            <NSelect v-model:value="job" :options="jobOptions" clearable placeholder="职业" class="w-28!" />
            <NSelect v-model:value="source" :options="sourceOptions" clearable placeholder="来源" class="w-32!" />
            <NSelect
                v-model:value="subKind"
                :options="subKindOptions"
                filterable
                clearable
                placeholder="sub effect"
                class="w-56!"
            />
            <NCheckbox v-model:checked="showAll">显示敌方 / 测试</NCheckbox>
            <div class="flex-1"></div>
            <div class="text-sm opacity-70">{{ filtered.length }} 条</div>
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
        </div>

        <NDataTable
            size="small"
            :columns="columns"
            :data="filtered"
            :loading="store.state.skills === 'loading'"
            :pagination="{ pageSize: 25 }"
            :row-props="rowProps"
            :scroll-x="820"
        />

        <SkillModal v-model:show="modal" :identification="currentId" />
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NDataTable, NInput, NSelect, NTag } from 'naive-ui';
import type { DataTableColumns } from 'naive-ui';
import { computed, h, ref } from 'vue';
import SkillModal from './SkillModal.vue';
import { useDataV2Store } from './dataV2Store';
import { usePersistentRef } from './dataV2Settings';
import type { SkillListItem } from './types';

defineOptions({ name: '技能面板V2' });

const store = useDataV2Store();

// 过滤器全部持久化（对齐 V1 的 skillFilter）
const keyword = usePersistentRef('skill.keyword', '');
const kind = usePersistentRef<number | null>('skill.kind', null);
const job = usePersistentRef<number | null>('skill.job', null);
const source = usePersistentRef<string | null>('skill.source', null);
/** 按 sub effect kind ID 精确筛选（空 = 不过滤） */
const subKind = usePersistentRef<number | null>('skill.subKind', null);
/** debug 方便：默认连敌方 / 测试技能一起列出 */
const showAll = usePersistentRef('skill.showAll', true);

/** 下拉里同时给出 id 与名称，输入 id 或名字都能筛（filterable 默认按 label 匹配） */
const subKindOptions = computed(() =>
    Object.values(store.effectKinds)
        .map((item) => ({ value: item.id, label: `${item.id} ${item.name ?? ''}`.trim() }))
        .sort((a, b) => a.value - b.value),
);

const modal = ref(false);
const currentId = ref<number | null>(null);

const open = (id: number) => {
    currentId.value = id;
    modal.value = true;
};

const SOURCE_LABEL: Record<string, string> = {
    job: '职业',
    unique: '固有',
    inherit: '继承',
    potential: '潜在',
    discipline: '克己',
    equipment: '装备',
    equip_set: '套装',
    relic: '遗物',
    fate: '才能',
    bond: '羁绊',
};

const kindOptions = computed(() => {
    const map = new Map<number, string>();
    for (const s of store.skills) if (s.kind != null && s.kind_name) map.set(s.kind, s.kind_name);
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([value, label]) => ({ value, label }));
});

const jobOptions = computed(() =>
    store.jobs.map((j) => ({ value: j.id, label: j.name ?? String(j.id) })),
);

const sourceOptions = computed(() => {
    const keys = new Set<string>();
    for (const s of store.skills) for (const k of s.sources) keys.add(k);
    return [...keys].map((k) => ({ value: k, label: SOURCE_LABEL[k] ?? k }));
});

const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    // a pure number is always an exact id lookup, never a fuzzy name match
    const asId = /^\d+$/.test(kw);
    return store.skills.filter((s) => {
        if (!showAll.value && !s.player) return false;
        if (kind.value != null && s.kind !== kind.value) return false;
        if (job.value != null && !s.jobs.includes(job.value)) return false;
        if (source.value && !s.sources.includes(source.value)) return false;
        if (subKind.value != null && !s.sub_kinds.includes(subKind.value)) return false;
        if (!kw) return true;
        if (asId) return String(s.identification) === kw;
        return [s.name, s.name_jp, s.name_en]
            .filter(Boolean)
            .some((v) => String(v).toLowerCase().includes(kw));
    });
});

const rowProps = (row: SkillListItem) => ({
    style: 'cursor: pointer;',
    onClick: () => open(row.identification),
});

const columns = computed<DataTableColumns<SkillListItem>>(() => [
    {
        title: '技能',
        key: 'name',
        minWidth: 220,
        render: (row) =>
            h('div', { class: 'flex flex-col' }, [
                h('span', { class: 'flex items-center gap-1' }, [
                    row.name,
                    row.flags.test ? h(NTag, { size: 'tiny', type: 'warning', bordered: false }, { default: () => '测试' }) : null,
                    !row.player ? h(NTag, { size: 'tiny', bordered: false }, { default: () => '敌方' }) : null,
                ]),
                h('span', { class: 'text-xs opacity-40' }, row.name_jp ?? ''),
            ]),
    },
    { title: '类型', key: 'kind_name', width: 96 },
    { title: '上限', key: 'max_level', width: 60 },
    {
        title: '职业',
        key: 'jobs',
        width: 130,
        render: (row) =>
            row.jobs.length
                ? row.jobs.map((id) => store.jobById.get(id)?.name ?? id).join(' / ')
                : '—',
    },
    {
        title: '来源',
        key: 'sources',
        width: 170,
        render: (row) =>
            row.sources.length
                ? row.sources.map((s) => SOURCE_LABEL[s] ?? s).join(' / ')
                : '—',
    },
    { title: 'ID', key: 'identification', width: 120 },
]);

const resetFilter = () => {
    keyword.value = '';
    kind.value = null;
    job.value = null;
    source.value = null;
    subKind.value = null;
    showAll.value = false;
};
</script>
