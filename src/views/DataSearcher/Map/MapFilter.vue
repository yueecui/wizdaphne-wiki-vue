<template>
    <div>
        <div class="flex flex-wrap flex-row gap-2 items-start">
            <!-- 搜索框 -->
            <div class="flex flex-col w-60">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">搜索词</label>
                </div>
                <div class="flex items-center h-12">
                    <NInput v-model:value="filter.searchText" placeholder="" size="small"></NInput>
                </div>
            </div>

            <!-- 分类筛选 -->
            <div class="flex flex-col w-40">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">分类</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.category"
                        :options="categoryOptions"
                        placeholder="全部"
                        size="small"
                        clearable
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NInput, NSelect, SelectOption } from 'naive-ui';
import { computed, onMounted, toRefs } from 'vue';
import { useMonsterStore } from '../Monster/monsterStore';
import type { IMapFilter } from './types';

const filter = defineModel<IMapFilter>('filter', {
    type: Object,
    required: true,
});

const monsterStore = useMonsterStore();
const { loadAllData, maps, mapCategoryList } = toRefs(monsterStore);

onMounted(() => {
    loadAllData.value();
});

const categoryOptions = computed<SelectOption[]>(() => {
    const categories = ['全部'];
    if (mapCategoryList.value.length > 0) {
        categories.push(...mapCategoryList.value);
    } else {
        categories.push(
            ...maps.value.reduce((acc, map) => {
                if (map.category && !acc.includes(map.category)) {
                    acc.push(map.category);
                }
                return acc;
            }, [] as string[]),
        );
    }
    return categories.map((category) => ({
        label: category,
        value: category,
    }));
});
</script>
