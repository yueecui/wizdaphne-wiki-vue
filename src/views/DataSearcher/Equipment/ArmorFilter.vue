<template>
    <div>
        <div class="flex flex-wrap flex-row gap-2 items-center">
            <NButton
                size="small"
                :type="filter.category === '' ? 'primary' : 'default'"
                @click="() => (filter.category = '')"
            >
                全部
            </NButton>
            <template v-for="(armor, index) in ARMOR_SORT_ORDER" :key="index">
                <NButton
                    size="small"
                    :type="filter.category === armor ? 'primary' : 'default'"
                    @click="() => (filter.category = armor)"
                >
                    {{ armor }}
                </NButton>
            </template>
        </div>
    </div>
    <div class="flex flex-row flex-wrap gap-2 md:gap-6">
        <div class="flex flex-col w-60">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">搜索词</label>
            </div>
            <div class="flex items-center h-12">
                <NInput v-model:value="filter.searchText" placeholder="支持中日名字、ID"></NInput>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">特性</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect
                    clearable
                    filterable
                    :options="skillOptions"
                    v-model:value="filter.skill"
                    class="w-40!"
                    maxTagCount="responsive"
                ></NSelect>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">特典</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect
                    v-model:value="filter.soucateFilter"
                    :options="[
                        { label: '全部显示', value: 'all' },
                        { label: '只显示特典', value: 'show' },
                        { label: '不显示特典', value: 'hide' },
                    ]"
                    class="w-40!"
                ></NSelect>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">&nbsp;</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NCheckbox v-model:checked="filter.showMaxLv">显示满强化</NCheckbox>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NInput, NSelect, SelectOption } from 'naive-ui';

import { computed, toRefs } from 'vue';
import { ARMOR_SORT_ORDER } from './Equipment';
import { useEquipmentStore } from './equipmentStore';
import { IEquipmentFilter } from './types';

const filter = defineModel<IEquipmentFilter>('filter', {
    type: Object,
    required: true,
});

const { equipments, equipmentSkills } = toRefs(useEquipmentStore());
const allWeapon = computed(() => {
    return equipments.value.filter((equipment) => equipment.data.cate !== '武器');
});

const allWeaponSkill = computed(() => {
    const skills = allWeapon.value.reduce((acc, equipment) => {
        if (equipment.data.sk) {
            acc.push(...equipment.data.sk);
        }
        if (equipment.data.csk) {
            acc.push(...equipment.data.csk);
        }
        return acc;
    }, [] as string[]);
    const result: string[] = [];
    for (const skill of equipmentSkills.value) {
        if (skills.includes(skill.n)) {
            result.push(skill.n);
        }
    }
    {
    }
    return result;
});

const skillOptions = computed<SelectOption[]>(() => [
    {
        label: '全部',
        value: '',
    },
    ...Object.values(allWeaponSkill.value).map((r) => ({
        label: r,
        value: r,
    })),
]);
</script>
