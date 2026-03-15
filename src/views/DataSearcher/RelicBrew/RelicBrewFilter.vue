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
            <div class="flex flex-col w-24">
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
            <div class="flex flex-col w-32">
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
            <div class="flex flex-col w-32">
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

            <!-- 推荐类别过滤 -->
            <div class="flex flex-col w-32">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">推荐类别</label>
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
import { computed, onMounted, toRefs } from 'vue';
import { useMonsterStore } from '../Monster/monsterStore';
import { DEFAULT_STAT_ORDER, STAT_DISPLAY_NAME_MAP } from './RelicBrew';
import { IRelicBrewFilter } from './types';

// 使用defineModel双向绑定过滤器
const filter = defineModel<IRelicBrewFilter>('filter', {
    type: Object,
    required: true,
});

// 获取relicBrewStore
const monsterStore = useMonsterStore();
const { loadAllData } = monsterStore;
const { relicStatList, reliceCategoryList } = toRefs(monsterStore);

onMounted(() => {
    // 确保数据已加载
    loadAllData();
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
    // 使用statList，如果为空则使用默认顺序
    const stats = relicStatList.value.length > 0 ? relicStatList.value : DEFAULT_STAT_ORDER;
    return [
        { label: '全部', value: '' },
        ...stats.map((stat) => ({
            label: STAT_DISPLAY_NAME_MAP[stat] || stat,
            value: stat,
        })),
    ];
});

// 推荐类别选项
const categoryOptions = computed<SelectOption[]>(() => {
    return [
        { label: '全部', value: '' },
        ...reliceCategoryList.value.map((category) => ({
            label: category,
            value: category,
        })),
    ];
});
</script>
