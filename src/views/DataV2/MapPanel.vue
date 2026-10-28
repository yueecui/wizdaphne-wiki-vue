<template>
    <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <NSelect
                v-model:value="mapId"
                :options="mapOptions"
                clearable
                filterable
                placeholder="地图分类"
                class="w-56!"
            />
            <NInput v-model:value="keyword" clearable placeholder="搜索层名 / 地图名 / 层 ID" class="w-64!" />
            <NCheckbox v-model:checked="enemyOnly">只看有敌人的层</NCheckbox>
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
        </div>

        <div>共有 {{ filtered.length }} 层</div>

        <div v-if="filtered.length" class="flex flex-col gap-3">
            <NPagination v-model:page="page" :page-count="pageCount" />

            <div class="overflow-x-auto">
                <table class="wikitable w-full table-fixed! text-center m-0!">
                    <thead class="sticky top-0 z-10">
                        <tr>
                            <th>地图 / 层</th>
                            <th class="w-[8em]">敌人种类</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="floor in pageRows"
                            :key="floor.id"
                            class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                            @click="open(floor.id)"
                        >
                            <td class="text-left">
                                <div>{{ floor.name || '（未命名）' }}</div>
                                <div class="text-xs opacity-60">
                                    {{ floor.map_name ? `${floor.map_name} · ` : '' }}ID {{ floor.id }}
                                </div>
                            </td>
                            <td>{{ floor.normal_enemies.length }} 种</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <NPagination v-model:page="page" :page-count="pageCount" />
        </div>

        <MapFloorModal v-model:show="modal" :floor-id="currentId" />
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NInput, NPagination, NSelect } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import MapFloorModal from './MapFloorModal.vue';
import { useDataV2Store } from './dataV2Store';
import { usePersistentRef } from './dataV2Settings';

defineOptions({ name: '地图面板' });

const PAGE_SIZE = 20;

const store = useDataV2Store();

const mapId = usePersistentRef<number | null>('map.mapId', null);
const keyword = usePersistentRef('map.keyword', '');
const enemyOnly = usePersistentRef('map.enemyOnly', false);

const page = ref(1);

const modal = ref(false);
const currentId = ref<number | null>(null);

const open = (id: number) => {
    currentId.value = id;
    modal.value = true;
};

const mapOptions = computed(() =>
    store.mapCategories.map((item) => ({
        value: item.id,
        label: item.town_name ? `${item.name}（${item.town_name}）` : item.name,
    })),
);

const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    const asId = /^\d+$/.test(kw);
    return store.mapFloors.filter((floor) => {
        if (enemyOnly.value && floor.normal_enemies.length + floor.notorious_enemies.length === 0) return false;
        if (mapId.value != null && floor.map_id !== mapId.value) return false;
        if (!kw) return true;
        if (asId) return String(floor.id).includes(kw);
        return [floor.name, floor.map_name].filter(Boolean).some((value) => String(value).toLowerCase().includes(kw));
    });
});

const pageRows = computed(() =>
    filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));

watch(filtered, () => {
    page.value = 1;
});

const resetFilter = () => {
    mapId.value = null;
    keyword.value = '';
    enemyOnly.value = false;
};
</script>
