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
import { useItemStore } from './itemStore';
import type { IItemFilter } from './types';

const filter = defineModel<IItemFilter>('filter', {
    type: Object,
    required: true,
});

const itemStore = useItemStore();

const categoryOrder = [
    { label: '出售', value: '0' },
    { label: '消耗品', value: '1' },
    { label: '贵重品', value: '2' },
    { label: '其他', value: '4' },
];
</script>
