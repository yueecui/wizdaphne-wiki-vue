<template>
    <NSpin :show="!isAllInit && isLoading" size="large" description="正在准备杂物数据（首次需整理全部几率，请稍候）" display-directive="show">
        <div class="flex flex-col gap-4 px-2 -mx-2">
            <!-- 过滤器 -->
            <div class="flex flex-col gap-2">
                <JunkFilter v-model:filter="filter" />
                <div class="flex items-center gap-2">
                    <NButton size="small" type="error" @click="onFilterReset">重置</NButton>

                    <NButton v-if="!isAllInit && !isLoading" size="small" type="primary" @click="onLoadJunkData">
                        加载杂物数据
                    </NButton>
                </div>
            </div>
            <div v-if="isAllInit">共有 {{ filteredList.length }} 个符合条件的杂物</div>
            <div v-else-if="!isLoading">
                首次使用请点击「加载杂物数据」：需要下载并整理全部几率，耗时较长；整理结果会缓存到本地，之后进入本页自动读取
            </div>
            <template v-if="isAllInit && filteredList.length > 0">
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
                <table class="wikitable w-full text-center">
                    <thead>
                        <tr>
                            <th>杂物名称</th>
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
                            class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                            @click="openModal(item)"
                            @contextmenu.prevent="showContextMenu($event, item)"
                        >
                            <td class="text-left">
                                <span
                                    :class="{ 'text-gray-500': item.notObt }"
                                    :style="{ opacity: item.notObt ? '0.6 !important' : 1 }"
                                >
                                    {{ item.name }}
                                    <span v-if="item.notObt" class="text-sm ml-1">(无法获取)</span>
                                </span>
                            </td>
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
        </div>
    </NSpin>
    <div class="text-sm text-gray-400">
        <span>
            <span>※ 数据来自</span>
            <a href="https://wizardry.info/daphne/gacha_rates/zh_cn/equipments.html" target="_blank">官方提供的数据</a>
            <span>。</span>
        </span>
    </div>

    <!-- 右键菜单 -->
    <div
        v-if="contextMenu.show"
        class="fixed z-50 bg-[#312721] border! border-[#463d38]! rounded shadow-lg"
        :style="{
            left: contextMenu.x + 'px',
            top: contextMenu.y + 'px',
        }"
    >
        <div class="px-4 py-2 hover:bg-[#463d38] cursor-pointer" @click="copyJunkTemplate(contextMenu.item)">
            复制 &#123;&#123;杂物&#125;&#125;
        </div>
    </div>

    <JunkModal />
</template>

<script setup lang="ts">
import { NButton, NPagination, NSpin } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import JunkFilter from './junk/JunkFilter.vue';
import { JunkItem } from './junk/JunkItem';
import JunkModal from './junk/JunkModal.vue';
import { getGradeColorClass, getTierTableDisplayName } from './junk/constants';
import { hasJunkCache } from './junk/junkCache';
import { useJunkStore } from './junk/junkStore';
import { useJunkModalStore } from './junk/junkModalStore';
import { usePersistentRef } from './dataV2Settings';
import type { IJunkFilter } from './junk/types';

const DEFAULT_FILTER: IJunkFilter = {
    searchText: '',
    maxQuality: 0,
    maxGrade: 0,
    maxTier: 0,
};

const { openModal } = useJunkModalStore();

// 过滤器持久化（对齐 V1 的 junkFilter）
const filter = usePersistentRef<IJunkFilter>('junk.filter', { ...DEFAULT_FILTER });

// 监听过滤器变化，重置页码
watch(
    () => filter.value,
    () => {
        pageIndex.value = 1;
    },
    { deep: true },
);

// 获取junkStore数据
const junkStore = useJunkStore();
const { junkItems, isAllInit, isLoading } = storeToRefs(junkStore);

// 本地已有整理结果时直接读库；没有缓存则保留按钮，由用户主动触发下载 + 整理
onMounted(async () => {
    if (await hasJunkCache()) {
        await onLoadJunkData();
    }
});

const onLoadJunkData = async () => {
    await junkStore.loadAndInitJunkData();
};

// 分页相关
const pageSize = ref(20);
const pageIndex = ref(1);

// 根据过滤器过滤杂物分类
const filteredList = computed(() => {
    return junkItems.value.filter((item) => {
        // 搜索文本过滤
        if (filter.value.searchText) {
            const searchText = filter.value.searchText.toLowerCase();
            if (
                !item.name.toLowerCase().includes(searchText) &&
                !item.data.name.toLowerCase().includes(searchText)
            ) {
                return false;
            }
        }

        // 最高星级过滤
        if (filter.value.maxQuality !== 0 && item.maxQuality !== filter.value.maxQuality) {
            return false;
        }

        // 最高颜色过滤
        if (filter.value.maxGrade !== 0 && item.maxGrade !== filter.value.maxGrade) {
            return false;
        }

        // 最高阶级过滤
        if (filter.value.maxTier !== 0 && item.maxTier !== filter.value.maxTier) {
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

// 重置过滤器
const onFilterReset = () => {
    filter.value = { ...DEFAULT_FILTER };
};

// 右键菜单状态
const contextMenu = ref({
    show: false,
    x: 0,
    y: 0,
    item: null as JunkItem | null,
});

// 显示右键菜单
const showContextMenu = (event: MouseEvent, item: JunkItem) => {
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

// 复制杂物模板
const copyJunkTemplate = (item: JunkItem | null) => {
    if (item) {
        const template = `{{杂物|${item.name}|${item.uniqueCode}}}`;

        // 复制到剪贴板
        navigator.clipboard
            .writeText(template)
            .then(() => {
                // 显示复制成功的提示
                window.wiz.$message.success(`已复制 ${template} 模板到剪贴板`);
            })
            .catch(() => {
                window.wiz.$message.error('复制失败，请手动复制');
            });

        closeContextMenu();
    }
};
</script>
