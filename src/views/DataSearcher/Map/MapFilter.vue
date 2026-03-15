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
        </div>
    </div>
</template>

<script setup lang="ts">
import { NInput, SelectOption } from 'naive-ui';
import { computed, onMounted, toRefs } from 'vue';
import { useMonsterStore } from '../Monster/monsterStore';
import type { IMapFilter } from './types';

const filter = defineModel<IMapFilter>('filter', {
    type: Object,
    required: true,
});

const monsterStore = useMonsterStore();
const { loadAllData, maps, monsters } = toRefs(monsterStore);

onMounted(() => {
    loadAllData.value();
});

const enemyOptions = computed<SelectOption[]>(() => {
    const enemySet = new Set<string>();
    maps.value.forEach((map) => {
        map.enemies.forEach((enemy) => {
            enemySet.add(enemy);
        });
    });
    const sortedEnemies = Array.from(enemySet).sort();
    return [
        { label: '全部', value: '' },
        ...sortedEnemies.map((enemy) => ({
            label: enemy,
            value: enemy,
        })),
    ];
});
</script>
