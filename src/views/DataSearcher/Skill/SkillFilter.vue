<template>
    <div class="flex flex-row flex-wrap gap-2 md:gap-6">
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
                <label class="text-sm">类型</label>
            </div>
            <div class="flex flex-row gap-2 items-center h-12">
                <NSelect
                    :options="skillTypesOptions"
                    multiple
                    v-model:value="filter.skillType"
                    clearable
                    class="w-80!"
                    maxTagCount="responsive"
                ></NSelect>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NInput, NSelect, SelectOption } from 'naive-ui';

import { computed } from 'vue';
import { ISkillFilter } from './types';

const filter = defineModel<ISkillFilter>('filter', {
    type: Object,
    required: true,
});

const SKILL_TYPES = [
    '武器技能',
    '支援技能',
    '特殊技能',
    '攻击咒文',
    '回复咒文',
    '支援咒文',
    '妨碍咒文',
    '职业被动',
    '角色固有技',
    '角色技能',
    '克己被动',
    '有缘人被动',
    '其他被动',
];
const skillTypesOptions = computed<SelectOption[]>(() => [
    ...Object.values(SKILL_TYPES).map((r) => ({
        label: r,
        value: r,
    })),
]);
</script>
