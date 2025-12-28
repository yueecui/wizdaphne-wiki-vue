<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
        <!-- 标题部分 -->
        <div>
            <div class="text-3xl text-light font-bold mt-2">{{ equipment.data.n }}</div>
            <div class="text-sm text-gray-400" v-if="equipment.data.njp">
                {{ equipment.data.njp }}
            </div>
        </div>

        <!-- 装备基本信息表格（左右分栏） -->
        <div class="flex flex-col md:flex-row gap-4">
            <!-- 左边表格：装备类型、阶级、主要来源、其他说明 -->
            <div class="flex-1">
                <table class="wikitable w-full text-center m-0!">
                    <tbody>
                        <tr>
                            <th colspan="2">基础</th>
                        </tr>
                        <tr>
                            <th class="w-[7em]">装备类型</th>
                            <td>{{ equipment.data.sub }}</td>
                        </tr>
                        <tr>
                            <th>阶级</th>
                            <td>{{ equipment.data.t }}</td>
                        </tr>
                        <tr>
                            <th>说明</th>
                            <td class="text-left">
                                <div class="text-sm">
                                    <div v-if="equipment.data.req">职业限制：{{ equipment.data.req }}</div>
                                    <div
                                        v-if="equipment.data.desc"
                                        v-html="convertDescription(equipment.data.desc)"
                                    ></div>
                                </div>
                            </td>
                        </tr>
                        <tr v-if="equipment.data.sou">
                            <th>非杂物来源</th>
                            <td class="text-left">
                                <div class="flex flex-col gap-2">
                                    <div v-for="(source, index) in equipment.data.sou" :key="index">
                                        {{ source }}
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <!-- 右边表格：特效 -->
            <div class="flex-1">
                <table
                    class="wikitable w-full text-center m-0!"
                    v-if="
                        (equipment.data.sk && equipment.data.sk.length > 0) ||
                        (equipment.data.csk && equipment.data.csk.length > 0)
                    "
                >
                    <tbody>
                        <tr>
                            <th>特效</th>
                        </tr>
                        <tr>
                            <td class="text-left">
                                <div class="flex flex-col gap-2">
                                    <div
                                        v-for="skill in [...(equipment.data.sk || []), ...(equipment.data.csk || [])]"
                                        :key="skill"
                                    >
                                        <div class="text-light">{{ skill }}</div>
                                        <div class="text-sm text-gray-300" v-html="getSkillDescription(skill)"></div>
                                    </div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <!-- 分页组件 -->
        <NTabs type="card" size="small" v-model:value="activeTab">
            <!-- 第一页：属性值表格 -->
            <NTabPane name="attributes" tab="属性值">
                <div class="mt-2">
                    <table class="wikitable w-full text-center m-0!">
                        <tbody>
                            <template v-if="equipment.data.csk">
                                <tr>
                                    <th class="w-1/6">属性</th>
                                    <th class="w-1/6">+0</th>
                                    <th class="w-1/6">+5</th>
                                    <th class="w-1/6">+10</th>
                                    <th class="w-1/6">+15</th>
                                    <th class="w-1/6">+20</th>
                                </tr>
                                <template v-for="stat in STAT_LIST" :key="stat.k">
                                    <tr>
                                        <th>{{ stat.n }}</th>
                                        <component :is="getTd(equipment, stat.k, 0)" />
                                        <component :is="getTd(equipment, stat.k, 5)" />
                                        <component :is="getTd(equipment, stat.k, 10)" />
                                        <component :is="getTd(equipment, stat.k, 15)" />
                                        <component :is="getTd(equipment, stat.k, 20)" />
                                    </tr>
                                    <tr v-if="stat.k === 'atk' && equipment.data.cate === '武器'">
                                        <th>次数</th>
                                        <component :is="getTd(equipment, 'c', 0)" />
                                    </tr>
                                </template>
                            </template>
                        </tbody>
                    </table>
                </div>
                <div class="text-sm text-gray-400 mt-4">
                    <div>
                        ※
                        +0数据红色表示比同类型装备的基准值低，绿色表示比同类型装备的基准值高。其他强化值数据，绿色表示相比+0有所提升
                    </div>
                    <div>※ 阶级为根据装备图标、主要属性数值或强化费用推测，仅作为参考。</div>
                </div>
            </NTabPane>

            <!-- 杂物来源标签页 -->
            <NTabPane name="junkSources" :tab="junkSourcesTabTitle">
                <div class="mt-2">
                    <!-- 根据杂物数据加载状态显示不同内容 -->
                    <div v-if="!isJunkInit && !isJunkLoading" class="flex justify-center p-4">
                        <NButton type="primary" @click="loadJunkData">加载杂物数据</NButton>
                    </div>

                    <div v-else-if="isJunkLoading" class="flex justify-center p-4">
                        <div>加载中...</div>
                    </div>

                    <div v-else>
                        <table class="wikitable w-full text-center m-0!">
                            <thead>
                                <tr>
                                    <th>杂物名称</th>
                                    <th>最高星级</th>
                                    <th>最高颜色</th>
                                    <th>出现几率</th>
                                    <th>平均杂物数</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-if="filteredJunkItems.length === 0">
                                    <td colspan="5">没有找到能出该装备的杂物</td>
                                </tr>
                                <tr
                                    v-for="junk in filteredJunkItems"
                                    :key="junk.name"
                                    class="cursor-pointer hover:bg-[#3a312a]!"
                                    @click="handleJunkClick(junk)"
                                >
                                    <td class="text-left">{{ junk.name }}</td>
                                    <td>{{ junk.maxGrade }}</td>
                                    <td :class="getGradeColorClass(junk.maxQuality)">{{ junk.maxQuality }}</td>
                                    <td>{{ (junk.totalRate * 100).toFixed(4) }}%</td>
                                    <td>{{ junk.averageCount.toFixed(0) }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </NTabPane>

            <!-- 动态标签页：选中杂物的物品几率 -->
            <NTabPane v-if="selectedJunkItem" name="junk-detail" :tab="selectedJunkItem.name">
                <div class="mt-2">
                    <div class="text-md text-light font-semibold bg-black/50 px-2 py-1 mt-4">
                        「{{ equipment.data.n }}」出现几率
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
                                v-for="item in selectedJunkItemQualityData.filter((item) => item.junkInnerRate > 0)"
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
                </div>
            </NTabPane>
        </NTabs>

        <!-- 操作按钮 -->
        <div class="flex justify-center gap-4" v-if="onClose">
            <NButton size="small" type="error" @click="openEditorModal" v-if="isSystemAdmin">编辑装备属性</NButton>
            <NButton size="small" type="warning" @click="onClose">关闭</NButton>
        </div>

        <!-- 编辑模态框 -->
        <NModal v-model:show="editorModalVisible">
            <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                <EquipmentEditor :equipment="equipment" @cancel="closeEditorModal" @submit="onEditorSubmit" />
            </div>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import { NButton, NModal, NTabPane, NTabs } from 'naive-ui';
import { computed, h, ref, toRefs } from 'vue';
import { MwConfig } from '../../../huiji/MwConfig';
import { getGradeColorClass, getQualityDisplay } from '../Junk/constants';
import type { JunkItem } from '../Junk/JunkItem';
import { useJunkStore } from '../Junk/junkStore';
import { convertDescription } from '../utils/convertDescription';
import { Equipment } from './Equipment';
import EquipmentEditor from './EquipmentEditor.vue';
import { useEquipmentStore } from './equipmentStore';

const props = defineProps<{
    equipment: Equipment;
    onClose?: () => void;
}>();

const { equipmentSkills } = toRefs(useEquipmentStore());
const activeTab = ref('attributes');

// 编辑模态框状态
const editorModalVisible = ref(false);

// MwConfig实例
const mwConfig = MwConfig.getInstance();

// 判断是否为系统管理员
const isSystemAdmin = computed(() => {
    return mwConfig.isSystemAdmin;
});

// 选中的杂物
const selectedJunkItem = ref<JunkItem | null>(null);

// 杂物数据
const { junkItems, isInit: isJunkInit, isLoading: isJunkLoading, loadJunkData } = toRefs(useJunkStore());

// 杂物来源标签页标题
const junkSourcesTabTitle = computed(() => {
    if (!isJunkInit.value || isJunkLoading.value) {
        return '杂物来源';
    }
    return `杂物来源 (${filteredJunkItems.value.length})`;
});

// 点击杂物行时触发
const handleJunkClick = (junk: JunkItem) => {
    selectedJunkItem.value = junk;
    activeTab.value = 'junk-detail';
};

// 筛选能出当前装备的杂物并排序
const filteredJunkItems = computed(() => {
    if (!isJunkInit.value) return [];

    return junkItems.value
        .filter((junkItem) => {
            // 检查杂物是否能出当前装备
            return junkItem.items.some((item) => {
                return item.name === props.equipment.data.njp || item.name_cn === props.equipment.data.n;
            });
        })
        .map((junkItem) => {
            // 找到该杂物中能出当前装备的所有物品条目
            const currentEquipmentItems = junkItem.items.filter((item) => {
                return item.name === props.equipment.data.njp || item.name_cn === props.equipment.data.n;
            });

            // 计算该杂物出当前装备的总几率（所有星级和颜色的几率之和）
            const maxRate = currentEquipmentItems.reduce((sum, item) => sum + item.rates, 0);

            // 计算该杂物出当前装备的最高星级和最高颜色
            const maxQuality = currentEquipmentItems.reduce((max, item) => Math.max(max, item.quality), 0);
            const maxGrade = currentEquipmentItems.reduce((max, item) => Math.max(max, item.grade), 0);

            return {
                ...junkItem,
                totalRate: maxRate,
                maxQuality, // 覆盖原有的maxQuality
                maxGrade, // 覆盖原有的maxGrade
                averageCount: maxRate > 0 ? 1 / maxRate : 0,
            };
        })
        .sort((a, b) => {
            // 按照能出的最高星级、最高颜色、出现几率倒序排序
            if (b.maxGrade !== a.maxGrade) return b.maxGrade - a.maxGrade;
            if (b.maxQuality !== a.maxQuality) return b.maxQuality - a.maxQuality;
            return b.totalRate - a.totalRate;
        });
});

const getSkillDescription = (skillName: string) => {
    const skill = equipmentSkills.value.find((item) => item.n === skillName);
    if (skill) {
        return convertDescription(skill.d);
    } else {
        return '技能描述未找到';
    }
};

const STAT_LIST = [
    {
        n: '攻击力',
        k: 'atk',
    },
    {
        n: '魔力',
        k: 'mag',
    },
    {
        n: '神力',
        k: 'div',
    },
    {
        n: '防御力',
        k: 'def',
    },
    {
        n: '法术防御力',
        k: 'mdef',
    },
    {
        n: '行动速度',
        k: 'spe',
    },
    {
        n: '命中',
        k: 'acc',
    },
    {
        n: '会心',
        k: 'sur',
    },
    {
        n: '回避',
        k: 'eva',
    },
    {
        n: '抵抗',
        k: 'res',
    },
];

const getTd = (item: Equipment, key: string, level: number) => {
    const value = item.getValue(key, level);
    const tdClass: string[] = [];

    tdClass.push(level > 0 ? item.getLvStatColorClass(key, level) : item.getLvZeroStatColorClass(key));

    let text = `${value === null ? '??' : (value ?? 0)}`;
    if (key === 'c') {
        // 攻击次数
        if (value === null) {
            text = '??';
        } else if (item.data.cate === '武器') {
            text = `×${value}`;
        } else {
            text = `-`;
        }

        return h('td', { colspan: 6, class: tdClass.join(' ') }, text);
    }

    return h('td', { class: tdClass.join(' ') }, text);
};

// 打开编辑模态框
const openEditorModal = () => {
    editorModalVisible.value = true;
};

// 关闭编辑模态框
const closeEditorModal = () => {
    editorModalVisible.value = false;
};

// 提交编辑
const onEditorSubmit = () => {
    // 提交功能暂为空
    closeEditorModal();
};

// 当前选中杂物的物品品质几率数据
const selectedJunkItemQualityData = computed(() => {
    if (!selectedJunkItem.value) return [];

    // 按品质和等级分组计算几率
    const qualityData = new Map<string, { quality: number; grade: number; rate: number }>();
    const totalItemRate = ref(0);
    const totalJunkRate = ref(0);

    selectedJunkItem.value.items.forEach((item) => {
        // 累加所有杂物的总几率
        totalJunkRate.value += item.rates;

        // 只计算当前装备的数据
        if (item.name === props.equipment.data.njp || item.name_cn === props.equipment.data.n) {
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
</script>
