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
                            class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                            @click="handleItemClick(item)"
                            @contextmenu.prevent="showContextMenu($event, item)"
                        >
                            <td>{{ item.idStr }}</td>
                            <td class="text-left">
                                {{ item.name }}
                                <span v-if="item.isUnconfirmed()" class="text-sm">（待确认）</span>
                            </td>
                            <td>{{ item.cateStr }}</td>
                            <td>{{ item.sell > 0 ? item.sell : '-' }}</td>
                            <td class="text-left">
                                <span v-html="convertDescription(item.desc)"></span>
                                <div v-if="!item.desc && item.comment" class="text-gray-500 text-sm">
                                    <span v-html="convertDescription(item.comment)"></span>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
            </template>
        </div>

        <!-- 右键菜单 -->
        <div
            v-if="contextMenu.show"
            class="fixed z-50 bg-[#312721] border border-[#463d38] rounded shadow-lg"
            :style="{
                left: contextMenu.x + 'px',
                top: contextMenu.y + 'px',
            }"
        >
            <div class="px-4 py-2 hover:bg-[#463d38] cursor-pointer" @click="copyItemTemplate(contextMenu.item)">
                复制 &#123;&#123;物品&#125;&#125;
            </div>
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

// 右键菜单状态
const contextMenu = ref({
    show: false,
    x: 0,
    y: 0,
    item: null as any,
});

// 显示右键菜单
const showContextMenu = (event: MouseEvent, item: any) => {
    contextMenu.value = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        item: item,
    };
    document.addEventListener('click', closeContextMenu);
};

// 关闭右键菜单
const closeContextMenu = () => {
    contextMenu.value.show = false;
    document.removeEventListener('click', closeContextMenu);
};

// 复制物品模板
const copyItemTemplate = (item: any) => {
    if (item) {
        const template = `{{物品|${item.name}}}`;

        // 复制到剪贴板
        navigator.clipboard
            .writeText(template)
            .then(() => {
                // 显示复制成功的提示
                window.wiz.$message.success(`已复制 ${template} 模板到剪贴板`);
            })
            .catch((err) => {
                window.wiz.$message.error('复制失败，请手动复制');
            });

        closeContextMenu();
    }
};
</script>
