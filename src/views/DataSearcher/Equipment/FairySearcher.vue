<template>
    <div class="flex flex-col gap-4 px-2 -mx-2">
        <div class="mt-4">
            更多信息请参考
            <a href="/wiki/妖精" target="_blank">妖精</a>
            条目。
        </div>
        <template v-if="fairyEquipments.length > 0">
            <table class="wikitable text-sm text-center">
                <thead>
                    <tr>
                        <th class="2xl:w-30">技能</th>
                        <th class="2xl:w-24">装备</th>
                        <th class="w-20">武器</th>
                        <th class="w-16">头部</th>
                        <th class="w-16">手部</th>
                        <th class="w-16">身体</th>
                        <th class="w-16">盾</th>
                        <th class="w-16">脚部</th>
                        <th class="w-16">饰品</th>
                        <th class="hidden 2xl:table-cell!">描述</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="skillGroup in fairyEquipments" :key="skillGroup.skillName">
                        <tr v-for="(group, index) in skillGroup.groups" :key="group.groupName">
                            <td v-if="index === 0" class="text-light" :rowspan="skillGroup.groups.length">
                                {{ skillGroup.skillName }}
                            </td>
                            <td>{{ group.groupName }}</td>
                            <td>
                                <span
                                    v-for="eq in group.weapons"
                                    :key="eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                            </td>
                            <td>
                                <span
                                    v-for="eq in group.equipments.头部"
                                    :key="eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                                <span
                                    v-for="eq in skillGroup.specialEquipments.头部"
                                    :key="'special-' + eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                            </td>
                            <td>
                                <span
                                    v-for="eq in group.equipments.手部"
                                    :key="eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                                <span
                                    v-for="eq in skillGroup.specialEquipments.手部"
                                    :key="'special-' + eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                            </td>
                            <td>
                                <span
                                    v-for="eq in group.equipments.身体"
                                    :key="eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                                <span
                                    v-for="eq in skillGroup.specialEquipments.身体"
                                    :key="'special-' + eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                            </td>
                            <td>
                                <span
                                    v-for="eq in group.equipments.盾"
                                    :key="eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                                <span
                                    v-for="eq in skillGroup.specialEquipments.盾"
                                    :key="'special-' + eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                            </td>
                            <td>
                                <span
                                    v-for="eq in group.equipments.脚部"
                                    :key="eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                                <span
                                    v-for="eq in skillGroup.specialEquipments.脚部"
                                    :key="'special-' + eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                            </td>
                            <td>
                                <span
                                    v-for="eq in group.equipments.饰品"
                                    :key="eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                                <span
                                    v-for="eq in skillGroup.specialEquipments.饰品"
                                    :key="'special-' + eq.name"
                                    class="cursor-pointer block"
                                    :class="getDisplayClass(eq.displayClass)"
                                    @click="openEquipmentModal(eq.equipment)"
                                >
                                    {{ eq.displayText }}
                                </span>
                            </td>
                            <td
                                v-if="index === 0"
                                class="text-left text-sm hidden 2xl:table-cell!"
                                :rowspan="skillGroup.groups.length"
                                v-html="convertDescription(skillGroup.description)"
                            ></td>
                        </tr>
                    </template>
                </tbody>
            </table>
        </template>
    </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useEquipmentModalStore } from '../../../stores/equipmentModalStore';
import { convertDescription } from '../utils/convertDescription';
import { Equipment } from './Equipment';
import { useEquipmentStore } from './equipmentStore';

interface FairyEquipmentGroup {
    groupName: string;
    equipments: Record<
        string,
        Array<{ name: string; displayText: string; displayClass: string; equipment: Equipment }>
    >;
    weapons: Array<{ name: string; displayText: string; displayClass: string; equipment: Equipment }>;
}

interface FairySkillGroup {
    skillName: string;
    description: string;
    groups: FairyEquipmentGroup[];
    specialEquipments: Record<
        string,
        Array<{ name: string; displayText: string; displayClass: string; equipment: Equipment }>
    >;
}

const equipmentStore = useEquipmentStore();
const { setSkills, equipments } = storeToRefs(equipmentStore);
const { openModal: openEquipmentModal } = useEquipmentModalStore();

const getDisplayClass = (displayClass: string) => {
    if (displayClass === 'blue') return 'text-blue-400';
    if (displayClass === 'purple') return 'text-purple-400';
    if (displayClass === 'gray') return 'text-gray-400';
    return 'text-green-400';
};

const checkEquipmentMatch = (
    equipmentName: string,
    groupName: string,
    allGroupNames: string[],
): { matched: boolean; displayText: string; displayClass: string } => {
    // 查找同组里完全包含当前 groupName 的字符串（更具体的装备组）
    const moreSpecificGroups = allGroupNames.filter((name) => name !== groupName && name.includes(groupName));

    // 判断装备名是否包含当前 groupName
    if (!equipmentName.includes(groupName)) {
        return { matched: false, displayText: '', displayClass: '' };
    }

    // 判断装备名是否包含任何更具体的装备组名称
    const containsMoreSpecific = moreSpecificGroups.some((specificName) => equipmentName.includes(specificName));

    if (containsMoreSpecific) {
        return { matched: false, displayText: '', displayClass: '' };
    }

    // 判断是优质还是普通
    if (equipmentName.startsWith('优质')) {
        return { matched: true, displayText: '优质', displayClass: 'blue' };
    } else {
        return { matched: true, displayText: '普通', displayClass: 'green' };
    }
};

const checkWeaponMatch = (
    weaponName: string,
    groupName: string,
    allGroupNames: string[],
): { matched: boolean; displayText: string; displayClass: string } => {
    // 武器名称不包含任何装备组名称，则属于所有套装
    const belongsToAllSets = !allGroupNames.some((name) => weaponName.includes(name));

    if (belongsToAllSets) {
        if (weaponName.startsWith('优质')) {
            return { matched: true, displayText: '优质', displayClass: 'blue' };
        } else {
            return { matched: true, displayText: '普通', displayClass: 'green' };
        }
    }

    // 查找同组里完全包含当前 groupName 的字符串（更具体的装备组）
    const moreSpecificGroups = allGroupNames.filter((name) => name !== groupName && name.includes(groupName));

    // 判断武器名是否包含当前 groupName
    if (!weaponName.includes(groupName)) {
        return { matched: false, displayText: '', displayClass: '' };
    }

    // 判断武器名是否包含任何更具体的装备组名称
    const containsMoreSpecific = moreSpecificGroups.some((specificName) => weaponName.includes(specificName));

    if (containsMoreSpecific) {
        return { matched: false, displayText: '', displayClass: '' };
    }

    // 判断是优质还是普通
    if (weaponName.startsWith('优质')) {
        return { matched: true, displayText: '优质', displayClass: 'blue' };
    } else {
        return { matched: true, displayText: '普通', displayClass: 'green' };
    }
};

const fairyEquipments = computed<FairySkillGroup[]>(() => {
    const fairySkills = setSkills.value;
    const result: FairySkillGroup[] = [];

    fairySkills.forEach((skill) => {
        const groupNames = skill.it;
        const groups: FairyEquipmentGroup[] = [];
        const matchedEquipmentNames = new Set<string>();

        groupNames.forEach((groupName) => {
            const categorized: Record<
                string,
                Array<{ name: string; displayText: string; displayClass: string; equipment: Equipment }>
            > = {
                头部: [],
                手部: [],
                身体: [],
                盾: [],
                脚部: [],
                饰品: [],
            };
            const weapons: Array<{ name: string; displayText: string; displayClass: string; equipment: Equipment }> =
                [];

            // 收集该装备组的防具
            equipments.value.forEach((eq) => {
                if (eq.fairyCan <= 0) return;
                if (eq.data.cate === '武器') return;

                const cate = eq.data.cate;
                const position = cate;
                if (!position) return;

                const fairySkill = eq.fairySkill;
                if (!fairySkill || fairySkill !== skill.n) return;

                const matchResult = checkEquipmentMatch(eq.data.n, groupName, groupNames);
                if (!matchResult.matched) {
                    return;
                }

                matchedEquipmentNames.add(eq.data.n);

                if (!(position in categorized)) return; // 检查是否为有效的键

                categorized[position].push({
                    name: eq.data.n,
                    displayText: matchResult.displayText,
                    displayClass: matchResult.displayClass,
                    equipment: eq,
                });
            });

            // 收集该装备组的武器
            equipments.value.forEach((eq) => {
                if (eq.fairyCan <= 0) return;
                if (eq.data.cate !== '武器') return;

                const fairySkill = eq.fairySkill;
                if (!fairySkill || fairySkill !== skill.n) return;

                const matchResult = checkWeaponMatch(eq.data.n, groupName, groupNames);
                if (!matchResult.matched) {
                    return;
                }

                weapons.push({
                    name: eq.data.n,
                    displayText: matchResult.displayText,
                    displayClass: matchResult.displayClass,
                    equipment: eq,
                });
            });

            groups.push({
                groupName,
                equipments: categorized,
                weapons,
            });
        });

        // 收集特殊装备（不匹配任何装备组的装备）
        const specialEquipments: Record<
            string,
            Array<{ name: string; displayText: string; displayClass: string; equipment: Equipment }>
        > = {
            头部: [],
            手部: [],
            身体: [],
            盾: [],
            脚部: [],
            饰品: [],
        };

        equipments.value.forEach((eq) => {
            if (eq.fairyCan <= 0) return;
            if (eq.data.cate === '武器') return; // 武器已单独处理

            const cate = eq.data.cate;
            const position = cate;
            if (!position) return;

            const fairySkill = eq.fairySkill;
            if (!fairySkill || fairySkill !== skill.n) return;

            // 如果装备名不匹配任何装备组，则为特殊装备
            if (!matchedEquipmentNames.has(eq.data.n)) {
                if (!(position in specialEquipments)) return; // 检查是否为有效的键
                specialEquipments[position].push({
                    name: eq.data.n,
                    displayText: '特殊',
                    displayClass: 'purple',
                    equipment: eq,
                });
            }
        });

        result.push({
            skillName: skill.n,
            description: skill.d,
            groups,
            specialEquipments,
        });
    });

    return result;
});
</script>
