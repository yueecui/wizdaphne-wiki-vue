<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
        <div>
            <div class="text-2xl text-light font-bold mt-4">
                {{ junkItem.name }}
                <span v-if="junkItem.notObt" class="text-sm ml-1 text-red-400">无法获取</span>
            </div>
            <div class="text-sm text-gray-400" v-if="junkItem.data.name != junkItem.name">{{ junkItem.data.name }}</div>
            <div class="text-sm text-gray-400" v-if="isSystemAdmin">Unique Code: {{ junkItem.uniqueCode }}</div>
            <div class="mt-2 p-3 bg-gray-800/50 rounded" v-if="junkItem.description">
                <div class="text-sm text-gray-300">{{ junkItem.description }}</div>
            </div>
            <div class="mt-4 flex gap-2">
                <NButton v-if="isSystemAdmin" size="small" type="error" class="mt-2" @click="openRawDataTable">
                    查看原始数据
                </NButton>
                <NButton v-if="isSystemAdmin" size="small" type="error" class="mt-2" @click="openEditModal">
                    编辑补充数据
                </NButton>
            </div>
        </div>

        <!-- 标签页 -->
        <NTabs type="card" size="small" v-model:value="activeTab">
            <!-- 第一页：物品列表 -->
            <NTabPane name="items" tab="物品列表">
                <table class="wikitable w-full text-center mt-2!">
                    <thead>
                        <tr>
                            <th>物品名称</th>
                            <th>阶级</th>
                            <th>出现几率</th>
                            <th>最高星级</th>
                            <th>最高颜色</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in itemData.filter((item) => item.totalRate > 0)"
                            :key="item.name"
                            class="cursor-pointer hover:bg-[#3a312a]!"
                            @click="handleItemClick(item.name)"
                        >
                            <td class="text-left">{{ item.displayName }}</td>
                            <td>{{ getTierTableDisplayName(item.tier) }}</td>
                            <td>{{ (item.totalRate * 100).toFixed(4) }}%</td>
                            <td>{{ item.maxQuality }}</td>
                            <td :class="getGradeColorClass(item.maxGrade)">{{ item.maxGrade }}</td>
                        </tr>
                    </tbody>
                </table>
                <p class="text-gray-400">※ 点击可查看单个物品几率</p>
            </NTabPane>

            <!-- 第二页：按阶级 -->
            <NTabPane name="tier" tab="按阶级">
                <div class="flex flex-col gap-2 mt-2">
                    <div class="text-md text-light font-semibold bg-black/50 px-2 py-1">综合</div>
                    <table class="wikitable w-full text-center m-0!">
                        <thead>
                            <tr>
                                <th>阶级</th>
                                <th>数量</th>
                                <th>最高星级</th>
                                <th>最高颜色</th>
                                <th>出现几率</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in tierData.filter((item) => item.totalRate > 0)" :key="item.tier">
                                <td>{{ getTierTableDisplayName(item.tier) }}</td>
                                <td>{{ item.itemCount }}</td>
                                <td>{{ item.maxQuality }}</td>
                                <td :class="getGradeColorClass(item.maxGrade)">{{ item.maxGrade }}</td>
                                <td>{{ (item.totalRate * 100).toFixed(4) }}%</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- 各阶级详细信息 -->
                    <template v-for="tierDetail in detailedTierData" :key="tierDetail.tier">
                        <div class="text-md text-light font-semibold bg-black/50 px-2 py-1 mt-4">
                            阶级 {{ getTierDisplayName(tierDetail.tier) }}
                        </div>

                        <!-- 质量和等级几率表（并排显示） -->
                        <div class="flex flex-col md:flex-row gap-2">
                            <!-- 质量几率表 -->
                            <div class="flex-1">
                                <table class="wikitable w-full text-center m-0!">
                                    <thead>
                                        <tr>
                                            <th>星级</th>
                                            <th>阶级内几率</th>
                                            <th>杂物内几率</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr
                                            v-for="item in tierDetail.qualityRatesArray.filter((item) => item.rate > 0)"
                                            :key="item.quality"
                                        >
                                            <td>{{ item.quality }}</td>
                                            <td>{{ ((item.rate / tierDetail.totalRate) * 100).toFixed(4) }}%</td>
                                            <td>{{ (item.rate * 100).toFixed(4) }}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- 等级几率表 -->
                            <div class="flex-1">
                                <table class="wikitable w-full text-center m-0!">
                                    <thead>
                                        <tr>
                                            <th>颜色</th>
                                            <th>阶级内几率</th>
                                            <th>杂物内几率</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr
                                            v-for="item in tierDetail.gradeRatesArray.filter((item) => item.rate > 0)"
                                            :key="item.grade"
                                        >
                                            <td :class="getGradeColorClass(item.grade)">{{ item.grade }}</td>
                                            <td>{{ ((item.rate / tierDetail.totalRate) * 100).toFixed(4) }}%</td>
                                            <td>{{ (item.rate * 100).toFixed(4) }}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 高星级高颜色组合几率表（质量 >=3 且 等级 >=3） -->
                        <div v-if="tierDetail.comboRatesArray.length > 0">
                            <table class="wikitable w-full text-center m-0!">
                                <thead>
                                    <tr>
                                        <th>品质</th>
                                        <th>阶级内几率</th>
                                        <th>杂物内几率</th>
                                        <th>平均需杂物数</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="item in tierDetail.comboRatesArray.filter((item) => item.rate > 0)"
                                        :key="`${item.quality}-${item.grade}`"
                                    >
                                        <td :class="getGradeColorClass(item.grade)">
                                            {{ getQualityDisplay(item.quality, item.grade) }}
                                        </td>
                                        <td>{{ ((item.rate / tierDetail.totalRate) * 100).toFixed(4) }}%</td>
                                        <td>{{ (item.rate * 100).toFixed(4) }}%</td>
                                        <td>{{ item.rate > 0 ? (1 / item.rate).toFixed(0) : '∞' }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>
                </div>
            </NTabPane>

            <!-- 第二页：按星级 -->
            <NTabPane name="quality" tab="按星级">
                <div class="flex flex-col gap-2 pt-2">
                    <div class="text-md text-light font-semibold bg-black/50 px-2 py-1">按星级</div>
                    <table class="wikitable w-full text-center m-0!">
                        <thead>
                            <tr>
                                <th>星级</th>
                                <th>数量</th>
                                <th>最高颜色</th>
                                <th>最高阶级</th>
                                <th>出现几率</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in qualityData.filter((item) => item.totalRate > 0)" :key="item.quality">
                                <td>{{ item.quality }}</td>
                                <td>{{ item.itemCount }}</td>
                                <td :class="getGradeColorClass(item.maxGrade)">{{ item.maxGrade }}</td>
                                <td>{{ item.maxTier }}</td>
                                <td>{{ (item.totalRate * 100).toFixed(4) }}%</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- 各星级详细信息 -->
                    <template v-for="qualityDetail in detailedQualityData" :key="qualityDetail.quality">
                        <div class="text-md text-light font-semibold bg-black/50 px-2 py-1 mt-4">
                            {{ getQualityDisplay(qualityDetail.quality, 1) }}
                        </div>

                        <!-- 颜色和阶级几率表（并排显示） -->
                        <div class="flex flex-col md:flex-row gap-2">
                            <!-- 颜色几率表 -->
                            <div class="flex-1">
                                <table class="wikitable w-full text-center m-0!">
                                    <thead>
                                        <tr>
                                            <th>颜色</th>
                                            <th>星级内几率</th>
                                            <th>杂物内几率</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr
                                            v-for="item in qualityDetail.gradeRatesArray.filter(
                                                (item) => item.rate > 0,
                                            )"
                                            :key="item.grade"
                                        >
                                            <td :class="getGradeColorClass(item.grade)">{{ item.grade }}</td>
                                            <td>{{ ((item.rate / qualityDetail.totalRate) * 100).toFixed(4) }}%</td>
                                            <td>{{ (item.rate * 100).toFixed(4) }}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- 阶级几率表 -->
                            <div class="flex-1">
                                <table class="wikitable w-full text-center m-0!">
                                    <thead>
                                        <tr>
                                            <th>阶级</th>
                                            <th>星级内几率</th>
                                            <th>杂物内几率</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr
                                            v-for="item in qualityDetail.tierRatesArray.filter((item) => item.rate > 0)"
                                            :key="item.tier"
                                        >
                                            <td>{{ getTierTableDisplayName(item.tier) }}</td>
                                            <td>{{ ((item.rate / qualityDetail.totalRate) * 100).toFixed(4) }}%</td>
                                            <td>{{ (item.rate * 100).toFixed(4) }}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 高颜色高阶级组合几率表（颜色 >=3 且 阶级 >=3） -->
                        <div v-if="qualityDetail.comboRatesArray.length > 0">
                            <table class="wikitable w-full text-center m-0!">
                                <thead>
                                    <tr>
                                        <th>品质</th>
                                        <th>星级内几率</th>
                                        <th>杂物内几率</th>
                                        <th>平均需杂物数</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="item in qualityDetail.comboRatesArray.filter((item) => item.rate > 0)"
                                        :key="`${item.grade}-${item.tier}`"
                                    >
                                        <td :class="getGradeColorClass(item.grade)">
                                            {{ getQualityDisplay(qualityDetail.quality, item.grade) }}
                                        </td>
                                        <td>{{ ((item.rate / qualityDetail.totalRate) * 100).toFixed(4) }}%</td>
                                        <td>{{ (item.rate * 100).toFixed(4) }}%</td>
                                        <td>{{ item.rate > 0 ? (1 / item.rate).toFixed(0) : '∞' }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>
                </div>
            </NTabPane>

            <!-- 第三页：按颜色 -->
            <NTabPane name="grade" tab="按颜色">
                <div class="flex flex-col gap-2 pt-2">
                    <div class="text-md text-light font-semibold bg-black/50 px-2 py-1">按颜色</div>
                    <table class="wikitable w-full text-center m-0!">
                        <thead>
                            <tr>
                                <th>颜色</th>
                                <th>数量</th>
                                <th>最高星级</th>
                                <th>最高阶级</th>
                                <th>出现几率</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="item in gradeData.filter((item) => item.totalRate > 0)" :key="item.grade">
                                <td :class="getGradeColorClass(item.grade)">{{ item.grade }}</td>
                                <td>{{ item.itemCount }}</td>
                                <td>{{ item.maxQuality }}</td>
                                <td>{{ item.maxTier }}</td>
                                <td>{{ (item.totalRate * 100).toFixed(4) }}%</td>
                            </tr>
                        </tbody>
                    </table>

                    <!-- 各颜色详细信息 -->
                    <template v-for="gradeDetail in detailedGradeData" :key="gradeDetail.grade">
                        <div
                            class="text-md font-semibold bg-black/50 px-2 py-1 mt-4"
                            :class="getGradeColorClass(gradeDetail.grade)"
                        >
                            颜色 {{ gradeDetail.grade }}
                        </div>

                        <!-- 星级和阶级几率表（并排显示） -->
                        <div class="flex flex-col md:flex-row gap-2">
                            <!-- 星级几率表 -->
                            <div class="flex-1">
                                <table class="wikitable w-full text-center m-0!">
                                    <thead>
                                        <tr>
                                            <th>星级</th>
                                            <th>颜色内几率</th>
                                            <th>杂物内几率</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr
                                            v-for="item in gradeDetail.qualityRatesArray.filter(
                                                (item) => item.rate > 0,
                                            )"
                                            :key="item.quality"
                                        >
                                            <td>{{ item.quality }}</td>
                                            <td>{{ ((item.rate / gradeDetail.totalRate) * 100).toFixed(4) }}%</td>
                                            <td>{{ (item.rate * 100).toFixed(4) }}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- 阶级几率表 -->
                            <div class="flex-1">
                                <table class="wikitable w-full text-center m-0!">
                                    <thead>
                                        <tr>
                                            <th>阶级</th>
                                            <th>颜色内几率</th>
                                            <th>杂物内几率</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr
                                            v-for="item in gradeDetail.tierRatesArray.filter((item) => item.rate > 0)"
                                            :key="item.tier"
                                        >
                                            <td>{{ getTierTableDisplayName(item.tier) }}</td>
                                            <td>{{ ((item.rate / gradeDetail.totalRate) * 100).toFixed(4) }}%</td>
                                            <td>{{ (item.rate * 100).toFixed(4) }}%</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 高星级高阶级组合几率表（星级 >=3 且 阶级 >=3） -->
                        <div v-if="gradeDetail.comboRatesArray.length > 0">
                            <table class="wikitable w-full text-center m-0!">
                                <thead>
                                    <tr>
                                        <th>品质</th>
                                        <th>颜色内几率</th>
                                        <th>杂物内几率</th>
                                        <th>平均需杂物数</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr
                                        v-for="item in gradeDetail.comboRatesArray.filter((item) => item.rate > 0)"
                                        :key="`${item.quality}-${item.tier}`"
                                    >
                                        <td :class="getGradeColorClass(gradeDetail.grade)">
                                            {{ getQualityDisplay(item.quality, gradeDetail.grade) }}
                                        </td>
                                        <td>{{ ((item.rate / gradeDetail.totalRate) * 100).toFixed(4) }}%</td>
                                        <td>{{ (item.rate * 100).toFixed(4) }}%</td>
                                        <td>{{ item.rate > 0 ? (1 / item.rate).toFixed(0) : '∞' }}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </template>
                </div>
            </NTabPane>

            <!-- 动态标签页：选中物品的品质几率 -->
            <NTabPane v-if="selectedItemName" name="item-detail" :tab="selectedItemDisplayName">
                <div
                    class="text-md text-light font-semibold bg-black/50 px-2 py-1 mt-4 flex items-center justify-between"
                >
                    「{{ selectedItemDisplayName }}」出现几率
                    <NButton size="tiny" type="primary" class="ml-2" @click="showEquipmentDetail">查看装备</NButton>
                </div>

                <table class="wikitable w-full text-center">
                    <thead>
                        <tr>
                            <th>品质</th>
                            <th>物品内几率</th>
                            <th>杂物内几率</th>
                            <th>平均需杂物数</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in selectedItemQualityData.filter((item) => item.junkInnerRate > 0)"
                            :key="`${item.quality}-${item.grade}`"
                        >
                            <td :class="getGradeColorClass(item.grade)">
                                {{ getQualityDisplay(item.quality, item.grade) }}
                            </td>
                            <td>{{ (item.itemInnerRate * 100).toFixed(4) }}%</td>
                            <td>{{ (item.junkInnerRate * 100).toFixed(4) }}%</td>
                            <td>{{ item.averageAttempts === Infinity ? '∞' : item.averageAttempts }}</td>
                        </tr>
                    </tbody>
                </table>
            </NTabPane>
        </NTabs>

        <div class="flex justify-center gap-4" v-if="onClose">
            <NButton size="small" type="warning" @click="onClose">关闭</NButton>
        </div>
    </div>

    <!-- 装备详情模态框 -->
    <NModal v-model:show="isShowDetail">
        <template v-if="showDetailEquipment">
            <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                <EquipmentCard v-if="showDetailEquipment" :equipment="showDetailEquipment" :onClose="closeDetail" />
            </div>
        </template>
    </NModal>

    <!-- 原始数据表格模态框 -->
    <NModal
        v-model:show="isShowRawData"
        size="huge"
        class="huiji-css-hook bg-transparent!"
        :mask-closable="true"
        :closable="true"
    >
        <div class="w-[95%] h-[90vh] m-auto huiji-css-hook bg-transparent!">
            <RawDataTable :junkItem="junkItem" :onClose="closeRawDataTable" />
        </div>
    </NModal>

    <!-- 补充数据编辑模态框 -->
    <NModal
        v-model:show="isShowEditModal"
        size="large"
        class="huiji-css-hook bg-transparent!"
        :mask-closable="true"
        :closable="true"
    >
        <div class="w-[90%] md:w-[600px] m-auto huiji-css-hook bg-transparent!">
            <JunkSupplementaryEditor :junkItem="junkItem" @cancel="closeEditModal" @submit="onEditSubmit" />
        </div>
    </NModal>
</template>

<script setup lang="ts">
import { NButton, NModal, NTabPane, NTabs } from 'naive-ui';
import { computed, ref, toRefs, watch } from 'vue';
import type { Equipment } from '../Equipment/Equipment';
import EquipmentCard from '../Equipment/EquipmentCard.vue';
import { useEquipmentStore } from '../Equipment/equipmentStore';
import { getGradeColorClass, getQualityDisplay, getTierDisplayName, getTierTableDisplayName } from './constants';
import { JunkItem } from './JunkItem';
import type { IJunkItemData } from './types';
// 导入原始数据表格组件
import { MwConfig } from '../../../huiji/MwConfig';
import RawDataTable from './RawDataTable.vue';
// 导入补充数据编辑器组件
import { useJunkStore } from './junkStore';
import JunkSupplementaryEditor from './JunkSupplementaryEditor.vue';

const props = defineProps<{
    junkItem: JunkItem;
    onClose?: () => void;
}>();

// 获取杂物store
const junkStore = useJunkStore();

// 当前选中的物品名称
const selectedItemName = ref<string | null>(null);

// 当前激活的标签页
const activeTab = ref('items');

// 当junkItem变化时，清空选中的物品
watch(
    () => props.junkItem.name,
    () => {
        selectedItemName.value = null;
        activeTab.value = 'items';
    },
);

// 点击物品列表行时触发
const handleItemClick = (itemName: string) => {
    selectedItemName.value = itemName;
    activeTab.value = 'item-detail';
};

// 按阶级分组的数据
const tierData = computed(() => {
    const data = new Map<
        number,
        { maxQuality: number; maxGrade: number; totalRate: number; uniqueItems: Set<string> }
    >();

    props.junkItem.items.forEach((item: IJunkItemData) => {
        const tier = item.tier;

        if (!data.has(tier)) {
            data.set(tier, {
                maxQuality: item.quality,
                maxGrade: item.grade,
                totalRate: item.rates,
                uniqueItems: new Set([item.name]),
            });
        } else {
            const current = data.get(tier)!;
            current.maxQuality = Math.max(current.maxQuality, item.quality);
            current.maxGrade = Math.max(current.maxGrade, item.grade);
            current.totalRate += item.rates;
            current.uniqueItems.add(item.name);
        }
    });

    // 转换为数组格式，方便模板渲染
    return Array.from(data.entries())
        .map(([tier, info]) => ({
            tier,
            maxQuality: info.maxQuality,
            maxGrade: info.maxGrade,
            totalRate: info.totalRate,
            itemCount: info.uniqueItems.size,
        }))
        .sort((a, b) => a.tier - b.tier);
});

// 详细的阶级数据（包含质量和等级的几率分布）
const detailedTierData = computed(() => {
    const data = new Map<
        number,
        {
            qualityRates: Map<number, number>;
            gradeRates: Map<number, number>;
            comboRates: Map<string, number>;
            totalRate: number;
        }
    >();

    props.junkItem.items.forEach((item: IJunkItemData) => {
        const tier = item.tier;
        const quality = item.quality;
        const grade = item.grade;
        const rate = item.rates;

        if (!data.has(tier)) {
            data.set(tier, {
                qualityRates: new Map(),
                gradeRates: new Map(),
                comboRates: new Map(),
                totalRate: 0,
            });
        }

        const tierData = data.get(tier)!;
        tierData.totalRate += rate;

        // 质量分布
        tierData.qualityRates.set(quality, (tierData.qualityRates.get(quality) || 0) + rate);

        // 等级分布
        tierData.gradeRates.set(grade, (tierData.gradeRates.get(grade) || 0) + rate);

        // 质量 >=3 且 等级 >=3 的组合
        if (quality >= 3 && grade >= 3) {
            const key = `${quality}-${grade}`;
            tierData.comboRates.set(key, (tierData.comboRates.get(key) || 0) + rate);
        }
    });

    // 转换为数组格式并按阶级降序排序
    return Array.from(data.entries())
        .map(([tier, info]) => ({
            tier,
            ...info,
            // 将Map转换为数组以便模板渲染
            qualityRatesArray: Array.from(info.qualityRates.entries())
                .map(([quality, rate]) => ({ quality, rate }))
                .sort((a, b) => a.quality - b.quality),
            gradeRatesArray: Array.from(info.gradeRates.entries())
                .map(([grade, rate]) => ({ grade, rate }))
                .sort((a, b) => a.grade - b.grade),
            comboRatesArray: Array.from(info.comboRates.entries())
                .map(([key, rate]) => {
                    const [quality, grade] = key.split('-').map(Number);
                    return { quality, grade, rate };
                })
                .sort((a, b) => {
                    // 先按质量降序，再按等级降序
                    if (a.quality !== b.quality) {
                        return b.quality - a.quality;
                    }
                    return b.grade - a.grade;
                }),
        }))
        .sort((a, b) => b.tier - a.tier); // 按阶级降序排列
});

// 详细的星级数据（包含颜色和阶级的几率分布）
const detailedQualityData = computed(() => {
    const data = new Map<
        number,
        {
            gradeRates: Map<number, number>;
            tierRates: Map<number, number>;
            comboRates: Map<string, number>;
            totalRate: number;
        }
    >();

    props.junkItem.items.forEach((item: IJunkItemData) => {
        const quality = item.quality;
        const grade = item.grade;
        const tier = item.tier;
        const rate = item.rates;

        if (!data.has(quality)) {
            data.set(quality, {
                gradeRates: new Map(),
                tierRates: new Map(),
                comboRates: new Map(),
                totalRate: 0,
            });
        }

        const qualityData = data.get(quality)!;
        qualityData.totalRate += rate;

        // 颜色分布
        qualityData.gradeRates.set(grade, (qualityData.gradeRates.get(grade) || 0) + rate);

        // 阶级分布
        qualityData.tierRates.set(tier, (qualityData.tierRates.get(tier) || 0) + rate);

        // 颜色 >=3 且 阶级 >=3 的组合
        if (grade >= 3 && tier >= 3) {
            const key = `${grade}-${tier}`;
            qualityData.comboRates.set(key, (qualityData.comboRates.get(key) || 0) + rate);
        }
    });

    // 转换为数组格式并按星级降序排序
    return Array.from(data.entries())
        .map(([quality, info]) => ({
            quality,
            ...info,
            // 将Map转换为数组以便模板渲染
            gradeRatesArray: Array.from(info.gradeRates.entries())
                .map(([grade, rate]) => ({ grade, rate }))
                .sort((a, b) => a.grade - b.grade),
            tierRatesArray: Array.from(info.tierRates.entries())
                .map(([tier, rate]) => ({ tier, rate }))
                .sort((a, b) => a.tier - b.tier),
            comboRatesArray: Array.from(info.comboRates.entries())
                .map(([key, rate]) => {
                    const [grade, tier] = key.split('-').map(Number);
                    return { grade, tier, rate };
                })
                .sort((a, b) => {
                    // 先按颜色降序，再按阶级降序
                    if (a.grade !== b.grade) {
                        return b.grade - a.grade;
                    }
                    return b.tier - a.tier;
                }),
        }))
        .sort((a, b) => b.quality - a.quality); // 按星级降序排列
});

// 详细的颜色数据（包含星级和阶级的几率分布）
const detailedGradeData = computed(() => {
    const data = new Map<
        number,
        {
            qualityRates: Map<number, number>;
            tierRates: Map<number, number>;
            comboRates: Map<string, number>;
            totalRate: number;
        }
    >();

    props.junkItem.items.forEach((item: IJunkItemData) => {
        const grade = item.grade;
        const quality = item.quality;
        const tier = item.tier;
        const rate = item.rates;

        if (!data.has(grade)) {
            data.set(grade, {
                qualityRates: new Map(),
                tierRates: new Map(),
                comboRates: new Map(),
                totalRate: 0,
            });
        }

        const gradeData = data.get(grade)!;
        gradeData.totalRate += rate;

        // 星级分布
        gradeData.qualityRates.set(quality, (gradeData.qualityRates.get(quality) || 0) + rate);

        // 阶级分布
        gradeData.tierRates.set(tier, (gradeData.tierRates.get(tier) || 0) + rate);

        // 星级 >=3 且 阶级 >=3 的组合
        if (quality >= 3 && tier >= 3) {
            const key = `${quality}-${tier}`;
            gradeData.comboRates.set(key, (gradeData.comboRates.get(key) || 0) + rate);
        }
    });

    // 转换为数组格式并按颜色降序排序
    return Array.from(data.entries())
        .map(([grade, info]) => ({
            grade,
            ...info,
            // 将Map转换为数组以便模板渲染
            qualityRatesArray: Array.from(info.qualityRates.entries())
                .map(([quality, rate]) => ({ quality, rate }))
                .sort((a, b) => a.quality - b.quality),
            tierRatesArray: Array.from(info.tierRates.entries())
                .map(([tier, rate]) => ({ tier, rate }))
                .sort((a, b) => a.tier - b.tier),
            comboRatesArray: Array.from(info.comboRates.entries())
                .map(([key, rate]) => {
                    const [quality, tier] = key.split('-').map(Number);
                    return { quality, tier, rate };
                })
                .sort((a, b) => {
                    // 先按星级降序，再按阶级降序
                    if (a.quality !== b.quality) {
                        return b.quality - a.quality;
                    }
                    return b.tier - a.tier;
                }),
        }))
        .sort((a, b) => b.grade - a.grade); // 按颜色降序排列
});

// 按星级分组的数据
const qualityData = computed(() => {
    const data = new Map<number, { maxGrade: number; maxTier: number; totalRate: number; uniqueItems: Set<string> }>();

    props.junkItem.items.forEach((item: IJunkItemData) => {
        const quality = item.quality;

        if (!data.has(quality)) {
            data.set(quality, {
                maxGrade: item.grade,
                maxTier: item.tier,
                totalRate: item.rates,
                uniqueItems: new Set([item.name]),
            });
        } else {
            const current = data.get(quality)!;
            current.maxGrade = Math.max(current.maxGrade, item.grade);
            current.maxTier = Math.max(current.maxTier, item.tier);
            current.totalRate += item.rates;
            current.uniqueItems.add(item.name);
        }
    });

    // 转换为数组格式，方便模板渲染
    return Array.from(data.entries())
        .map(([quality, info]) => ({
            quality,
            maxGrade: info.maxGrade,
            maxTier: info.maxTier,
            totalRate: info.totalRate,
            itemCount: info.uniqueItems.size,
        }))
        .sort((a, b) => a.quality - b.quality);
});

// 按颜色分组的数据
const gradeData = computed(() => {
    const data = new Map<
        number,
        { maxQuality: number; maxTier: number; totalRate: number; uniqueItems: Set<string> }
    >();

    props.junkItem.items.forEach((item: IJunkItemData) => {
        const grade = item.grade;

        if (!data.has(grade)) {
            data.set(grade, {
                maxQuality: item.quality,
                maxTier: item.tier,
                totalRate: item.rates,
                uniqueItems: new Set([item.name]),
            });
        } else {
            const current = data.get(grade)!;
            current.maxQuality = Math.max(current.maxQuality, item.quality);
            current.maxTier = Math.max(current.maxTier, item.tier);
            current.totalRate += item.rates;
            current.uniqueItems.add(item.name);
        }
    });

    // 转换为数组格式，方便模板渲染
    return Array.from(data.entries())
        .map(([grade, info]) => ({
            grade,
            maxQuality: info.maxQuality,
            maxTier: info.maxTier,
            totalRate: info.totalRate,
            itemCount: info.uniqueItems.size,
        }))
        .sort((a, b) => a.grade - b.grade);
});

// 按物品分组的数据
const itemData = computed(() => {
    const data = new Map<
        string,
        { displayName: string; totalRate: number; maxQuality: number; maxGrade: number; tier: number; sort: number }
    >();

    props.junkItem.items.forEach((item: IJunkItemData) => {
        const name = item.name;

        if (!data.has(name)) {
            data.set(name, {
                displayName: item.name_cn || item.name,
                totalRate: item.rates,
                maxQuality: item.quality,
                maxGrade: item.grade,
                tier: item.tier,
                sort: item.sort,
            });
        } else {
            const current = data.get(name)!;
            current.totalRate += item.rates;
            current.maxQuality = Math.max(current.maxQuality, item.quality);
            current.maxGrade = Math.max(current.maxGrade, item.grade);
        }
    });

    // 转换为数组格式，方便模板渲染
    return Array.from(data.entries())
        .map(([name, info]) => ({
            name,
            ...info,
        }))
        .sort((a, b) => {
            // 优先按tier，低tier在前，其次按sort，低sort在前
            if (a.tier !== b.tier) {
                return a.tier - b.tier;
            }
            return a.sort - b.sort;
        });
});

// 当前选中物品的品质几率数据
const selectedItemQualityData = computed(() => {
    if (!selectedItemName.value) return [];

    // 按品质和等级分组计算几率
    const qualityData = new Map<string, { quality: number; grade: number; rate: number }>();
    const totalItemRate = ref(0);
    const totalJunkRate = ref(0);

    props.junkItem.items.forEach((item: IJunkItemData) => {
        // 累加所有杂物的总几率
        totalJunkRate.value += item.rates;

        if (item.name === selectedItemName.value) {
            // 累加该物品的总几率
            totalItemRate.value += item.rates;

            const key = `${item.quality}-${item.grade}`;
            if (!qualityData.has(key)) {
                qualityData.set(key, {
                    quality: item.quality,
                    grade: item.grade,
                    rate: item.rates,
                });
            } else {
                const current = qualityData.get(key)!;
                current.rate += item.rates;
            }
        }
    });

    // 转换为数组并计算几率
    return Array.from(qualityData.entries())
        .map(([key, info]) => ({
            quality: info.quality,
            grade: info.grade,
            itemRate: info.rate,
            itemInnerRate: totalItemRate.value > 0 ? info.rate / totalItemRate.value : 0,
            junkInnerRate: totalJunkRate.value > 0 ? info.rate / totalJunkRate.value : 0,
            averageAttempts: info.rate > 0 ? Math.round(1 / info.rate) : Infinity,
        }))
        .sort((a, b) => {
            // 先按品质降序，再按等级降序
            if (a.quality !== b.quality) {
                return b.quality - a.quality;
            }
            return b.grade - a.grade;
        });
});

// 当前选中物品的显示名称
const selectedItemDisplayName = computed(() => {
    if (!selectedItemName.value) return '';
    const item = itemData.value.find((i) => i.name === selectedItemName.value);
    return item ? item.displayName : selectedItemName.value;
});

// 装备详情模态框相关状态
const isShowDetail = ref(false);
const showDetailEquipment = ref<Equipment | null>(null);
const { equipments } = toRefs(useEquipmentStore());

// 原始数据表格相关状态
const isShowRawData = ref(false);

// 显示原始数据表格
const openRawDataTable = () => {
    isShowRawData.value = true;
};

// 关闭原始数据表格
const closeRawDataTable = () => {
    isShowRawData.value = false;
};

// 显示装备详情
const showEquipmentDetail = () => {
    if (!selectedItemName.value) return;
    // 根据选中的物品名称查找对应的装备
    const equipment = equipments.value.find((eq) => eq.data.njp === selectedItemName.value);
    if (equipment) {
        showDetailEquipment.value = equipment;
        isShowDetail.value = true;
    } else {
        console.warn(`未找到装备: ${selectedItemName.value}`);
    }
};

// 关闭装备详情
const closeDetail = () => {
    isShowDetail.value = false;
    showDetailEquipment.value = null;
};

// 检查用户是否为系统管理员
const isSystemAdmin = computed(() => {
    // 使用 MwConfig 类检查用户是否为系统管理员
    return MwConfig.getInstance().isSystemAdmin;
});

// 补充数据编辑模态框相关状态
const isShowEditModal = ref(false);

// 打开补充数据编辑模态框
const openEditModal = () => {
    isShowEditModal.value = true;
};

// 关闭补充数据编辑模态框
const closeEditModal = () => {
    isShowEditModal.value = false;
};

// 提交补充数据编辑
const onEditSubmit = () => {
    // 关闭模态框
    isShowEditModal.value = false;
    // 刷新当前杂物的补充数据
    if (junkStore.junkItems.length > 0) {
        // 重新加载数据以更新显示
        junkStore.loadJunkData();
    }
};
</script>
