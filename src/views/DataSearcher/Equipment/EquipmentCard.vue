<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
        <div>
            <table class="wikitable my-0! w-full">
                <tbody>
                    <tr>
                        <th colspan="2" class="w-1/2">装备名称</th>
                        <th class="w-1/2">特性</th>
                    </tr>
                    <tr>
                        <td colspan="2" class="text-center">{{ equipment.data.n }}</td>
                        <td class="align-top" rowspan="7">
                            <div class="flex flex-col gap-4">
                                <div v-for="skill in equipment.data.sk">
                                    <div class="text-light pb-0.5 border-b! mb-2 relative">
                                        {{ skill }}
                                    </div>
                                    <div v-html="getSkillDescription(skill)"></div>
                                </div>
                                <div v-for="skill in equipment.data.csk">
                                    <div class="text-light pb-0.5 border-b! mb-2 relative">
                                        {{ skill }}
                                    </div>
                                    <div v-html="getSkillDescription(skill)"></div>
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <th>类型</th>
                        <th>阶级</th>
                    </tr>
                    <tr>
                        <td class="text-center">{{ equipment.data.sub }}</td>
                        <td class="text-center">{{ equipment.data.t }}</td>
                    </tr>
                    <tr>
                        <th colspan="2">主要来源</th>
                    </tr>
                    <tr>
                        <td colspan="2" class="text-center">
                            <div v-if="equipment.data.sou" class="flex flex-col gap-2">
                                <div v-for="source in equipment.data.sou">
                                    {{ source }}
                                </div>
                            </div>
                        </td>
                    </tr>
                    <tr>
                        <th colspan="2">其他</th>
                    </tr>
                    <tr>
                        <td colspan="2" class="text-center">
                            <div class="text-sm">
                                <div v-if="equipment.data.req">职业限制：{{ equipment.data.req }}</div>
                                <div v-if="equipment.data.desc" v-html="convertDescription(equipment.data.desc)"></div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div>
            <table class="wikitable my-0! w-full text-center">
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
                                <td>{{ stat.n }}</td>
                                <component :is="getTd(equipment, stat.k, 0)" />
                                <component :is="getTd(equipment, stat.k, 5)" />
                                <component :is="getTd(equipment, stat.k, 10)" />
                                <component :is="getTd(equipment, stat.k, 15)" />
                                <component :is="getTd(equipment, stat.k, 20)" />
                            </tr>
                            <tr v-if="stat.k === 'atk' && equipment.data.cate === '武器'">
                                <td>次数</td>
                                <component :is="getTd(equipment, 'c', 0)" />
                            </tr>
                        </template>
                    </template>
                </tbody>
            </table>
        </div>
        <div class="text-sm text-gray-400">
            <div>
                ※
                +0数据红色表示比同类型装备的基准值低，绿色表示比同类型装备的基准值高。其他强化值数据，绿色表示相比+0有所提升
            </div>
            <div>※ 阶级为根据装备图标、主要属性数值或强化费用推测，仅作为参考。</div>
        </div>
        <div class="flex justify-center gap-4" v-if="onClose">
            <NButton size="small" type="warning" @click="onClose">关闭</NButton>
        </div>
    </div>
</template>

<script setup lang="tsx">
import { NButton } from 'naive-ui';
import { toRefs } from 'vue';
import { convertDescription } from '../util/convertDescription';
import { useEquipmentStore } from './equipmentStore';
import { Equipment } from './Equpment';

convertDescription;

const props = defineProps<{
    equipment: Equipment;
    onClose?: () => void;
}>();

const { equipmentSkills } = toRefs(useEquipmentStore());

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

        return (
            <td colspan="5" class={tdClass.join(' ')}>
                {text}
            </td>
        );
    }

    return <td class={tdClass.join(' ')}>{text}</td>;
};
</script>
