<template>
    <NSpin :show="!isInit && isLoading" size="large" description="加载中..." display-directive="show">
        <div class="flex flex-col gap-4 px-2 -mx-2">
            <div class="flex flex-col gap-2">
                <ItemFilter v-model:filter="filter" />
                <div class="flex items-center gap-2">
                    <NButton size="small" type="error" @click="onFilterReset">重置</NButton>
                </div>
            </div>
            <div v-if="isInit">共有 {{ filteredList.length }} 个符合条件的物品</div>
            <div v-else-if="!isLoading">数据加载中...</div>
            <template v-if="filteredList.length > 0">
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
                <table class="wikitable w-full text-center">
                    <thead>
                        <tr>
                            <th class="md:w-16">编号</th>
                            <th class="md:w-40 lg:w-56 xl:w-72">物品名称</th>
                            <th class="md:w-24">分类</th>
                            <th class="md:w-24">出售价格</th>
                            <th>描述</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in paginatedList"
                            :key="item.id"
                            :class="{ 'text-gray-500': item.isUnconfirmed() }"
                            class="cursor-pointer hover:bg-[#3a312a]! transition-colors"
                            @click="handleItemClick(item)"
                        >
                            <td>{{ item.id }}</td>
                            <td class="text-left">
                                {{ item.name }}
                                <span v-if="item.isUnconfirmed()" class="text-sm">（待确认）</span>
                            </td>
                            <td>{{ getCategoryName(item.cate) }}</td>
                            <td>{{ item.sell > 0 ? item.sell : '-' }}</td>
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
</template>

<script setup lang="ts">
import { NButton, NPagination, NSpin } from 'naive-ui';
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { useItemModalStore } from '../../../stores/itemModalStore';
import { DEFAULT_SETTINGS, useSearcherDataStore } from '../data/searcherDataStore';
import { convertDescription } from '../utils/convertDescription';
import ItemFilter from './ItemFilter.vue';
import { useItemStore } from './itemStore';

const { settings } = toRefs(useSearcherDataStore());

// 将convertDescription函数暴露给模板
const formatComment = (comment: string) => convertDescription(comment);

const filter = computed({
    get: () => settings.value.itemFilter,
    set: (newFilter) => (settings.value.itemFilter = newFilter),
});

watch(
    () => filter.value,
    () => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const itemStore = useItemStore();
const { itemItems, isInit, isLoading } = toRefs(itemStore);
const { loadItemData } = itemStore;

const itemModalStore = useItemModalStore();

// 分类映射
const categoryMap: Record<number, string> = {
    0: '出售',
    1: '消耗品',
    2: '贵重品',
    4: '其他',
};

// 获取分类名称
const getCategoryName = (cate: number) => {
    return categoryMap[cate] || '其他';
};

onMounted(() => {
    console.log('ItemSearcher mounted, loading data...');
    loadItemData();
});

const pageSize = ref(20);
const pageIndex = ref(1);

const filteredList = computed(() => {
    return itemItems.value
        .filter((item) => {
            if (filter.value.searchText) {
                const searchText = filter.value.searchText.trim();
                // 如果搜索词是数字，精确匹配物品ID
                if (/^\d+$/.test(searchText)) {
                    const searchId = parseInt(searchText, 10);
                    if (item.id !== searchId) {
                        return false;
                    }
                } else {
                    // 否则在名称和描述中搜索
                    const lowerSearchText = searchText.toLowerCase();
                    if (
                        !item.name.toLowerCase().includes(lowerSearchText) &&
                        !(item.desc && item.desc.toLowerCase().includes(lowerSearchText))
                    ) {
                        return false;
                    }
                }
            }

            if (filter.value.category) {
                const itemCate = item.cate?.toString() ?? '';
                if (itemCate !== filter.value.category) {
                    return false;
                }
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
        ...DEFAULT_SETTINGS.itemFilter,
    };
};

const handleItemClick = (item: any) => {
    itemModalStore.openModal(item);
};
</script>
