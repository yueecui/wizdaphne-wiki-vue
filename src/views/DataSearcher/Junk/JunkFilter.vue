<template>
    <div>
        <div class="flex flex-wrap flex-row gap-2 items-center">
            <!-- 搜索框 -->
            <div class="flex flex-col w-60">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">搜索词</label>
                </div>
                <div class="flex items-center h-12">
                    <NInput
                        v-model:value="filter.searchText"
                        placeholder="支持中日名字搜索杂物分类"
                        size="small"
                    ></NInput>
                </div>
            </div>

            <!-- 最高星级过滤 -->
            <div class="flex flex-col w-40">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">最高星级</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.maxQuality"
                        placeholder="全部"
                        size="small"
                        :options="qualityOptions"
                    ></NSelect>
                </div>
            </div>

            <!-- 最高颜色过滤 -->
            <div class="flex flex-col w-40">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">最高颜色</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.maxGrade"
                        placeholder="全部"
                        size="small"
                        :options="gradeOptions"
                    ></NSelect>
                </div>
            </div>

            <!-- 最高阶级过滤 -->
            <div class="flex flex-col w-40">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">最高阶级</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.maxTier"
                        placeholder="全部"
                        size="small"
                        :options="tierOptions"
                    ></NSelect>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NInput, NSelect, SelectOption } from 'naive-ui';
import { computed } from 'vue';
import { TIER_NAME_MAP } from './constants';
import { IJunkFilter } from './types';

// 使用defineModel双向绑定过滤器
const filter = defineModel<IJunkFilter>('filter', {
    type: Object,
    required: true,
});

// 最高星级选项 - 从大到小排列
const qualityOptions = computed<SelectOption[]>(() => [
    { label: '全部', value: '' },
    ...Array.from({ length: 5 }, (_, i) => ({ label: `${5 - i}`, value: 5 - i })),
]);

// 最高颜色选项 - 从大到小排列
const gradeOptions = computed<SelectOption[]>(() => [
    { label: '全部', value: '' },
    ...Array.from({ length: 5 }, (_, i) => ({ label: `${5 - i}`, value: 5 - i })),
]);

// 最高阶级选项 - 从大到小排列，并添加文字说明
const tierOptions = computed<SelectOption[]>(() => [
    { label: '全部', value: '' },
    ...Array.from({ length: 5 }, (_, i) => {
        const tier = 6 - i;
        const tierName = TIER_NAME_MAP[tier] || '';
        return { label: `${tierName}（${tier}）`, value: tier };
    }),
]);
</script>
