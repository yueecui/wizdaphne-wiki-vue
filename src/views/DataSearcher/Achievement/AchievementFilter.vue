<template>
    <div>
        <div class="flex flex-wrap flex-row gap-2 items-center">
            <div class="flex flex-col w-60">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">搜索词</label>
                </div>
                <div class="flex items-center h-12">
                    <NInput v-model:value="filter.searchText" placeholder="" size="small"></NInput>
                </div>
            </div>

            <div class="flex flex-col w-40">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">分类</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.category"
                        placeholder="全部"
                        size="small"
                        :options="categoryOptions"
                    ></NSelect>
                </div>
            </div>

            <div v-if="filter.category === '奈落'" class="flex flex-col w-40">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">子分类</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.subCategory"
                        placeholder="全部"
                        size="small"
                        :options="subCategoryOptions"
                    ></NSelect>
                </div>
            </div>

            <div class="flex flex-col w-40">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">完成状态</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.completionStatus"
                        placeholder="全部"
                        size="small"
                        :options="completionStatusOptions"
                    ></NSelect>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NInput, NSelect, SelectOption } from 'naive-ui';
import { computed, watch } from 'vue';
import { useAchievementStore } from './achievementStore';
import type { IAchievementFilter } from './types';

const filter = defineModel<IAchievementFilter>('filter', {
    type: Object,
    required: true,
});

// 监听分类变化，当分类不是"奈落"时，重置子分类
watch(
    () => filter.value.category,
    (newCategory) => {
        if (newCategory !== '奈落' && filter.value.subCategory) {
            filter.value.subCategory = '';
        }
    },
);

const achievementStore = useAchievementStore();

const categoryOptions = computed<SelectOption[]>(() => {
    const categories = achievementStore.getCategories();
    return [{ label: '全部', value: '' }, ...categories.map((cate) => ({ label: cate, value: cate }))];
});

const subCategoryOptions = computed<SelectOption[]>(() => {
    const subCategories = achievementStore.getSubCategories(filter.value.category);
    return subCategories.map((sub) => ({ label: sub, value: sub === '全部' ? '' : sub }));
});

// 完成状态选项
const completionStatusOptions = computed<SelectOption[]>(() => [
    { label: '全部', value: 'all' },
    { label: '已完成', value: 'completed' },
    { label: '未完成', value: 'incomplete' },
]);
</script>
