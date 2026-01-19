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

            <!-- 性格过滤 -->
            <div class="flex flex-col w-40">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">性格</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.align"
                        placeholder="全部"
                        size="small"
                        :options="alignOptions"
                    ></NSelect>
                </div>
            </div>

            <!-- 提升属性过滤 -->
            <div class="flex flex-col w-56">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">提升属性</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.inc"
                        placeholder="全部"
                        size="small"
                        :options="statOptions"
                    ></NSelect>
                </div>
            </div>

            <!-- 降低属性过滤 -->
            <div class="flex flex-col w-56">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">降低属性</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.dec"
                        placeholder="全部"
                        size="small"
                        :options="statOptions"
                    ></NSelect>
                </div>
            </div>

            <!-- 仅显示双提升遗物过滤 -->
            <div class="flex flex-col w-56">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm"></label>
                </div>
                <div class="flex items-center h-12">
                    <NCheckbox v-model:checked="filter.showOnlyDoubleInc">仅显示双提升遗物</NCheckbox>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NCheckbox, NInput, NSelect, SelectOption } from 'naive-ui';
import { computed } from 'vue';
import { STAT_DISPLAY_NAME_MAP, STAT_ORDER } from './RelicBrew';
import { IRelicBrewFilter } from './types';

// 使用defineModel双向绑定过滤器
const filter = defineModel<IRelicBrewFilter>('filter', {
    type: Object,
    required: true,
});

// 性格选项
const alignOptions = computed<SelectOption[]>(() => [
    { label: '全部', value: '' },
    { label: '善', value: '善' },
    { label: '中立', value: '中立' },
    { label: '恶', value: '恶' },
]);

// 属性选项（按指定顺序排列，添加"全部"选项）
const statOptions = computed<SelectOption[]>(() => {
    return [
        { label: '全部', value: '' },
        ...STAT_ORDER.map((stat) => ({
            label: STAT_DISPLAY_NAME_MAP[stat] || stat,
            value: stat,
        })),
    ];
});
</script>
