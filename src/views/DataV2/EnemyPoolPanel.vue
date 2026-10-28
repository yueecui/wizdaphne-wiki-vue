<template>
    <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <NInput
                v-model:value="keyword"
                clearable
                placeholder="敌群 ID / 地图名 / 层名"
                class="w-64!"
            />
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
        </div>

        <div>共有 {{ filtered.length }} 个符合条件的敌群</div>

        <div v-if="filtered.length" class="flex flex-col gap-3">
            <NPagination v-model:page="page" :page-count="pageCount" />

            <div class="overflow-x-auto">
                <table class="wikitable w-full table-fixed! text-center m-0!">
                    <thead class="sticky top-0 z-10">
                        <tr>
                            <th class="w-[9em]">敌群</th>
                            <th class="w-[5em]">队伍数</th>
                            <th class="w-[22em]">关联地图 / 层</th>
                            <th>敌人预览</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="pool in pageRows"
                            :key="pool.id"
                            class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                            @click="open(pool.id)"
                        >
                            <td class="whitespace-nowrap">{{ pool.id }}</td>
                            <td>{{ pool.row_count }}</td>
                            <td class="text-left">
                                <div
                                    class="break-words"
                                    :class="pool.floors.length ? undefined : 'opacity-40'"
                                >
                                    {{ floorText(pool) }}
                                </div>
                            </td>
                            <td class="text-left">
                                <div class="flex flex-wrap items-center gap-1">
                                    <NTag
                                        v-for="enemy in previewEnemies(pool)"
                                        :key="enemy.enemy_id"
                                        size="small"
                                        :bordered="false"
                                        class="cursor-pointer!"
                                        @click.stop="openEnemy(enemy.enemy_id)"
                                    >
                                        {{ store.enemyNameOf(enemy.enemy_id) }}
                                    </NTag>
                                    <span v-if="restCount(pool) > 0" class="text-xs opacity-60">
                                        +{{ restCount(pool) }}
                                    </span>
                                    <span v-if="!pool.normal_enemies.length && !pool.notorious_enemies.length" class="opacity-40">
                                        —
                                    </span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <NPagination v-model:page="page" :page-count="pageCount" />
        </div>

        <EnemyPoolModal v-model:show="modal" :pool-id="currentId" />
        <EnemyModal v-model:show="enemyModal" :enemy-id="enemyId" />
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput, NPagination, NTag } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import EnemyModal from './EnemyModal.vue';
import EnemyPoolModal from './EnemyPoolModal.vue';
import { useDataV2Store } from './dataV2Store';
import { usePersistentRef } from './dataV2Settings';
import type { RawEnemyPool, RawMapEnemyRef } from '../../stores/wikiData';

defineOptions({ name: '敌群面板' });

const PAGE_SIZE = 20;
/** 列表里敌人预览最多显示多少个，剩下的用 +N 收尾 */
const PREVIEW_LIMIT = 10;

const store = useDataV2Store();

const keyword = usePersistentRef('pool.keyword', '');
const page = ref(1);

const modal = ref(false);
const currentId = ref<number | null>(null);

const open = (id: number) => {
    currentId.value = id;
    modal.value = true;
};

const enemyModal = ref(false);
const enemyId = ref<number | null>(null);
/** 列表里的 enemy_id 是变体 id，modal 要传图鉴分类 id */
const openEnemy = (id: number) => {
    const categoryId = store.enemyCategoryIdOf(id);
    if (categoryId == null) return;
    enemyId.value = categoryId;
    enemyModal.value = true;
};

const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    return store.enemyPools.filter((pool) => {
        if (!kw) return true;
        if (String(pool.id).includes(kw)) return true;
        return pool.floors.some((floor) => `${floor.map_name} ${floor.name}`.toLowerCase().includes(kw));
    });
});

const pageRows = computed(() =>
    filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));

watch(filtered, () => {
    page.value = 1;
});

/** 只显示能确定的层：地图 · 层 */
const floorText = (pool: RawEnemyPool) => {
    if (!pool.floors.length) return '—';
    return pool.floors.map((floor) => `${floor.map_name} · ${floor.name}`).join(' / ');
};

/** 敌人预览：普通怪 + 强敌合并展示，不再单独标强敌 */
const previewEnemies = (pool: RawEnemyPool): RawMapEnemyRef[] =>
    [...pool.normal_enemies, ...pool.notorious_enemies].slice(0, PREVIEW_LIMIT);

const restCount = (pool: RawEnemyPool) =>
    Math.max(0, pool.normal_enemies.length + pool.notorious_enemies.length - PREVIEW_LIMIT);

const resetFilter = () => {
    keyword.value = '';
};
</script>
