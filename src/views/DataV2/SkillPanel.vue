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
            <div class="flex-1"></div>
            <div class="text-sm opacity-70">{{ filtered.length }} 条</div>
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
        </div>

        <div class="flex flex-col gap-3">
            <NPagination v-model:page="page" :page-count="pageCount" />

            <div class="overflow-x-auto">
                <table class="wikitable w-full table-fixed! text-center m-0!">
                    <thead class="sticky top-0 z-10">
                        <tr>
                            <th class="w-[7em]">ID</th>
                            <th>技能</th>
                            <th class="w-[8em]">类型</th>
                            <th class="w-[10em]">职业</th>
                            <th class="w-[10em]">来源</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-if="!filtered.length">
                            <td colspan="5" class="opacity-40!">
                                没有符合条件的技能
                            </td>
                        </tr>
                        <tr
                            v-for="row in pageRows"
                            :key="row.identification"
                            class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                            @click="open(row.identification)"
                            @contextmenu.prevent="showMenu($event, row)"
                        >
                            <td class="whitespace-nowrap opacity-60">{{ row.identification }}</td>
                            <td class="text-left">
                                <div>{{ row.name ?? '—' }}</div>
                                <div class="text-xs opacity-40">{{ row.name_jp }}</div>
                            </td>
                            <td class="whitespace-nowrap">{{ row.kind_name ?? '—' }}</td>
                            <td class="break-words">{{ jobText(row) }}</td>
                            <td class="break-words">{{ sourceText(row) }}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <NPagination v-model:page="page" :page-count="pageCount" />
        </div>

        <SkillModal v-model:show="modal" :identification="currentId" />

        <CopyTemplateMenu
            :show="menu.show"
            :x="menu.x"
            :y="menu.y"
            template="技能"
            @copy="copyTemplate"
        />
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput, NPagination, NSelect } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import CopyTemplateMenu from './CopyTemplateMenu.vue';
import SkillModal from './SkillModal.vue';
import { useDataV2Store } from './dataV2Store';
import { usePersistentRef } from './dataV2Settings';
import { templateBody, useCopyMenu } from './useCopyMenu';
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

// 右击行 → 复制 {{技能|名字|ID}}：技能重名多，定位用 ID，名字只负责模板里的显示
const { menu, showMenu, copyTemplate } = useCopyMenu<SkillListItem>('技能', (row) =>
    templateBody(row.name, row.identification),
);

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
    bond: '缘',
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

const PAGE_SIZE = 20;
const page = ref(1);

const pageRows = computed(() =>
    filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));

watch(filtered, () => {
    page.value = 1;
});

const jobText = (row: SkillListItem) =>
    row.jobs.length ? row.jobs.map((id) => store.jobById.get(id)?.name ?? id).join(' / ') : '—';

const sourceText = (row: SkillListItem) =>
    row.sources.length ? row.sources.map((s) => SOURCE_LABEL[s] ?? s).join(' / ') : '—';

const resetFilter = () => {
    keyword.value = '';
    kind.value = null;
    job.value = null;
    source.value = null;
    subKind.value = null;
};
</script>
