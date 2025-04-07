<template>
    <div class="p-4 bg-card! border! border-cardborder! rounded flex flex-col gap-4">
        <div class="text-xl">计数器</div>
        <div class="flex flex-wrap -mx-1">
            <div class="w-1/3 p-1" v-for="(item, index) in data" :key="index">
                <div class="bg-amber-800/50 p-2 rounded flex flex-col items-center gap-2">
                    <div class="w-full *:flex items-start">
                        <DropdownArraySorter v-model:listItems="data" :index="index">
                            <div class="text-center bg-white/20 rounded w-max px-3 cursor-pointer">
                                {{ `#${index + 1}` }}
                            </div>
                        </DropdownArraySorter>
                    </div>
                    <div
                        class="text-6xl text-center cursor-pointer w-full select-none"
                        @click="() => onItemCountUpdate(index, item.count + 1)"
                    >
                        {{ item.count }}
                    </div>
                    <div class="w-full"><NInput size="tiny" v-model:value="item.name"></NInput></div>
                    <div class="w-full">
                        <NInputNumber
                            size="tiny"
                            :value="item.count"
                            v-on:update:value="(value) => onItemCountUpdate(index, value)"
                        ></NInputNumber>
                    </div>
                    <div class="w-full">
                        <NInputNumber
                            size="tiny"
                            v-model:value="item.max"
                            placeholder="循环最大值"
                            min="2"
                        ></NInputNumber>
                    </div>
                </div>
            </div>
        </div>

        <div class="flex gap-4 justify-center">
            <NButton size="small" class="" @click="addNew">添加计数器</NButton>
            <NButton size="small" class="" @click="resetAll">重置所有</NButton>
            <NButton size="small" type="error" class="" @click="removeAll">移除所有</NButton>
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
    max?: number;
}

const data = useLocalStorage<CounterData[]>('counterData', [
    {
        count: 0,
        name: '计数器1',
        max: undefined,
    },
]);

const onItemCountUpdate = (index: number, value: number | null) => {
    value = value ?? 0;
    if (data.value[index].max && value > data.value[index].max) {
        data.value[index].count = 1;
    } else {
        data.value[index].count = value;
    }
};

const addNew = () => {
    data.value.push({
        count: 0,
        name: `计数器${data.value.length + 1}`,
        max: undefined,
    });
};

const resetAll = () => {
    data.value.forEach((item) => {
        item.count = 0;
    });
};

const removeAll = () => {
    data.value = [];
    addNew();
};
</script>
