<template>
    <div class="flex flex-col gap-4 px-2 -mx-2">
        <div class="flex flex-col gap-2">
            <SkillFilter v-model:filter="filter" />
            <div><NButton size="small" type="error" @click="onFilterReset">重置</NButton></div>
        </div>
        <div>共有 {{ filteredSkillList.length }} 个符合条件的技能</div>
        <template v-if="filteredSkillList.length > 0">
            <NPagination v-model:page="pageIndex" :pageCount="pageCount"></NPagination>
            <table class="wikitable text-sm">
                <thead>
                    <tr>
                        <th class="w-[16em]">名称</th>
                        <th class="w-[7em]">类型</th>
                        <th>描述</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="skill in currentPageSkillList" :key="skill.data.name" class="hover:bg-black/30">
                        <td>
                            <div class="flex justify-between items-center">
                                <div>{{ skill.data.name }}</div>
                                <div v-if="MwConfig.getInstance().isStaff">
                                    <NButton
                                        size="tiny"
                                        type="warning"
                                        @click="() => gotoEditSkillData(skill.data.name)"
                                    >
                                        编辑
                                    </NButton>
                                </div>
                            </div>
                        </td>
                        <td class="text-center">{{ skill.data.category }}</td>
                        <td v-html="convertDescription(skill.data.description)"></td>
                    </tr>
                </tbody>
            </table>
            <NPagination v-model:page="pageIndex" :pageCount="pageCount"></NPagination>
        </template>
    </div>
</template>

<script setup lang="ts">
import { NButton, NPagination } from 'naive-ui';
import SkillFilter from './SkillFilter.vue';

import { computed, onMounted, ref, shallowRef, watch } from 'vue';
import { MwConfig } from '../../../huiji/MwConfig';
import { Character } from '../Character/Character';
import { SearcherExposeData } from '../data/SearcherExposeData';
import { convertDescription } from '../util/convertDescription';
import { Skill } from './Skill';
import { ISkillFilter } from './types';

const filter = ref<ISkillFilter>({
    searchText: '',
    skillType: [],
});

watch(
    () => filter.value,
    (newFilter) => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const skillList = shallowRef<Skill[]>([]);

const pageSize = ref(20);
const pageIndex = ref(1);
const pageCount = computed(() => Math.ceil(filteredSkillList.value.length / pageSize.value));

const filteredSkillList = computed(() => {
    return skillList.value.filter((skill) => skill.isMatch(filter.value));
});
const currentPageSkillList = computed(() => {
    return filteredSkillList.value.slice((pageIndex.value - 1) * pageSize.value, pageIndex.value * pageSize.value);
});

onMounted(() => {
    onFilterReset();
    skillList.value = SearcherExposeData.getInstance().getSkillList();
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
        skillType: ['武器技能', '支援技能', '攻击咒文', '回复咒文', '支援咒文', '妨碍咒文', '职业被动'],
    };
};

const gotoEditSkillData = (skillName: string) => {
    const url = `/wiki/Data:Skill.schema?target=Data:Skill/${skillName}.json`;
    window.open(url, '_blank');
};
</script>
