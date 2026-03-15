<template>
    <div>
        <div class="flex flex-wrap flex-row gap-2 items-start">
            <!-- 搜索框 -->
            <div class="flex flex-col w-60">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">搜索词</label>
                </div>
                <div class="flex items-center h-12">
                    <NInput v-model:value="filter.searchText" placeholder="" size="small"></NInput>
                </div>
            </div>

            <!-- 种族过滤 -->
            <div class="flex flex-col w-32">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">种族</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.race"
                        placeholder="全部"
                        size="small"
                        :options="raceOptions"
                    ></NSelect>
                </div>
            </div>

            <!-- 属性过滤 -->
            <div class="flex flex-col w-24">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">属性</label>
                </div>
                <div class="flex items-center h-12">
                    <NSelect
                        v-model:value="filter.element"
                        placeholder="全部"
                        size="small"
                        :options="elementOptions"
                    ></NSelect>
                </div>
            </div>

            <!-- 弱点过滤 -->
            <div class="flex flex-col">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">弱点</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <template v-for="element in elementList" :key="element">
                        <div
                            class="w-8 h-8 relative group cursor-pointer"
                            :class="getWeaknessIconClass(element)"
                            @click="handleWeaknessClick(element)"
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
        </div>
    </div>
</template>

<script setup lang="ts">
import { NInput, NSelect, SelectOption } from 'naive-ui';
import { computed, onMounted, toRefs } from 'vue';
import ElementIcon from '../../../components/ElementIcon.vue';
import type { ELEMENT_TYPE } from '../data/enum';
import { useMonsterStore } from './monsterStore';
import type { IMonsterFilter } from './types';

const filter = defineModel<IMonsterFilter>('filter', {
    type: Object,
    required: true,
});

const monsterStore = useMonsterStore();
const { loadAllData, monsters, monsterRaceList } = toRefs(monsterStore);

onMounted(() => {
    loadAllData.value();
});

const raceOptions = computed<SelectOption[]>(() => {
    const raceList = monsterRaceList.value.length > 0 ? [...monsterRaceList.value] : [];
    raceList.push('未知');
    return [
        { label: '全部', value: '' },
        ...raceList.map((race) => ({
            label: race,
            value: race,
        })),
    ];
});

const elementList = ['火', '水', '风', '土', '光', '暗'] as ELEMENT_TYPE[];

const elementOptions = computed<SelectOption[]>(() => {
    const fixedElements = ['火', '水', '风', '土', '光', '暗', '无', '未知'];
    return [
        { label: '全部', value: '' },
        ...fixedElements.map((element) => ({
            label: element,
            value: element,
        })),
    ];
});

const getWeaknessIconClass = (element: string) => {
    if (!filter.value.weakness) return '';
    if (filter.value.weakness !== element) {
        return 'inactive';
    }
    return '';
};

const handleWeaknessClick = (element: string) => {
    if (filter.value.weakness === element) {
        filter.value.weakness = '';
    } else {
        filter.value.weakness = element;
    }
};
</script>
