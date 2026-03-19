<template>
    <NSpin :show="!isInit && isLoading" size="large" description="加载中..." display-directive="show">
        <div class="flex flex-col gap-4 px-2 -mx-2">
            <!-- 过滤器 -->
            <div class="flex flex-col gap-2">
                <MapFilter v-model:filter="filter" />
                <div class="flex items-center gap-2">
                    <NButton size="small" type="error" @click="onFilterReset">重置</NButton>
                    <div class="ml-4 text-red-400">该部分数据正在填写中，仅供测试</div>
                </div>
            </div>
            <div v-if="isInit">共有 {{ filteredList.length }} 个符合条件的地图</div>
            <template v-if="filteredList.length > 0">
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
                <table class="wikitable w-full text-center">
                    <thead>
                        <tr>
                            <th class="md:w-20">等级</th>
                            <th class="md:w-40">分类</th>
                            <th>地图名称</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in paginatedList"
                            :key="item.index"
                            class="hover:bg-[#3a312a]! cursor-pointer"
                            @click="openMapModal(item)"
                            @contextmenu.prevent="showContextMenu($event, item)"
                        >
                            <td :class="item.level <= 0 ? 'text-gray-500 text-sm' : ''">{{ item.levelText }}</td>
                            <td>{{ item.category }}</td>
                            <td>{{ item.name }}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- 分页 -->
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
            </template>

            <!-- 右键菜单 -->
            <div
                v-if="contextMenu.show"
                class="fixed z-50 bg-[#312721] border border-[#463d38] rounded shadow-lg"
                :style="{
                    left: contextMenu.x + 'px',
                    top: contextMenu.y + 'px',
                }"
            >
                <div
                    class="px-4 py-2 hover:bg-[#463d38] cursor-pointer"
                    @click="copyMapTemplateWithShortName(contextMenu.item)"
                >
                    复制 &#123;&#123;地图&#125;&#125;
                </div>
                <div class="px-4 py-2 hover:bg-[#463d38] cursor-pointer" @click="copyMapTemplate(contextMenu.item)">
                    复制 &#123;&#123;地图&#125;&#125; 长名称
                </div>
            </div>
        </div>
    </NSpin>
</template>

<script setup lang="ts">
import { NButton, NPagination, NSpin } from 'naive-ui';
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { useMonsterModalStore } from '../../../stores/monsterModalStore';
import { useSearcherDataStore } from '../data/searcherDataStore';
import { useMonsterStore } from '../Monster/monsterStore';
import { convertDescription } from '../utils/convertDescription';
import type { GameMap } from './Map';
import MapFilter from './MapFilter.vue';

const { settings } = toRefs(useSearcherDataStore());
const { openMapModal } = useMonsterModalStore();

const formatComment = (comment: string) => convertDescription(comment);

const filter = computed({
    get: () => settings.value.mapFilter,
    set: (newFilter) => (settings.value.mapFilter = newFilter),
});

watch(
    () => filter.value,
    (newFilter) => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const monsterStore = useMonsterStore();
const { maps, isInit, isLoading } = toRefs(monsterStore);
const { loadAllData } = monsterStore;

onMounted(() => {
    loadAllData();
});

const pageSize = ref(20);
const pageIndex = ref(1);

const filteredList = computed(() => {
    return maps.value
        .filter((item) => {
            if (filter.value.searchText) {
                if (!item.containsSearchText(filter.value.searchText)) {
                    return false;
                }
            }
            if (filter.value.category) {
                if (item.category !== filter.value.category) {
                    return false;
                }
            }
            return true;
        })
        .sort((a, b) => a.index - b.index);
});

const pageCount = computed(() => Math.ceil(filteredList.value.length / pageSize.value));
const paginatedList = computed(() => {
    const start = (pageIndex.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredList.value.slice(start, end);
});

const onFilterReset = () => {
    const store = useSearcherDataStore();
    filter.value = store.getDefaultMapFilter();
};

// 右键菜单状态
const contextMenu = ref({
    show: false,
    x: 0,
    y: 0,
    item: null as GameMap | null,
});

// 显示右键菜单
const showContextMenu = (event: MouseEvent, item: GameMap) => {
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

// 复制地图模板
const copyMapTemplate = (item: GameMap | null) => {
    if (item) {
        const template = `{{地图|${item.name}}}`;

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
    }
    closeContextMenu();
};

// 复制带短名称的地图模板
const copyMapTemplateWithShortName = (item: GameMap | null) => {
    if (item) {
        // 假设Map类型有shortName属性
        const shortName = (item as any).shortName || item.name;
        const template = `{{地图|${shortName}}}`;

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
    }
    closeContextMenu();
};
</script>
