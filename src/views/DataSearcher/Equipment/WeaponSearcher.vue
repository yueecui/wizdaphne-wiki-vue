<template>
    <div class="flex flex-col gap-4 px-2 -mx-2">
        <div class="flex flex-col gap-2">
            <WeaponFilter v-model:filter="filter" />
            <div><NButton size="small" type="error" @click="onFilterReset">重置</NButton></div>
        </div>
        <div>共有 {{ filteredList.length }} 个符合条件的技能</div>
        <template v-if="filteredList.length > 0">
            <NPagination v-model:page="pageIndex" :pageCount="pageCount"></NPagination>
            <table class="wikitable text-sm text-center">
                <thead>
                    <tr>
                        <th class="md:w-[12em]">名称</th>
                        <th class="md:w-[6em]">类型</th>
                        <th class="md:w-[2em]">阶</th>
                        <th class="md:w-[2em]">攻击</th>
                        <th class="md:w-[2em]">次数</th>
                        <th class="md:w-[2em]">魔力</th>
                        <th class="md:w-[2em]">神力</th>
                        <th class="md:w-[2em]">防御</th>
                        <th class="md:w-[2em]">魔防</th>
                        <th class="md:w-[2em]">速度</th>
                        <th class="md:w-[2em]">命中</th>
                        <th class="md:w-[2em]">会心</th>
                        <th class="md:w-[2em]">回避</th>
                        <th class="md:w-[2em]">抵抗</th>
                        <th>特技</th>
                        <th>描述</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="item in currentPageList" :key="item.data.name" class="hover:bg-black/30">
                        <td>
                            <div class="flex justify-between items-center">
                                <div>{{ item.data.name }}</div>
                            </div>
                        </td>
                        <td>{{ item.data.subcategory }}</td>
                        <td>{{ item.data.tier }}</td>
                        <td>{{ item.data.attack_power }}</td>
                        <td>×{{ item.data.attack_count }}</td>
                        <td>{{ item.data.magic_power }}</td>
                        <td>{{ item.data.divine_power }}</td>
                        <td>{{ item.data.defense }}</td>
                        <td>{{ item.data.magic_defense }}</td>
                        <td>{{ item.data.action_speed }}</td>
                        <td>{{ item.data.accuracy }}</td>
                        <td>{{ item.data.surety }}</td>
                        <td>{{ item.data.evasion }}</td>
                        <td>{{ item.data.resistance }}</td>
                        <td>{{ (item.data.skills ?? []).join('/') }}</td>
                        <td v-html="convertDescription(item.data.description ?? '')"></td>
                    </tr>
                </tbody>
            </table>
            <NPagination v-model:page="pageIndex" :pageCount="pageCount"></NPagination>
        </template>
    </div>
</template>

<script setup lang="ts">
import { NButton, NPagination } from 'naive-ui';
import WeaponFilter from './WeaponFilter.vue';

import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { Character } from '../Character/Character';
import { convertDescription } from '../util/convertDescription';
import { useEquipmentStore } from './equipmentStore';
import { IEquipmentFilter } from './types';

const filter = ref<IEquipmentFilter>({
    searchText: '',
    category: '',
});

watch(
    () => filter.value,
    (newFilter) => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const { equipments } = toRefs(useEquipmentStore());

const pageSize = ref(50);
const pageIndex = ref(1);
const pageCount = computed(() => Math.ceil(filteredList.value.length / pageSize.value));

const filteredList = computed(() => {
    const filteredData = equipments.value.filter((equipment) => equipment.isMatch(filter.value));
    filteredData.sort((a, b) => {
        if (a.getCategoryIndex() !== b.getCategoryIndex()) {
            return a.getCategoryIndex() - b.getCategoryIndex();
        }
        if (a.data.tier !== b.data.tier) {
            return a.data.tier - b.data.tier;
        }
        if (a.data.category === '武器') {
            if (['单手杖', '双手杖'].includes(a.data.subcategory)) {
                if (a.data.magic_power !== b.data.magic_power) {
                    return a.data.magic_power - b.data.magic_power;
                }
                if (a.data.divine_power !== b.data.divine_power) {
                    return a.data.divine_power - b.data.divine_power;
                }
            } else {
                if (a.data.attack_power !== b.data.attack_power) {
                    return a.data.attack_power - b.data.attack_power;
                }
            }
        } else {
            if (a.data.defense !== b.data.defense) {
                return a.data.magic_defense - b.data.magic_defense;
            }
            if (a.data.magic_defense !== b.data.magic_defense) {
                return a.data.defense - b.data.defense;
            }
        }
        return 0;
    });
    return filteredData;
});
const currentPageList = computed(() => {
    return filteredList.value.slice((pageIndex.value - 1) * pageSize.value, pageIndex.value * pageSize.value);
});

onMounted(() => {
    onFilterReset();
});

const showDetailCharacter = ref<Character | null>(null);
const showDetail = (character: Character) => {
    showDetailCharacter.value = character;
    isShowDetail.value = true;
};
const isShowDetail = ref(false);
const closeDetail = () => {
    isShowDetail.value = false;
};

const onFilterReset = () => {
    filter.value = {
        searchText: '',
        category: '',
    };
};
</script>
