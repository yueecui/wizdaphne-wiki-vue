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
const { maps, mapCategoryList } = toRefs(monsterStore);
const { loadAllData } = monsterStore;

onMounted(() => {
    loadAllData();
});

const categoryOptions = computed<SelectOption[]>(() => {
    const categorySet = new Set<string>();
    if (mapCategoryList.value.length > 0) {
        mapCategoryList.value.forEach((c) => categorySet.add(c));
    } else {
        maps.value.forEach((map) => {
            if (map.category) {
                categorySet.add(map.category);
            }
        });
    }
    const options: SelectOption[] = [{ label: '全部', value: '' }];
    Array.from(categorySet)
        .sort()
        .forEach((category) => {
            options.push({ label: category, value: category });
        });
    return options;
});
</script>
