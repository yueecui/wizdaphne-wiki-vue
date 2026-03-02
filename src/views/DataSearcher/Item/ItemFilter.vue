<template>
    <div class="flex flex-wrap flex-row gap-2 items-center">
        <NButton
            size="small"
            :type="filter.category === '' ? 'primary' : 'default'"
            @click="() => (filter.category = '')"
        >
            全部
        </NButton>
        <template v-for="(category, index) in categoryOrder" :key="index">
            <NButton
                size="small"
                :type="filter.category === category.value ? 'primary' : 'default'"
                @click="() => (filter.category = category.value)"
            >
                {{ category.label }}
            </NButton>
        </template>
    </div>
    <div class="flex flex-row flex-wrap gap-2 md:gap-6">
        <div class="flex flex-col w-60">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">搜索词</label>
            </div>
            <div class="flex items-center h-12">
                <NInput v-model:value="filter.searchText" placeholder="支持中文名和ID"></NInput>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput } from 'naive-ui';
import { categoryMap } from './Item';
import type { IItemFilter } from './types';

const filter = defineModel<IItemFilter>('filter', {
    type: Object,
    required: true,
});

const categoryOrder = Object.entries(categoryMap).map(([value, label]) => ({ value, label }));
</script>
