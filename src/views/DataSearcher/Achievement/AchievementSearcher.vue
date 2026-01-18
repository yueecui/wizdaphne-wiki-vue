<template>
    <NSpin :show="!isInit && isLoading" size="large" description="加载中..." display-directive="show">
        <div class="flex flex-col gap-4 px-2 -mx-2">
            <div class="flex flex-col gap-2">
                <AchievementFilter v-model:filter="filter" />
                <div class="flex items-center gap-2">
                    <NButton size="small" type="error" @click="onFilterReset">重置</NButton>
                </div>
            </div>
            <div v-if="isInit">共有 {{ filteredList.length }} 个符合条件的成就</div>
            <div v-else-if="!isLoading">数据加载中...</div>
            <template v-if="filteredList.length > 0">
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
                <table class="wikitable w-full text-center">
                    <thead>
                        <tr>
                            <th>完成</th>
                            <th>成就名称</th>
                            <th>分类</th>
                            <th>子分类</th>
                            <th>描述</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in paginatedList" :key="item.id">
                            <td>
                                <NCheckbox
                                    :checked="completedAchievements.includes(item.id)"
                                    @change="(checked) => toggleAchievementCompletion(item.id, checked)"
                                />
                            </td>
                            <td class="text-left">{{ item.name }}</td>
                            <td>{{ item.cate }}</td>
                            <td>{{ item.sub || '-' }}</td>
                            <td class="text-left">
                                {{ item.desc }}
                                <div v-if="item.comment" class="text-gray-500 text-sm">
                                    <span v-html="formatComment(item.comment)"></span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
            </template>
        </div>
    </NSpin>
    <div class="text-sm text-gray-400">
        <span>※ 完成成就数据保存在浏览器</span>
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NPagination, NSpin } from 'naive-ui';
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { DEFAULT_SETTINGS, useSearcherDataStore } from '../data/searcherDataStore';
import { convertDescription } from '../utils/convertDescription';
import AchievementFilter from './AchievementFilter.vue';
import { useAchievementStore } from './achievementStore';

const { settings } = toRefs(useSearcherDataStore());

// 将convertDescription函数暴露给模板
const formatComment = (comment: string) => convertDescription(comment);

const filter = computed({
    get: () => settings.value.achievementFilter,
    set: (newFilter) => (settings.value.achievementFilter = newFilter),
});

watch(
    () => filter.value,
    () => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const achievementStore = useAchievementStore();
const { achievementItems, isInit, isLoading } = toRefs(achievementStore);
const { loadAchievementData } = achievementStore;

// 成就完成状态存储
const LOCAL_STORAGE_KEY = 'achievement';

// 加载已完成成就状态
const completedAchievements = ref<number[]>([]);

// 从localStorage加载已完成成就
const loadCompletedAchievements = () => {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            completedAchievements.value = JSON.parse(stored);
        }
    } catch (error) {
        console.error('加载已完成成就失败:', error);
        completedAchievements.value = [];
    }
};

// 保存已完成成就到localStorage
const saveCompletedAchievements = () => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(completedAchievements.value));
    } catch (error) {
        console.error('保存已完成成就失败:', error);
    }
};

// 切换成就完成状态
const toggleAchievementCompletion = (id: number, checked: boolean) => {
    const index = completedAchievements.value.indexOf(id);
    if (checked && index === -1) {
        completedAchievements.value.push(id);
    } else if (!checked && index !== -1) {
        completedAchievements.value.splice(index, 1);
    }
    saveCompletedAchievements();
};

onMounted(() => {
    loadAchievementData();
    loadCompletedAchievements();
});

const pageSize = ref(20);
const pageIndex = ref(1);

const filteredList = computed(() => {
    return achievementItems.value
        .filter((item) => {
            if (filter.value.searchText) {
                const searchText = filter.value.searchText.toLowerCase();
                if (!item.name.toLowerCase().includes(searchText) && !item.desc.toLowerCase().includes(searchText)) {
                    return false;
                }
            }

            if (filter.value.category && item.cate !== filter.value.category) {
                return false;
            }

            if (filter.value.subCategory) {
                if (!item.sub || item.sub !== filter.value.subCategory) {
                    return false;
                }
            }

            // 完成状态过滤
            const isCompleted = completedAchievements.value.includes(item.id);
            if (filter.value.completionStatus === 'completed' && !isCompleted) {
                return false;
            }
            if (filter.value.completionStatus === 'incomplete' && isCompleted) {
                return false;
            }

            return true;
        })
        .sort((a, b) => a.i - b.i);
});

const pageCount = computed(() => Math.ceil(filteredList.value.length / pageSize.value));
const paginatedList = computed(() => {
    const start = (pageIndex.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredList.value.slice(start, end);
});

const onFilterReset = () => {
    filter.value = {
        ...DEFAULT_SETTINGS.achievementFilter,
        achievementAutoLoad: filter.value.achievementAutoLoad,
    };
};
</script>
