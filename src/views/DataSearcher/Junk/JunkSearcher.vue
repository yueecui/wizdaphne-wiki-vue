<template>
    <NSpin :show="!isInit && isLoading" size="large" description="加载中..." display-directive="show">
        <div class="flex flex-col gap-4 px-2 -mx-2">
            <!-- 过滤器 -->
            <div class="flex flex-col gap-2">
                <JunkFilter v-model:filter="filter" />
                <div class="flex items-center gap-2">
                    <NButton size="small" type="error" @click="onFilterReset">重置</NButton>

                    <NButton v-if="!isInit && !isLoading" size="small" type="primary" @click="loadJunkData">
                        加载杂物数据
                    </NButton>
                    <div class="flex items-center gap-1 ml-2">
                        <NCheckbox v-model:checked="autoLoad" label="自动加载数据" class="text-sm"></NCheckbox>
                    </div>
                </div>
            </div>
            <div v-if="isInit">共有 {{ filteredList.length }} 个符合条件的杂物</div>
            <div v-else-if="!isLoading">请点击「加载杂物数据」，数据初始化时间较长请耐心等待</div>
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
import { NButton, NCheckbox, NModal, NPagination, NSpin } from 'naive-ui';
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { DEFAULT_SETTINGS, useSearcherDataStore } from '../data/searcherDataStore';
import { getGradeColorClass, getTierTableDisplayName } from './constants';
import JunkDetail from './JunkDetail.vue';
import JunkFilter from './JunkFilter.vue';
import { JunkItem } from './JunkItem';
import { useJunkStore } from './junkStore';

// 使用searcherDataStore的settings
const { settings } = toRefs(useSearcherDataStore());

// 使用计算属性获取和设置过滤器
const filter = computed({
    get: () => settings.value.junkFilter,
    set: (newFilter) => (settings.value.junkFilter = newFilter),
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
const junkStore = useJunkStore();
const { junkItems, isInit, isLoading } = toRefs(junkStore);
const { loadJunkData } = junkStore;

// 使用计算属性获取和设置自动加载开关
const autoLoad = computed({
    get: () => settings.value.junkFilter.junkAutoLoad,
    set: (value) => (settings.value.junkFilter.junkAutoLoad = value),
});

// 组件初始化时检查是否需要自动加载数据
onMounted(() => {
    if (autoLoad.value) {
        loadJunkData();
    }
});

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
        ...DEFAULT_SETTINGS.junkFilter,
        junkAutoLoad: filter.value.junkAutoLoad, // 保留当前的autoLoad设置
    };
};
</script>
