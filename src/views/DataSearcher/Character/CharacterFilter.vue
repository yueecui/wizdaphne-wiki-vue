<template>
    <div class="flex flex-row flex-wrap gap-2">
        <div class="flex flex-col w-60">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">搜索词</label>
            </div>
            <div class="flex items-center h-12">
                <NInput v-model:value="filter.searchText" placeholder="支持三语名字"></NInput>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">稀有度</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect :options="rarityOptions" v-model:value="filter.rarity" class="w-24!"></NSelect>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">职业</label>
                <div>
                    <NCheckbox size="small" :checked="filter.onlyPrimary" v-on:update:checked="updateOnlyPrimary">
                        仅初始职业
                    </NCheckbox>
                </div>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect
                    v-if="filter.onlyPrimary"
                    :options="onlyPrimaryClassOptions"
                    v-model:value="filter.class[0]"
                    class="w-48!"
                ></NSelect>
                <NSelect
                    v-else
                    :options="classOptions"
                    multiple
                    v-on:update:value="updateClass"
                    :value="filter.class"
                    clearable
                    class="w-48!"
                ></NSelect>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">种族</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect :options="raceOptions" v-model:value="filter.race" class="w-24!"></NSelect>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">性别</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect :options="genderOptions" v-model:value="filter.gender" class="w-24!"></NSelect>
            </div>
        </div>
        <div class="flex flex-col">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">性格</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect :options="personalityOptions" v-model:value="filter.personality" class="w-24!"></NSelect>
            </div>
        </div>
        <div class="flex flex-col order-2 md:order-1">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">属性</label>
            </div>

            <div class="flex flex-row gap-2 items-center h-12">
                <template v-for="element in elementList" :key="element">
                    <div
                        class="w-8 h-8 relative group cursor-pointer"
                        :class="getElementIconClass(element)"
                        :onClick="() => handleOnClickPath(element)"
                    >
                        <ElementIcon :element="element" class="group-[.inactive]:opacity-30 w-8 h-8" />
                        <div
                            class="hidden md:group-hover:!block absolute z-10 -bottom-8 left-1/2 -translate-x-1/2 w-max px-2 bg-black/70 rounded text-center drop-shadow-inline"
                        >
                            {{ element }}
                        </div>
                    </div>
                </template>
            </div>
        </div>
        <div class="flex flex-col order-1 md:order-2">
            <div class="flex justify-between items-center h-6">
                <label class="text-sm">缘的才能类型</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect :options="fateOptions" v-model:value="filter.fate" class="w-24!"></NSelect>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NCheckbox, NInput, NSelect, SelectOption } from 'naive-ui';
import ElementIcon from '../../../components/ElementIcon.vue';

import { computed } from 'vue';
import { ELEMENT_TYPE, FATE_TYPE, GENDER_TYPE, PERSONALITY_TYPE, RACE_TYPE, RARITY_TYPE } from '../data/enum';
import { ICharacterFilter } from './types';

const filter = defineModel<ICharacterFilter>('filter', {
    type: Object,
    required: true,
});

// 属性
const elementList = Object.values(ELEMENT_TYPE);
const getElementIconClass = (element: ELEMENT_TYPE) => {
    if (!filter.value.element) return '';
    if (filter.value.element !== element) {
        return 'inactive';
    }
    return '';
};
const handleOnClickPath = (element: ELEMENT_TYPE) => {
    if (filter.value.element === element) {
        filter.value.element = '';
    } else {
        filter.value.element = element;
    }
};

// 种族
const raceOptions = [
    {
        label: '全部',
        value: '',
    },
    ...Object.values(RACE_TYPE).map((r) => ({
        label: r,
        value: r,
    })),
];

// 性别
const genderOptions = [
    {
        label: '全部',
        value: '',
    },
    ...Object.values(GENDER_TYPE).map((r) => ({
        label: r,
        value: r,
    })),
];

// 稀有度
const rarityOptions = [
    {
        label: '全部',
        value: '',
    },
    ...Object.values(RARITY_TYPE).map((r) => ({
        label: r,
        value: r,
    })),
];

// 性格
const personalityOptions = [
    {
        label: '全部',
        value: '',
    },
    ...Object.values(PERSONALITY_TYPE).map((r) => ({
        label: r,
        value: r,
    })),
];

// 缘
const fateOptions = [
    {
        label: '全部',
        value: '',
    },
    ...Object.values(FATE_TYPE).map((r) => ({
        label: r,
        value: r,
    })),
];

// class
const USEABLE_CLASS = ['战士', '盗贼', '僧侣', '法师', '骑士', '忍者'];
const classOptions = computed<SelectOption[]>(() => [
    ...Object.values(USEABLE_CLASS).map((r) => ({
        label: r,
        value: r,
        disabled: filter.value.class.length === 2 && filter.value.class.indexOf(r) === -1,
    })),
    {
        label: '特殊',
        value: '特殊',
        disabled: filter.value.class.length === 2 && filter.value.class.indexOf('特殊') === -1,
    },
]);

const updateClass = (value: ICharacterFilter['class']) => {
    if (value.length > 2) {
        value = value.slice(0, 2);
    }
    filter.value.class = value;
};

const onlyPrimaryClassOptions = [
    {
        label: '全部',
        value: '',
    },
    ...Object.values(USEABLE_CLASS).map((r) => ({
        label: r,
        value: r,
    })),
    {
        label: '特殊',
        value: '特殊',
    },
];
const updateOnlyPrimary = (value: boolean) => {
    filter.value.onlyPrimary = value;
    if (value) {
        if (filter.value.class.length > 1) {
            filter.value.class = filter.value.class.slice(0, 1);
        } else if (filter.value.class.length === 0) {
            filter.value.class = [''];
        }
    } else {
        filter.value.class = filter.value.class.filter((c) => c !== '');
    }
};
</script>
