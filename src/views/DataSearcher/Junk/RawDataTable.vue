<template>
    <div class="raw-data-table-container bg-[#312721]! p-4 border! border-[#463d38]! rounded">
        <div class="text-2xl font-bold">{{ junkItem.name }}</div>
        <div class="text-sm text-gray-400" v-if="junkItem.data.name != junkItem.name">{{ junkItem.data.name }}</div>
        <div class="text-sm text-gray-400">Unique Code: {{ junkItem.uniqueCode }}</div>

        <div class="mt-4 flex gap-2">
            <NButton size="small" type="primary" @click="printRawData">打印原始数据到控制台</NButton>
            <NButton size="small" type="primary" @click="printData">打印整理数据到控制台</NButton>
        </div>

        <div class="overflow-x-auto">
            <table class="wikitable w-full border-collapse text-center">
                <thead>
                    <tr class="bg-[#2a231e]!">
                        <th class="3xl:w-20" rowspan="2">组号</th>
                        <th class="3xl:w-24" rowspan="2">抽出几率</th>
                        <th class="" rowspan="2">装备</th>
                        <th class="3xl:w-24" rowspan="2">抽出几率</th>
                        <th colspan="5">分星级几率</th>
                        <th colspan="5">分颜色几率</th>
                    </tr>
                    <tr class="bg-[#2a231e]!">
                        <th class="3xl:w-24">★1</th>
                        <th class="3xl:w-24">★2</th>
                        <th class="3xl:w-24">★3</th>
                        <th class="3xl:w-24">★4</th>
                        <th class="3xl:w-24">★5</th>
                        <th class="3xl:w-24">1</th>
                        <th class="3xl:w-24">2</th>
                        <th class="3xl:w-24">3</th>
                        <th class="3xl:w-24">4</th>
                        <th class="3xl:w-24">5</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="(group, groupIndex) in junkItem.data.groups" :key="groupIndex">
                        <!-- 计算组内物品总权重 -->
                        <template v-if="group.items.length > 0">
                            <!-- 组行 -->
                            <tr v-for="(item, itemIndex) in group.items" :key="`${groupIndex}-${itemIndex}`">
                                <!-- 组号 -->
                                <td v-if="itemIndex === 0" :rowspan="group.items.length" class="">
                                    {{ groupIndex + 1 }}
                                </td>

                                <!-- 组提供割合 -->
                                <td v-if="itemIndex === 0" :rowspan="group.items.length" class="">
                                    {{ ((group.weight / totalGroupWeight) * 100).toFixed(4) }}%
                                </td>

                                <!-- 装备名称 -->
                                <td class="">
                                    {{ item.name }}
                                </td>

                                <!-- 装备提供割合 -->
                                <td class="">{{ ((item.weight / groupItemTotalWeight(group)) * 100).toFixed(4) }}%</td>

                                <!-- 品质权重 ★1-★5 -->
                                <td v-for="qualityIndex in 5" :key="`quality-${qualityIndex}`" class="">
                                    {{
                                        item.qualityWeights[qualityIndex - 1] !== undefined
                                            ? (
                                                  (item.qualityWeights[qualityIndex - 1] / qualityTotalWeight(item)) *
                                                  100
                                              ).toFixed(4) + '%'
                                            : '-'
                                    }}
                                </td>

                                <!-- 等级权重 1-5 -->
                                <td v-for="gradeIndex in 5" :key="`grade-${gradeIndex}`" class="">
                                    {{
                                        item.gradeWeights[gradeIndex - 1] !== undefined
                                            ? (
                                                  (item.gradeWeights[gradeIndex - 1] / gradeTotalWeight(item)) *
                                                  100
                                              ).toFixed(4) + '%'
                                            : '-'
                                    }}
                                </td>
                            </tr>
                        </template>
                    </template>
                </tbody>
            </table>
        </div>

        <div class="flex justify-center gap-4 mt-4">
            <NButton size="small" type="warning" @click="onClose">关闭</NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import { computed } from 'vue';
import { useEquipmentStore } from '../Equipment/equipmentStore';
import { JunkItem } from './JunkItem';

const props = defineProps<{
    junkItem: JunkItem;
    onClose?: () => void;
}>();

// 获取装备store
const equipmentStore = useEquipmentStore();

// 计算总组权重
const totalGroupWeight = computed(() => {
    return props.junkItem.data.groups.reduce((sum, group) => sum + group.weight, 0);
});

// 计算组内物品总权重
const groupItemTotalWeight = (group: (typeof props.junkItem.data.groups)[0]) => {
    return group.items.reduce((sum, item) => sum + item.weight, 0);
};

// 定义物品类型
interface GroupItem {
    name: string;
    weight: number;
    qualityWeights: number[];
    gradeWeights: number[];
}

// 计算品质总权重
const qualityTotalWeight = (item: GroupItem) => {
    return item.qualityWeights.reduce((sum, weight) => sum + weight, 0);
};

// 计算等级总权重
const gradeTotalWeight = (item: GroupItem) => {
    return item.gradeWeights.reduce((sum, weight) => sum + weight, 0);
};

// 打印原始数据到控制台
const printRawData = () => {
    (window as any).junkRawData = JSON.parse(JSON.stringify(props.junkItem.raw));
    console.log('原始数据已保存到window.junkRawData');
    console.log((window as any).junkRawData);
};

// 打印整理后的数据到控制台
const printData = () => {
    (window as any).junkData = JSON.parse(JSON.stringify(props.junkItem.data));
    console.log('整理后的数据已保存到window.junkData');
    console.log((window as any).junkData);
};
</script>

<style scoped>
.raw-data-table-container {
    max-height: 90vh;
    overflow-y: auto;
}

.raw-data-table th {
    font-weight: bold;
}

.raw-data-table td,
.raw-data-table th {
    white-space: nowrap;
}
</style>
