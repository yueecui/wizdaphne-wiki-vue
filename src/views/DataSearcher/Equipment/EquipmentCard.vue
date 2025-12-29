<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
        <!-- 标题部分 -->
        <div class="sticky top-0 bg-[#312721] z-10 py-2">
            <div class="text-sm text-light">
                <template v-if="equipment.data.id === 0">Ex</template>
                <template v-else-if="equipment.data.id > 8000">No. ???</template>
                <template v-else>No. {{ equipment.data.id }}</template>
            </div>
            <div class="text-3xl text-light font-bold flex items-baseline gap-4">
                <span>{{ equipment.data.n }}</span>
                <span v-if="equipment.data.soucate === 1" class="text-sm text-blue-300">特典</span>
            </div>
            <div class="text-sm text-gray-400" v-if="equipment.data.njp">
                {{ equipment.data.njp }}
            </div>
        </div>

        <!-- 装备基本信息表格（左右分栏） -->
        <div class="flex flex-row gap-4">
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
                                    :key="junk.junkItem.name"
                                    class="cursor-pointer hover:bg-[#3a312a]!"
                                    @click="handleJunkClick(junk.junkItem)"
                                >
                                    <td class="text-left">
                                        <span
                                            :class="{ 'text-gray-500': junk.junkItem.notObt }"
                                            :style="{ opacity: junk.junkItem.notObt ? '0.6 !important' : 1 }"
                                        >
                                            {{ junk.junkItem.name }}
                                            <span v-if="junk.junkItem.notObt" class="text-xs ml-1">(无法获取)</span>
                                        </span>
                                    </td>
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
            <NTabPane v-if="selectedJunkItem" name="junk-detail" :tab="renderJunkTabTitle">
                <div class="mt-2">
                    <div class="text-sm text-gray-400" v-if="isSystemAdmin">
                        Unique Code: {{ selectedJunkItem.uniqueCode }}
                    </div>
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

            <!-- 加护标签页 -->
            <NTabPane v-if="equipment.bonus" name="bonus" tab="加护">
                <div class="mt-2">
                    <div class="flex items-center mt-4">
                        <div class="flex items-center gap-4">
                            <n-radio-group v-model:value="orderType" class="flex gap-2">
                                <n-radio value="attribute">属性顺序</n-radio>
                                <n-radio value="probability">概率顺序</n-radio>
                            </n-radio-group>
                            <n-button type="primary" size="small" @click="resetBonuses">重置加护选择</n-button>
                        </div>
                    </div>

                    <!-- 4个加护槽的横排并列展示 -->
                    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                        <!-- 加护槽1 -->
                        <div v-if="equipment.bonus[0]" class="flex flex-col gap-2">
                            <div class="text-center text-md text-light font-semibold bg-black/50 px-2 py-1">加护 1</div>
                            <!-- 下拉框 -->
                            <div class="flex justify-center">
                                <n-select
                                    v-model:value="selectedAttributes[0]"
                                    placeholder="请选择属性"
                                    style="width: 100%"
                                    :options="attributeOptions"
                                    clearable
                                    :disabled="isSelectDisabled[0]"
                                    @update:value="handleAttributeSelect(0, $event)"
                                />
                            </div>
                            <!-- 概率表格 -->
                            <table class="wikitable w-full text-center">
                                <thead>
                                    <tr>
                                        <th class="text-left">属性</th>
                                        <th class="text-right">概率</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template v-for="(value, index) in sortedBonuses[0]" :key="index">
                                        <tr v-if="Math.abs(value) > 0.0001">
                                            <th class="text-left">{{ sortedAttributeNames[0]![index] }}</th>
                                            <td class="text-right">{{ parseFloat(value).toFixed(4) }}%</td>
                                        </tr>
                                    </template>
                                    <tr v-if="getNonZeroCount(sortedBonuses[0]) === 0">
                                        <td colspan="2" class="text-center text-gray-400">无属性</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- 加护槽2 -->
                        <div v-if="equipment.bonus[1]" class="flex flex-col gap-2">
                            <div class="text-center text-md text-light font-semibold bg-black/50 px-2 py-1">加护 2</div>
                            <!-- 下拉框 -->
                            <div class="flex justify-center">
                                <n-select
                                    v-model:value="selectedAttributes[1]"
                                    placeholder="请选择属性"
                                    style="width: 100%"
                                    :options="attributeOptions"
                                    clearable
                                    :disabled="isSelectDisabled[1]"
                                    @update:value="handleAttributeSelect(1, $event)"
                                />
                            </div>
                            <!-- 概率表格 -->
                            <table class="wikitable w-full text-center">
                                <thead>
                                    <tr>
                                        <th class="text-left">属性</th>
                                        <th class="text-right">概率</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template v-for="(value, index) in sortedBonuses[1]" :key="index">
                                        <tr v-if="Math.abs(value) > 0.0001">
                                            <th class="text-left">{{ sortedAttributeNames[1]![index] }}</th>
                                            <td class="text-right">{{ parseFloat(value).toFixed(4) }}%</td>
                                        </tr>
                                    </template>
                                    <tr v-if="getNonZeroCount(sortedBonuses[1]) === 0">
                                        <td colspan="2" class="text-center text-gray-400">无属性</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- 加护槽3 -->
                        <div v-if="equipment.bonus[2]" class="flex flex-col gap-2">
                            <div class="text-center text-md text-light font-semibold bg-black/50 px-2 py-1">加护 3</div>
                            <!-- 下拉框 -->
                            <div class="flex justify-center">
                                <n-select
                                    v-model:value="selectedAttributes[2]"
                                    placeholder="请选择属性"
                                    style="width: 100%"
                                    :options="attributeOptions"
                                    clearable
                                    :disabled="isSelectDisabled[2]"
                                    @update:value="handleAttributeSelect(2, $event)"
                                />
                            </div>
                            <!-- 概率表格 -->
                            <table class="wikitable w-full text-center">
                                <thead>
                                    <tr>
                                        <th class="text-left">属性</th>
                                        <th class="text-right">概率</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template v-for="(value, index) in sortedBonuses[2]" :key="index">
                                        <tr v-if="Math.abs(value) > 0.0001">
                                            <th class="text-left">{{ sortedAttributeNames[2]![index] }}</th>
                                            <td class="text-right">{{ parseFloat(value).toFixed(4) }}%</td>
                                        </tr>
                                    </template>
                                    <tr v-if="getNonZeroCount(sortedBonuses[2]) === 0">
                                        <td colspan="2" class="text-center text-gray-400">无属性</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- 加护槽4 -->
                        <div v-if="equipment.bonus[3]" class="flex flex-col gap-2">
                            <div class="text-center text-md text-light font-semibold bg-black/50 px-2 py-1">加护 4</div>
                            <!-- 下拉框 -->
                            <div class="flex justify-center">
                                <n-select
                                    v-model:value="selectedAttributes[3]"
                                    placeholder="请选择属性"
                                    style="width: 100%"
                                    :options="attributeOptions"
                                    clearable
                                    :disabled="isSelectDisabled[3]"
                                    @update:value="handleAttributeSelect(3, $event)"
                                />
                            </div>
                            <!-- 概率表格 -->
                            <table class="wikitable w-full text-center">
                                <thead>
                                    <tr>
                                        <th class="text-left">属性</th>
                                        <th class="text-right">概率</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <template v-for="(value, index) in sortedBonuses[3]" :key="index">
                                        <tr v-if="Math.abs(value) > 0.0001">
                                            <th class="text-left">{{ sortedAttributeNames[3]![index] }}</th>
                                            <td class="text-right">{{ parseFloat(value).toFixed(4) }}%</td>
                                        </tr>
                                    </template>
                                    <tr v-if="getNonZeroCount(sortedBonuses[3]) === 0">
                                        <td colspan="2" class="text-center text-gray-400">无属性</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <!-- 加护组合概率计算结果 -->
                    <div v-if="bonusCombinationProbabilities.length > 0" class="mt-8">
                        <div class="text-xl text-light font-bold bg-[#2c231d] px-3 py-2 rounded mb-4">
                            初始加护组合生成概率
                        </div>

                        <div v-for="result in bonusCombinationProbabilities" :key="result.totalSlots" class="mb-6">
                            <div class="text-md text-light font-semibold bg-black/50 px-2 py-1 mb-2">
                                初始拥有
                                <span :class="getGradeColorClass(result.totalSlots + 1)">
                                    {{ result.totalSlots }}
                                </span>
                                条加护
                            </div>
                            <div class="mb-2 text-gray-300">总概率: {{ result.totalProbability.toFixed(4) }}%</div>

                            <table class="wikitable w-full text-center">
                                <thead>
                                    <tr>
                                        <th>组合位置</th>
                                        <th class="md:w-[10em]">概率</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-for="(comb, index) in result.combinations" :key="index">
                                        <td>
                                            <div class="flex flex-wrap gap-2 justify-center">
                                                <span
                                                    v-for="(attr, pos) in comb.attributeNames"
                                                    :key="pos"
                                                    class="px-2 py-1 bg-[#3a312a]! rounded"
                                                    :class="{ 'text-gray-400': attr === '其他' }"
                                                >
                                                    {{ attr }}
                                                </span>
                                            </div>
                                        </td>
                                        <td>{{ comb.probability.toFixed(4) }}%</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div class="text-sm text-gray-400 mt-4">
                        <div>
                            <span>※ 数据来自</span>
                            <a href="https://wizardry.info/daphne/gacha_rates/ja/alternations.html" target="_blank">
                                官方提供的数据
                            </a>
                            <span>。</span>
                        </div>
                        <div>
                            <span>
                                ※ 选了前面的加护，后面的加护会重新根据权重计算概率是根据描述假设的情况，仅供参考
                            </span>
                        </div>
                    </div>
                </div>
            </NTabPane>
        </NTabs>

        <!-- 操作按钮 -->
        <div class="flex justify-center gap-4" v-if="onClose">
            <NButton size="small" type="error" @click="openEditorModal" v-if="isSystemAdmin">编辑装备强化属性</NButton>
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
import { NButton, NModal, NRadio, NRadioGroup, NSelect, NTabPane, NTabs } from 'naive-ui';
import { computed, h, nextTick, ref, toRefs } from 'vue';
import { MwConfig } from '../../../huiji/MwConfig';
import { useSearcherDataStore } from '../data/searcherDataStore';
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
    // 使用nextTick确保junk-detail标签页渲染后再切换
    nextTick(() => {
        activeTab.value = 'junk-detail';
    });
};

// 渲染杂物标签页标题
const renderJunkTabTitle = () => {
    if (!selectedJunkItem.value) return '';

    return h(
        'span',
        {
            class: { 'text-gray-500': selectedJunkItem.value.notObt },
        },
        [
            selectedJunkItem.value.name,
            selectedJunkItem.value.notObt
                ? h(
                      'span',
                      {
                          class: 'text-sm ml-1',
                      },
                      '(无法获取)',
                  )
                : null,
        ],
    );
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

            // 返回包含原始junkItem和计算属性的对象
            return {
                junkItem, // 保留原始实例
                totalRate: maxRate,
                maxQuality, // 针对当前装备的最高星级
                maxGrade, // 针对当前装备的最高颜色
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

// 生成下拉框选项数据
const attributeOptions = computed(() => {
    return attributeNames.map((name, index) => ({
        label: name,
        value: index,
    }));
});

// 计算数组中非零值的数量
const getNonZeroCount = (array: number[]): number => {
    return array.filter((value) => Math.abs(value) > 0.0001).length;
};

// 每个加护槽的选择状态
const selectedAttributes = ref<(number | null)[]>([null, null, null, null]);

// 引入数据搜索器存储
const searcherDataStore = useSearcherDataStore();

// 属性名称映射，与updateEquipmentBonusRates.ts中的attributeOrder对应
const attributeNames = [
    '攻击力%', // 攻撃力上昇（％）
    '魔力%', // 魔力上昇（％）
    '神力%', // 神力上昇（％）
    '命中%', // 命中上昇（％）
    '回避%', // 回避上昇（％）
    '抵抗%', // 抵抗上昇（％）
    '防御%', // 防御力上昇（％）
    '魔防%', // 魔術防御力上昇（％）
    '速度%', // 行動速度上昇（％）
    '攻击力', // 攻撃力上昇（固定）
    '魔力', // 魔力上昇（固定）
    '神力', // 神力上昇（固定）
    '命中', // 命中上昇（固定）
    '回避', // 回避上昇（固定）
    '抵抗', // 抵抗上昇（固定）
    '防御', // 防御力上昇（固定）
    '魔防', // 魔術防御力上昇（固定）
    '会心', // 会心上昇（固定）
    '速度', // 行動速度上昇（固定）
];

// 排序方式：'attribute'表示属性顺序，'probability'表示概率顺序
const orderType = computed({
    get: () => searcherDataStore.settings.equipmentBonusOrder,
    set: (value) => {
        searcherDataStore.settings.equipmentBonusOrder = value;
    },
});

// 重置加护
const resetBonuses = () => {
    selectedAttributes.value = [null, null, null, null];
};

// 重新计算后的概率数据
const recalculatedBonuses = computed(() => {
    // 复制原始数据
    const result = JSON.parse(JSON.stringify(props.equipment.bonus)) as Array<Array<number>>;

    // 遍历每个加护槽
    for (let slot = 0; slot < 4; slot++) {
        if (!result[slot]) continue;

        // 获取当前槽选择的属性
        const selectedIndex = selectedAttributes.value[slot];

        // 如果当前槽有选择，处理后面的所有槽
        if (selectedIndex !== null && slot < 3) {
            // 处理后面的所有槽
            for (let nextSlot = slot + 1; nextSlot < 4; nextSlot++) {
                if (!result[nextSlot]) continue;

                // 收集所有已在当前槽及之前槽中选择的属性
                const forbiddenAttributes = new Set<number>();
                for (let prevSlot = 0; prevSlot <= slot; prevSlot++) {
                    const prevSelected = selectedAttributes.value[prevSlot];
                    if (prevSelected !== null) {
                        forbiddenAttributes.add(prevSelected);
                    }
                }

                // 计算剩余属性的总权重（原始值）
                let remainingTotalWeight = 0;
                for (let attr = 0; attr < props.equipment.bonus![nextSlot].length; attr++) {
                    if (!forbiddenAttributes.has(attr)) {
                        remainingTotalWeight += props.equipment.bonus![nextSlot][attr];
                    }
                }

                // 如果没有剩余权重，将所有非禁用属性设为0
                if (remainingTotalWeight <= 0.0001) {
                    for (let attr = 0; attr < result[nextSlot].length; attr++) {
                        result[nextSlot][attr] = 0;
                    }
                    continue;
                }

                // 重新计算概率：禁用属性设为0，其他属性按原始权重比例重新分配
                const originalTotalPercentage = 100; // 假设总概率为100%
                for (let attr = 0; attr < result[nextSlot].length; attr++) {
                    if (forbiddenAttributes.has(attr)) {
                        result[nextSlot][attr] = 0;
                    } else {
                        // 按原始权重比例分配100%的概率
                        const originalWeight = props.equipment.bonus![nextSlot][attr];
                        const newPercentage = (originalWeight / remainingTotalWeight) * originalTotalPercentage;
                        result[nextSlot][attr] = parseFloat(newPercentage.toFixed(4)); // 保留4位小数
                    }
                }
            }
        }
    }

    return result;
});

// 根据排序方式获取排序后的概率数据
const sortedBonuses = computed(() => {
    const bonuses = recalculatedBonuses.value;
    if (!bonuses) return bonuses;

    const result = bonuses.map((slotBonus, slotIndex) => {
        if (!slotBonus) return slotBonus;

        // 如果是按属性顺序，直接返回原始顺序
        if (orderType.value === 'attribute') {
            return slotBonus;
        }

        // 如果是按概率顺序，按概率降序排序
        const sortedIndices = [...Array(slotBonus.length).keys()]
            .filter((index) => Math.abs(slotBonus[index]) > 0.0001)
            .sort((a, b) => slotBonus[b] - slotBonus[a]);

        // 创建新的数组，按照排序后的索引顺序排列
        const sortedBonus = new Array(slotBonus.length).fill(0);
        sortedIndices.forEach((originalIndex, newIndex) => {
            sortedBonus[newIndex] = slotBonus[originalIndex];
        });

        return sortedBonus;
    });

    return result;
});

// 根据排序方式获取排序后的属性名称
const sortedAttributeNames = computed(() => {
    if (!props.equipment.bonus) return [];

    const result = Array(4)
        .fill(null)
        .map((_, slotIndex) => {
            const slotBonus = recalculatedBonuses.value[slotIndex];
            if (!slotBonus) return null;

            // 如果是按属性顺序，直接返回原始顺序
            if (orderType.value === 'attribute') {
                return attributeNames;
            }

            // 如果是按概率顺序，按概率降序排序属性名称
            const sortedIndices = [...Array(slotBonus.length).keys()]
                .filter((index) => Math.abs(slotBonus[index]) > 0.0001)
                .sort((a, b) => slotBonus[b] - slotBonus[a]);

            // 创建新的数组，按照排序后的索引顺序排列属性名称
            const sortedNames = new Array(slotBonus.length).fill('');
            sortedIndices.forEach((originalIndex, newIndex) => {
                sortedNames[newIndex] = attributeNames[originalIndex];
            });

            return sortedNames;
        });

    return result;
});

// 处理属性选择
const handleAttributeSelect = (slot: number, value: number | null) => {
    // 更新当前槽位的选择
    selectedAttributes.value[slot] = value;

    // 如果清空了当前槽位，清空后面所有槽位
    if (value === null) {
        for (let i = slot + 1; i < 4; i++) {
            selectedAttributes.value[i] = null;
        }
    }
};

// 生成所选属性的所有排列
const getPermutations = (arr: number[]): number[][] => {
    if (arr.length === 0) return [[]];
    const result: number[][] = [];
    for (let i = 0; i < arr.length; i++) {
        const current = arr[i];
        const remaining = arr.slice(0, i).concat(arr.slice(i + 1));
        const remainingPermutations = getPermutations(remaining);
        for (const permutation of remainingPermutations) {
            result.push([current, ...permutation]);
        }
    }
    return result;
};

// 计算加护组合的概率
const bonusCombinationProbabilities = computed(() => {
    // 获取用户选择的加护属性（过滤null，保留顺序，忽略重复）
    const selectedAttrs: number[] = [];
    const usedAttrs = new Set<number>();
    for (const attr of selectedAttributes.value) {
        if (attr !== null && !usedAttrs.has(attr)) {
            selectedAttrs.push(attr);
            usedAttrs.add(attr);
        }
    }
    if (selectedAttrs.length === 0) return [];

    const results: Array<{
        totalSlots: number;
        combinations: Array<{
            positions: number[];
            probability: number;
            attributeNames: string[];
        }>;
        totalProbability: number;
    }> = [];

    // 对于每种可能的总加护数量（从用户选择的数量到4）
    for (let totalSlots = selectedAttrs.length; totalSlots <= 4; totalSlots++) {
        if (totalSlots === 0) continue;

        // 生成所有可能的位置组合（从totalSlots个位置中选择selectedAttrs.length个位置）
        const positionCombinations = getPositionCombinations(totalSlots, selectedAttrs.length);

        // 计算每种位置组合和属性排列的概率
        const combinations: Array<{ positions: number[]; probability: number; attributeNames: string[] }> = [];

        // 生成位置组合
        for (const positions of positionCombinations) {
            // 生成属性排列
            const attributePermutations = getPermutations(selectedAttrs);

            // 对于每种属性排列，计算概率
            for (const permutedAttrs of attributePermutations) {
                // 计算该位置组合和属性排列的概率
                const probability = calculateCombinationProbability(positions, permutedAttrs, totalSlots);

                // 获取属性名称：按位置顺序分配排列后的属性
                const attrNames = new Array(totalSlots).fill('其他');
                positions.forEach((pos, index) => {
                    attrNames[pos] = attributeNames[permutedAttrs[index]];
                });

                combinations.push({
                    positions,
                    probability,
                    attributeNames: attrNames,
                });
            }
        }

        // 过滤掉概率为0的组合
        const validCombinations = combinations.filter((comb) => comb.probability > 0.0001);

        // 计算总概率
        const totalProbability = validCombinations.reduce((sum, comb) => sum + comb.probability, 0);

        if (validCombinations.length > 0) {
            results.push({
                totalSlots,
                combinations: validCombinations,
                totalProbability,
            });
        }
    }

    return results;
});

// 生成位置组合（从n个位置中选择k个位置的所有组合）
const getPositionCombinations = (n: number, k: number): number[][] => {
    const result: number[][] = [];
    const temp: number[] = [];

    const backtrack = (start: number) => {
        if (temp.length === k) {
            result.push([...temp]);
            return;
        }

        for (let i = start; i < n; i++) {
            temp.push(i);
            backtrack(i + 1);
            temp.pop();
        }
    };

    backtrack(0);
    return result;
};

// 计算特定位置组合的概率
const calculateCombinationProbability = (positions: number[], selectedAttrs: number[], totalSlots: number): number => {
    let probability = 1.0;
    const usedAttrs = new Set<number>();

    // 遍历每个槽位
    for (let slot = 0; slot < totalSlots; slot++) {
        const slotIndex = slot;
        const slotData = props.equipment.bonus?.[slotIndex];
        if (!slotData) return 0;

        // 检查当前槽位是否在选择的位置中
        const positionIndex = positions.indexOf(slot);
        let targetAttr: number | null = null;

        if (positionIndex !== -1) {
            // 如果是选择的位置，获取对应的属性
            targetAttr = selectedAttrs[positionIndex];
        }

        // 计算当前槽位的可用属性权重
        let availableWeight = 0;
        for (let attr = 0; attr < slotData.length; attr++) {
            if (!usedAttrs.has(attr)) {
                availableWeight += slotData[attr];
            }
        }

        if (availableWeight <= 0.0001) {
            // 如果没有可用权重，概率为0
            return 0;
        }

        if (targetAttr !== null) {
            // 如果当前槽位是选择的位置，计算该属性的概率
            probability *= slotData[targetAttr] / availableWeight;
            usedAttrs.add(targetAttr);
        } else {
            // 如果当前槽位不是选择的位置，计算非选择属性的总概率
            let otherWeight = 0;
            for (let attr = 0; attr < slotData.length; attr++) {
                if (!usedAttrs.has(attr) && !selectedAttrs.includes(attr)) {
                    otherWeight += slotData[attr];
                }
            }
            probability *= otherWeight / availableWeight;
        }
    }

    // 将概率转换为百分比
    return probability * 100;
};

// 计算下拉框的禁用状态
const isSelectDisabled = computed(() => {
    const disabled: boolean[] = [false, false, false, false];

    // 检查每个槽位是否可以选择
    for (let i = 1; i < 4; i++) {
        // 如果前面的槽位没有选择，则当前槽位禁用
        for (let j = 0; j < i; j++) {
            if (selectedAttributes.value[j] === null) {
                disabled[i] = true;
                break;
            }
        }
    }

    return disabled;
});
</script>
