<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
        <!-- 标题部分 -->
        <div>
            <h2 class="text-xl text-light font-bold mb-4">{{ equipment.data.n }} - 属性编辑器</h2>
        </div>

        <!-- 属性值编辑表格 -->
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
                                <td :class="{ 'text-gray-700': getOriginalValue(stat.k, 0) === 0 }">
                                    {{ getOriginalValue(stat.k, 0) }}
                                </td>
                                <td>
                                    <NInputNumber
                                        v-if="stat.k !== 'c'"
                                        v-model:value="editedStats[stat.k].lv5"
                                        size="small"
                                        :style="{
                                            width: '100%',
                                            opacity: editedStats[stat.k].lv5 === 0 ? 0.5 : 1,
                                        }"
                                        :input-props="{
                                            style: { color: editedStats[stat.k].lv5 === 0 ? '#8f8f8f' : '' },
                                        }"
                                        :show-button="false"
                                    />
                                </td>
                                <td>
                                    <NInputNumber
                                        v-if="stat.k !== 'c'"
                                        v-model:value="editedStats[stat.k].lv10"
                                        size="small"
                                        :style="{
                                            width: '100%',
                                            opacity: editedStats[stat.k].lv10 === 0 ? 0.5 : 1,
                                        }"
                                        :input-props="{
                                            style: { color: editedStats[stat.k].lv10 === 0 ? '#8f8f8f' : '' },
                                        }"
                                        :show-button="false"
                                    />
                                </td>
                                <td>
                                    <NInputNumber
                                        v-if="stat.k !== 'c'"
                                        v-model:value="editedStats[stat.k].lv15"
                                        size="small"
                                        :style="{
                                            width: '100%',
                                            opacity: editedStats[stat.k].lv15 === 0 ? 0.5 : 1,
                                        }"
                                        :input-props="{
                                            style: { color: editedStats[stat.k].lv15 === 0 ? '#8f8f8f' : '' },
                                        }"
                                        :show-button="false"
                                    />
                                </td>
                                <td>
                                    <NInputNumber
                                        v-if="stat.k !== 'c'"
                                        v-model:value="editedStats[stat.k].lv20"
                                        size="small"
                                        :style="{
                                            width: '100%',
                                            opacity: editedStats[stat.k].lv20 === 0 ? 0.5 : 1,
                                        }"
                                        :input-props="{
                                            style: { color: editedStats[stat.k].lv20 === 0 ? '#8f8f8f' : '' },
                                        }"
                                        :show-button="false"
                                    />
                                </td>
                            </tr>
                            <tr v-if="stat.k === 'atk' && equipment.data.cate === '武器'">
                                <th>次数</th>
                                <td colspan="6">×{{ getOriginalValue('c', 0) }}</td>
                            </tr>
                        </template>
                        <tr class="bg-[#2a231e]!">
                            <th colspan="2">复制上一级</th>
                            <td>
                                <NButton size="small" type="primary" @click="copyFromPreviousLevel(5)">复制</NButton>
                            </td>
                            <td>
                                <NButton size="small" type="primary" @click="copyFromPreviousLevel(10)">复制</NButton>
                            </td>
                            <td>
                                <NButton size="small" type="primary" @click="copyFromPreviousLevel(15)">复制</NButton>
                            </td>
                            <td>
                                <NButton size="small" type="primary" @click="copyFromPreviousLevel(20)">复制</NButton>
                            </td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 mt-4">
            <NButton type="default" @click="onCancel">取消</NButton>
            <NButton type="primary" @click="onSubmit" :disabled="isSubmitting">
                {{ isSubmitting ? '提交中...' : '提交' }}
            </NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NInputNumber } from 'naive-ui';
import { onMounted, reactive, ref } from 'vue';
import { edit } from '../../../api/editPage';
import { getPageRawByTitle } from '../../../api/getPageRaw';
import { IS_DEV } from '../../../util/index';
import type { Equipment } from './Equipment';
import { useEquipmentStore } from './equipmentStore';

const props = defineProps<{
    equipment: Equipment;
}>();

const emit = defineEmits<{
    cancel: [];
    submit: [];
}>();

// 属性列表
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

// 编辑后的属性值
const editedStats = reactive({
    atk: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
    mag: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
    div: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
    def: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
    mdef: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
    spe: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
    acc: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
    sur: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
    eva: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
    res: { lv5: 0, lv10: 0, lv15: 0, lv20: 0 },
});

// 提交状态
const isSubmitting = ref(false);

// 获取原始值
const getOriginalValue = (stat: string, level: number): number => {
    return props.equipment.getValue(stat, level) ?? 0;
};

// 加载装备数据
const loadEquipmentData = () => {
    // 为每个属性和等级加载原始数据
    STAT_LIST.forEach((stat) => {
        editedStats[stat.k].lv5 = getOriginalValue(stat.k, 5);
        editedStats[stat.k].lv10 = getOriginalValue(stat.k, 10);
        editedStats[stat.k].lv15 = getOriginalValue(stat.k, 15);
        editedStats[stat.k].lv20 = getOriginalValue(stat.k, 20);
    });
};

// 组件挂载时加载数据
onMounted(() => {
    loadEquipmentData();
});

// 从上一级复制数据
const copyFromPreviousLevel = (targetLevel: number) => {
    // 定义级别顺序，从高到低
    const levels = [20, 15, 10, 5, 0];
    const targetIndex = levels.indexOf(targetLevel);

    // 如果是+0级别或者不在级别列表中，直接返回
    if (targetIndex === -1 || targetLevel === 0) return;

    // 获取所有需要复制的级别，从目标级别的前一个级别开始，向前查找
    const sourceLevels = levels.slice(targetIndex + 1);

    // 遍历每个属性
    STAT_LIST.forEach((stat) => {
        // 跳过攻击次数属性
        if (stat.k === 'c') return;

        // 尝试从各个可能的来源级别复制数据
        for (const sourceLevel of sourceLevels) {
            let sourceValue: number;

            // 根据来源级别获取对应的值
            if (sourceLevel === 0) {
                // +0级别使用原始值
                sourceValue = getOriginalValue(stat.k, 0);
            } else {
                // 其他级别使用编辑后的值
                sourceValue = editedStats[stat.k][`lv${sourceLevel}`] as number;
            }

            // 如果找到非零值，复制到目标级别并退出循环
            if (sourceValue !== 0) {
                editedStats[stat.k][`lv${targetLevel}`] = sourceValue;
                break;
            }
        }
    });
};

// 判断单个级别数据是否有效（至少有一个属性值不为0）
const isLevelDataValid = (level: number): boolean => {
    if (level === 0) return false; // +0级数据不提交

    for (const stat of STAT_LIST) {
        if (stat.k === 'c') continue; // 跳过攻击次数属性
        const value = editedStats[stat.k][`lv${level}`] as number;
        if (value !== 0) {
            return true;
        }
    }
    return false;
};

// 获取所有有效级别的数据
const getValidLevelData = () => {
    const validLevels = [5, 10, 15, 20].filter((level) => isLevelDataValid(level));

    return validLevels.map((level) => {
        // 创建一条记录，格式与equipment_enhanced.json一致
        // 顺序: [装备名称, lv, atk, c, mag, div, def, mdef, spe, acc, sur, eva, res]
        const record: any[] = [
            props.equipment.data.ba || props.equipment.data.n, // 装备标识，有ba则使用ba，否则使用n
            level, // 强化等级
            editedStats.atk[`lv${level}`] as number, // atk
            props.equipment.data.c || 0, // c (攻击次数)
            editedStats.mag[`lv${level}`] as number, // mag
            editedStats.div[`lv${level}`] as number, // div
            editedStats.def[`lv${level}`] as number, // def
            editedStats.mdef[`lv${level}`] as number, // mdef
            editedStats.spe[`lv${level}`] as number, // spe
            editedStats.acc[`lv${level}`] as number, // acc
            editedStats.sur[`lv${level}`] as number, // sur
            editedStats.eva[`lv${level}`] as number, // eva
            editedStats.res[`lv${level}`] as number, // res
        ];

        return record;
    });
};

// 从wiki拉取数据
const fetchWikiData = async () => {
    try {
        if (IS_DEV) {
            // 开发环境：使用本地JSON文件
            const response = await fetch('/equipment_enhanced.json');
            return await response.json();
        } else {
            // 生产环境：使用getPageRawByTitle获取Data:EquipmentEnhanced.tabx的数据
            const data = await getPageRawByTitle<any>('Data:EquipmentEnhanced.tabx');
            return data;
        }
    } catch (error) {
        console.error('获取wiki数据失败:', error);
        window.wiz.$message.error('获取wiki数据失败');
        return null;
    }
};

// 合并数据到wiki数据
const mergeData = (wikiData: any, newData: any[]) => {
    if (!wikiData || !Array.isArray(wikiData.data)) {
        // 如果wiki数据无效，直接返回包含新数据的结构
        return {
            ...wikiData,
            data: newData,
        };
    }

    // 创建一个映射表，用于快速查找现有记录
    const existingRecords = new Map<string, number>();
    wikiData.data.forEach((record: any[], index: number) => {
        const key = `${record[0]}-${record[1]}`; // 使用装备名称和等级作为唯一键
        existingRecords.set(key, index);
    });

    // 合并新数据
    const mergedData = [...wikiData.data];
    newData.forEach((newRecord) => {
        const key = `${newRecord[0]}-${newRecord[1]}`;
        if (existingRecords.has(key)) {
            // 如果记录已存在，更新它
            const index = existingRecords.get(key)!;
            mergedData[index] = newRecord;
        } else {
            // 如果记录不存在，添加新记录
            mergedData.push(newRecord);
        }
    });

    // 返回合并后的完整数据
    return {
        ...wikiData,
        data: mergedData,
    };
};

// 提交编辑
const onSubmit = async () => {
    // 设置提交状态为true
    isSubmitting.value = true;

    try {
        // 获取有效数据
        const validData = getValidLevelData();

        if (validData.length === 0) {
            window.wiz.$message.info('没有需要提交的有效数据');
            emit('submit');
            return;
        }

        // 从wiki拉取数据
        const wikiData = await fetchWikiData();
        if (!wikiData) {
            return;
        }

        // 合并数据
        const mergedData = mergeData(wikiData, validData);

        if (IS_DEV) {
            // 开发环境：仅打印日志
            console.log('提交的数据:', mergedData);
        } else {
            // 生产环境：使用edit函数提交到Data:EquipmentEnhanced.tabx页面
            const jsonText = JSON.stringify(mergedData, null, 2);
            const response = await edit({
                title: 'Data:EquipmentEnhanced.tabx',
                text: jsonText,
                summary: `更新${props.equipment.data.n}的强化属性数据`,
                minor: false,
            });

            // 检查响应是否包含错误
            if ('error' in response) {
                console.error('提交失败:', response.error);
                window.wiz.$message.error(`提交失败: ${response.error.info}`);
                return;
            }
        }

        // 更新equipmentStore中的数据
        const equipmentStore = useEquipmentStore();
        const equipmentIdentifier = props.equipment.data.ba || props.equipment.data.n;

        // 使用store的方法更新装备强化属性
        equipmentStore.updateEquipmentEnhancedStats(equipmentIdentifier, validData);

        // 显示成功消息
        window.wiz.$message.success('数据提交成功');

        // 通知父组件提交完成
        emit('submit');
    } catch (error) {
        console.error('提交失败:', error);
        window.wiz.$message.error('提交失败');
    } finally {
        // 无论成功失败，都设置提交状态为false
        isSubmitting.value = false;
    }
};

// 取消编辑
const onCancel = () => {
    emit('cancel');
};
</script>
