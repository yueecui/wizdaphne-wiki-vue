<template>
    <NSpin :show="!isInit && isLoading" size="large" description="加载中..." display-directive="show">
        <div class="flex flex-col gap-4 px-2 -mx-2">
            <!-- 过滤器 -->
            <div class="flex flex-col gap-2">
                <MonsterFilter v-model:filter="filter" />
                <div class="flex items-center gap-2">
                    <NButton size="small" type="error" @click="onFilterReset">重置</NButton>
                </div>
            </div>
            <div v-if="isInit">共有 {{ filteredList.length }} 个符合条件的怪物</div>
            <template v-if="filteredList.length > 0">
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
                <table class="wikitable w-full text-center">
                    <thead>
                        <tr>
                            <th class="xl:w-12">ID</th>
                            <th class="xl:w-48">名称</th>
                            <th class="xl:w-24">种族</th>
                            <th class="xl:w-24">属性</th>
                            <th class="xl:w-24">弱点</th>
                            <th class="xl:w-48 2xl:w-64">遗物</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in paginatedList"
                            :key="item.id"
                            class="hover:bg-[#3a312a]! cursor-pointer"
                            @click="openMonsterModal(item)"
                            @contextmenu.prevent="showContextMenu($event, item)"
                        >
                            <td>{{ item.idText }}</td>
                            <td>{{ item.name }}</td>
                            <td>{{ item.race }}</td>
                            <td>{{ item.element || '-' }}</td>
                            <td>{{ item.weakness.join(' / ') || '-' }}</td>
                            <td>{{ item.relic || '-' }}</td>
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
                <div class="px-4 py-2 hover:bg-[#463d38] cursor-pointer" @click="copyMonsterTemplate(contextMenu.item)">
                    复制 &#123;&#123;敌人&#125;&#125;
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
import { convertDescription } from '../utils/convertDescription';
import type { Monster } from './Monster';
import MonsterFilter from './MonsterFilter.vue';
import { useMonsterStore } from './monsterStore';

const { settings } = toRefs(useSearcherDataStore());

const formatComment = (comment: string) => convertDescription(comment);

const filter = computed({
    get: () => settings.value.monsterFilter,
    set: (newFilter) => (settings.value.monsterFilter = newFilter),
});

watch(
    () => filter.value,
    (newFilter) => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const monsterStore = useMonsterStore();
const { monsters, isInit, isLoading } = toRefs(monsterStore);
const { loadAllData } = monsterStore;

const monsterModalStore = useMonsterModalStore();
const { openMonsterModal } = monsterModalStore;

onMounted(() => {
    loadAllData();
});

const pageSize = ref(20);
const pageIndex = ref(1);
const start = computed(() => (pageIndex.value - 1) * pageSize.value);

const filteredList = computed(() => {
    return monsters.value
        .filter((item) => {
            if (filter.value.searchText) {
                if (!item.containsSearchText(filter.value.searchText)) {
                    return false;
                }
            }

            if (filter.value.race && !item.matchesRace(filter.value.race)) {
                return false;
            }

            if (filter.value.element && !item.matchesElement(filter.value.element)) {
                return false;
            }

            if (filter.value.weakness && !item.matchesWeakness(filter.value.weakness)) {
                return false;
            }

            return true;
        })
        .sort((a, b) => a.id - b.id);
});

const pageCount = computed(() => Math.ceil(filteredList.value.length / pageSize.value));
const paginatedList = computed(() => {
    const start = (pageIndex.value - 1) * pageSize.value;
    const end = start + pageSize.value;
    return filteredList.value.slice(start, end);
});

const onFilterReset = () => {
    const store = useSearcherDataStore();
    filter.value = store.getDefaultMonsterFilter();
};

// 右键菜单状态
const contextMenu = ref({
    show: false,
    x: 0,
    y: 0,
    item: null as Monster | null,
});

// 显示右键菜单
const showContextMenu = (event: MouseEvent, item: Monster) => {
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

// 复制敌人模板
const copyMonsterTemplate = (item: Monster | null) => {
    if (item) {
        const template = `{{敌人|${item.name}}}`;

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
