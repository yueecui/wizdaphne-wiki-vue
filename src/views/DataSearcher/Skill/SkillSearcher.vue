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
                        <th class="md:w-[16em]">名称</th>
                        <th class="md:w-[7em]">分类</th>
                        <th>描述</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="skill in currentPageSkillList" :key="skill.data.name" class="hover:bg-black/30">
                        <td>
                            <div class="flex justify-between items-center">
                                <div>{{ skill.data.name }}</div>
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

import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { Character } from '../Character/Character';
import { useSearcherDataStore } from '../data/searcherDataStore';
import { convertDescription } from '../utils/convertDescription';

// 使用searcherDataStore的settings
const { settings } = toRefs(useSearcherDataStore());

// 使用计算属性获取和设置技能过滤器
const filter = computed({
    get: () => settings.value.skillFilter,
    set: (newFilter) => (settings.value.skillFilter = newFilter),
});

watch(
    () => filter.value,
    (newFilter) => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const store = useSearcherDataStore();

// 使用searcherDataStore的settings
// const settings = computed(() => store.settings); // 已移至顶部使用toRefs

const pageSize = ref(20);
const pageIndex = ref(1);

// 使用computed属性获取技能列表，确保数据变化时自动更新
const skillList = computed(() => {
    return store.getSkillList;
});

const pageCount = computed(() => Math.ceil(filteredSkillList.value.length / pageSize.value));

const filteredSkillList = computed(() => {
    return skillList.value.filter((skill) => skill.isMatch(filter.value));
});
const currentPageSkillList = computed(() => {
    return filteredSkillList.value.slice((pageIndex.value - 1) * pageSize.value, pageIndex.value * pageSize.value);
});

onMounted(async () => {
    // 组件挂载时不再重置过滤器，保持之前保存的设置
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
    settings.value.skillFilter = {
        searchText: '',
        category: '',
        type: '',
    };
};

const gotoEditSkillData = (skillName: string) => {
    const url = `/wiki/Data:Skill.schema?target=Data:Skill/${skillName}.json`;
    window.open(url, '_blank');
};
</script>
