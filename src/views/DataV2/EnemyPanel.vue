<template>
    <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <NInput
                v-model:value="keyword"
                clearable
                placeholder="搜索敌人名（中/日/英）、图鉴编号或 ID"
                class="w-72!"
            />
            <NSelect
                v-model:value="race"
                :options="raceOptions"
                clearable
                filterable
                placeholder="种族"
                class="w-40!"
            />
            <NSelect
                v-model:value="attribute"
                :options="attributeOptions"
                clearable
                placeholder="属性"
                class="w-28!"
            />
            <NSelect
                v-model:value="kind"
                :options="kindOptions"
                clearable
                placeholder="强度"
                class="w-32!"
            />
            <NSelect v-model:value="category" :options="categoryOptions" placeholder="类型" class="w-36!" />
            <NCheckbox v-model:checked="bookOnly">只看图鉴</NCheckbox>
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
        </div>

        <div>共有 {{ filtered.length }} 条</div>

        <div v-if="filtered.length" class="flex flex-col gap-3">
            <NPagination v-model:page="page" :page-count="pageCount" />

            <div class="overflow-x-auto">
                <table class="wikitable w-full table-fixed! text-center m-0!">
                    <thead class="sticky top-0 z-10">
                        <tr>
                            <th class="w-[6em]">编号</th>
                            <th>敌人</th>
                            <th class="w-[8em]">种族</th>
                            <th class="w-[6em]">属性</th>
                            <th class="w-[6em]">弱点</th>
                            <th class="w-[12em]">强度</th>
                            <th class="w-[6em]">等级</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="row in pageRows"
                            :key="row.id"
                            class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                            @click="open(row.id)"
                        >
                            <td class="whitespace-nowrap">
                                <template v-if="row.no">No.{{ row.no }}</template>
                                <span v-else class="opacity-40">—</span>
                            </td>
                            <td class="text-left">
                                <div class="flex flex-wrap items-center gap-1">
                                    <span>{{ row.name }}</span>
                                    <NTag v-if="row.boss" size="tiny" type="error" :bordered="false">首领</NTag>
                                    <NTag v-if="!row.no" size="tiny" :bordered="false">无图鉴</NTag>
                                </div>
                                <div class="text-xs opacity-40">{{ row.name_jp }}</div>
                            </td>
                            <td class="whitespace-nowrap">{{ row.race.name ?? '—' }}</td>
                            <td class="break-words" :class="row.attribute.length ? undefined : 'opacity-40'">
                                {{ row.attribute.length ? names(row.attribute) : '无' }}
                            </td>
                            <td class="break-words" :class="row.weak.length ? undefined : 'opacity-40'">
                                {{ row.weak.length ? names(row.weak) : '无' }}
                            </td>
                            <td class="break-words">{{ row.kind_names.length ? row.kind_names.join(' / ') : '—' }}</td>
                            <td class="whitespace-nowrap">
                                {{ row.level ? (row.level.min === row.level.max ? row.level.min : `${row.level.min}-${row.level.max}`) : '—' }}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <NPagination v-model:page="page" :page-count="pageCount" />
        </div>

        <EnemyModal v-model:show="modal" :enemy-id="currentId" />
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NInput, NPagination, NSelect, NTag } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import EnemyModal from './EnemyModal.vue';
import { useDataV2Store } from './dataV2Store';
import { usePersistentRef } from './dataV2Settings';
import type { EnemyListItem } from './types';

defineOptions({ name: '敌人面板V2' });

const PAGE_SIZE = 20;

/** 层主（enemy_species 11~18）不放进种族过滤器 */
const FLOOR_BOSS_RACE_IDS = new Set([11, 12, 13, 14, 15, 16, 17, 18]);

type EnemyCategoryKey = 'all' | 'normal' | 'boss' | 'unbooked';

const store = useDataV2Store();

const keyword = usePersistentRef('enemy.keyword', '');
const race = usePersistentRef<number | null>('enemy.race', null);
const attribute = usePersistentRef<number | null>('enemy.attribute', null);
const kind = usePersistentRef<number | null>('enemy.kind', null);
/** 默认把解包里有、图鉴里没有的分类也列出来（测试数据也在内） */
const bookOnly = usePersistentRef('enemy.bookOnly', false);
const category = usePersistentRef<EnemyCategoryKey>('enemy.category', 'all');

const page = ref(1);

const modal = ref(false);
const currentId = ref<number | null>(null);

const open = (id: number) => {
    currentId.value = id;
    modal.value = true;
};

const categoryOptions = [
    { value: 'all', label: '全部' },
    { value: 'normal', label: '普通怪物' },
    { value: 'boss', label: '首领怪物' },
    { value: 'unbooked', label: '无图鉴怪物' },
];

const raceOptions = computed(() =>
    [...store.enemyById.values()]
        .map((enemy) => enemy.race)
        .filter((item, index, rows) => rows.findIndex((row) => row.id === item.id) === index)
        .filter((item) => !FLOOR_BOSS_RACE_IDS.has(item.id))
        .sort((a, b) => a.id - b.id)
        .map((item) => ({ value: item.id, label: item.name ?? `#${item.id}` })),
);

const attributeOptions = computed(() => {
    const ids = new Set<number>();
    for (const enemy of store.enemies) for (const item of enemy.attribute) ids.add(item.id);
    return [...ids]
        .sort((a, b) => a - b)
        .map((id) => ({ value: id, label: store.enumText('attribute', id) ?? `#${id}` }));
});

const kindOptions = computed(() => {
    const ids = new Set<number>();
    for (const enemy of store.enemies) for (const id of enemy.kinds) ids.add(id);
    return [...ids]
        .sort((a, b) => a - b)
        .map((id) => ({ value: id, label: store.enemyKindName(id) ?? `#${id}` }));
});

const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    const asId = /^\d+$/.test(kw);
    const rows = store.enemies.filter((enemy) => {
        if (category.value === 'boss' && !enemy.boss) return false;
        if (category.value === 'normal' && (enemy.boss || !enemy.no)) return false;
        if (category.value === 'unbooked' && enemy.no) return false;
        if (bookOnly.value && !enemy.no) return false;
        if (race.value != null && enemy.race.id !== race.value) return false;
        if (attribute.value != null && !enemy.attribute.some((item) => item.id === attribute.value)) {
            return false;
        }
        if (kind.value != null && !enemy.kinds.includes(kind.value)) return false;
        if (!kw) return true;
        if (asId) {
            return String(enemy.id) === kw || String(enemy.no ?? '') === kw;
        }
        return [enemy.name, enemy.name_jp, enemy.name_en]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(kw));
    });
    // 图鉴条目按图鉴序号排，没有图鉴的排到最后（按分类 id）
    return rows.sort((a, b) => {
        if (a.no && b.no) return a.no - b.no;
        if (a.no) return -1;
        if (b.no) return 1;
        return a.id - b.id;
    });
});

const pageRows = computed(() =>
    filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));

watch(filtered, () => {
    page.value = 1;
});

const names = (rows: Array<{ name?: string | null }>) =>
    rows.map((row) => row.name ?? '').filter(Boolean).join(' / ');

const resetFilter = () => {
    keyword.value = '';
    race.value = null;
    attribute.value = null;
    kind.value = null;
    bookOnly.value = false;
    category.value = 'all';
};
</script>
