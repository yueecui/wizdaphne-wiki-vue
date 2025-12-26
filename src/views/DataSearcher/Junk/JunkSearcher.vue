<template>
    <NSpin :show="!isInit" size="large" description="加载中..." display-directive="show">
        <div class="flex flex-col gap-4 px-2 -mx-2">
            <!-- 过滤器 -->
            <div class="flex flex-col gap-2">
                <JunkFilter v-model:filter="filter" />
                <div><NButton size="small" type="error" @click="onFilterReset">重置</NButton></div>
            </div>
            <div>共有 {{ filteredList.length }} 个符合条件的杂物</div>
            <template v-if="filteredList.length > 0">
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
                <table class="wikitable w-full text-center">
                    <thead>
                        <tr>
                            <th>杂物分类名称</th>
                            <th>包含物品数量</th>
                            <th>最高星级</th>
                            <th>最高颜色</th>
                            <th>最高阶级</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in paginatedList"
                            :key="item.name"
                            class="cursor-pointer hover:bg-[#3a312a]!"
                            @click="showDetail(item)"
                        >
                            <td class="text-left">{{ item.name }}</td>
                            <td>{{ item.getRatesGroupedByName().size }}</td>
                            <td>{{ item.maxQuality }}</td>
                            <td :class="getGradeColorClass(item.maxGrade)">{{ item.maxGrade }}</td>
                            <td>{{ getTierTableDisplayName(item.maxTier) }}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- 分页 -->
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
            </template>
            <!-- 杂物分类列表 -->
        </div>
    </NSpin>

    <!-- 详情模态框 -->
    <NModal v-model:show="isShowDetail">
        <template v-if="selectedItem">
            <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                <JunkDetail :junkItem="selectedItem" :onClose="closeDetail" />
            </div>
        </template>
    </NModal>
</template>

<script setup lang="ts">
import { NButton, NModal, NPagination, NSpin } from 'naive-ui';
import { computed, ref, toRefs, watch } from 'vue';
import { getGradeColorClass, getTierTableDisplayName } from './constants';
import JunkDetail from './JunkDetail.vue';
import JunkFilter from './JunkFilter.vue';
import { JunkItem } from './JunkItem';
import { useJunkStore } from './junkStore';
import { IJunkFilter } from './types';

// 初始化过滤器
const filter = ref<IJunkFilter>({
    searchText: '',
    maxQuality: null,
    maxGrade: null,
    maxTier: null,
});

// 监听过滤器变化，重置页码
watch(
    () => filter.value,
    (newFilter) => {
        pageIndex.value = 1;
    },
    { deep: true },
);

// 获取junkStore数据
const { junkItems, isInit } = toRefs(useJunkStore());

// 分页相关
const pageSize = ref(20);
const pageIndex = ref(1);

// 根据过滤器过滤杂物分类
const filteredList = computed(() => {
    return junkItems.value.filter((item) => {
        // 搜索文本过滤
        if (filter.value.searchText) {
            const searchText = filter.value.searchText.toLowerCase();
            if (!item.name.toLowerCase().includes(searchText) && !item.data.name.toLowerCase().includes(searchText)) {
                return false;
            }
        }

        // 最高星级过滤
        if (filter.value.maxQuality !== null && item.maxQuality !== filter.value.maxQuality) {
            return false;
        }

        // 最高颜色过滤
        if (filter.value.maxGrade !== null && item.maxGrade !== filter.value.maxGrade) {
            return false;
        }

        // 最高阶级过滤
        if (filter.value.maxTier !== null && item.maxTier !== filter.value.maxTier) {
            return false;
        }

        return true;
    });
});

// 分页计算
const pageCount = computed(() => Math.ceil(filteredList.value.length / pageSize.value));
const paginatedList = computed(() => {
    const start = (pageIndex.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredList.value.slice(start, end);
});

// 详情模态框相关
const selectedItem = ref<JunkItem | null>(null);
const isShowDetail = ref(false);

const showDetail = (item: JunkItem) => {
    selectedItem.value = item;
    isShowDetail.value = true;
};

const closeDetail = () => {
    isShowDetail.value = false;
};

// 重置过滤器
const onFilterReset = () => {
    filter.value = {
        searchText: '',
        maxQuality: null,
        maxGrade: null,
        maxTier: null,
    };
};
</script>
