<template>
    <div class="flex flex-row flex-wrap gap-2 md:gap-6">
        <div class="flex flex-col w-60">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">搜索词</label>
            </div>
            <div class="flex items-center h-12">
                <NInput v-model:value="filter.searchText" placeholder="支持中日技能名"></NInput>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">分类</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect
                    :options="categoryOptions"
                    v-model:value="filter.category"
                    class="w-40!"
                    maxTagCount="responsive"
                ></NSelect>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">类型</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect
                    :options="typeOptions"
                    v-model:value="filter.type"
                    class="w-40!"
                    maxTagCount="responsive"
                ></NSelect>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NInput, NSelect, SelectOption } from 'naive-ui';

import { computed } from 'vue';
import { ISkillFilter } from './types';
import { useSearcherDataStore } from '../data/searcherDataStore';

const filter = defineModel<ISkillFilter>('filter', {
    type: Object,
    required: true,
});

// 使用store中的职业数据
const store = useSearcherDataStore();

// 职业以外的固定分类
const EXTRA_CATEGORY_LIST = ['角色特殊技能', '角色固有被动', '角色克己被动', '其他被动'];

const categoryOptions = computed<SelectOption[]>(() => [
    {
        label: '全部',
        value: '',
    },
    ...store.allStandardClass.map((r) => ({
        label: r,
        value: r,
    })),
    ...EXTRA_CATEGORY_LIST.map((r) => ({
        label: r,
        value: r,
    })),
]);

const TYPE_LIST = ['攻击技能', '支援技能', '攻击咒文', '妨碍咒文', '回复咒文', '支援咒文', '被动'];
const typeOptions = computed<SelectOption[]>(() => [
    {
        label: '全部',
        value: '',
    },
    ...Object.values(TYPE_LIST).map((r) => ({
        label: r,
        value: r,
    })),
]);
</script>
