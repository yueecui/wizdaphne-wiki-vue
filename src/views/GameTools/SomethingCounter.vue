<template>
    <div class="p-4 bg-card! border! border-cardborder! rounded flex flex-col gap-4">
        <div class="text-xl">计数器</div>
        <div class="grid grid-cols-[3em_1fr_1fr] gap-2 items-center">
            <template v-for="(item, index) in data" :key="index">
                <div>
                    <DropdownArraySorter v-model:listItems="data" :index="index">
                        <div class="text-center bg-white/20 rounded w-max px-3 cursor-pointer">
                            {{ `#${index + 1}` }}
                        </div>
                    </DropdownArraySorter>
                </div>
                <div><NInput v-model:value="item.name"></NInput></div>
                <div><NInputNumber v-model:value="item.count"></NInputNumber></div>
            </template>
        </div>
        <div class="flex gap-4 justify-center">
            <NButton size="small" class="" @click="addNew">添加计数器</NButton>
            <NButton size="small" class="" @click="removeAll">移除所有</NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput, NInputNumber } from 'naive-ui';
import DropdownArraySorter from '../../components/DropdownArraySorter.vue';

import { useLocalStorage } from '@vueuse/core';

interface CounterData {
    count: number;
    name: string;
}

const data = useLocalStorage<CounterData[]>('counterData', []);

const addNew = () => {
    data.value.push({
        count: 0,
        name: `计数器${data.value.length + 1}`,
    });
};

const removeAll = () => {
    data.value = [];
    addNew();
};
</script>
