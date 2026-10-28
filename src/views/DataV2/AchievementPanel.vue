<template>
    <div class="flex flex-col gap-3">
        <!-- 分类 -->
        <div class="flex flex-wrap items-center gap-2">
            <NButton size="small" :type="filter.category === '' ? 'primary' : 'default'" @click="filter.category = ''">
                全部
            </NButton>
            <NButton
                v-for="cate in categoryOrder"
                :key="cate"
                size="small"
                :type="filter.category === cate ? 'primary' : 'default'"
                @click="filter.category = cate"
            >
                {{ cate }}
            </NButton>
        </div>

        <!-- 过滤 -->
        <div class="flex flex-wrap items-center gap-2">
            <NInput v-model:value="filter.searchText" clearable placeholder="搜索成就名称 / 描述" class="w-64!" />
            <NSelect
                v-if="filter.category === '奈落'"
                v-model:value="filter.subCategory"
                :options="subCategoryOptions"
                clearable
                placeholder="子分类"
                class="w-44!"
            />
            <NSelect
                v-model:value="filter.completionStatus"
                :options="completionStatusOptions"
                class="w-32!"
            />
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
        </div>

        <div v-if="isInit">共有 {{ filtered.length }} 个符合条件的成就</div>
        <div v-else>数据加载中...</div>

        <template v-if="isInit && filtered.length">
            <NPagination v-model:page="page" :page-count="pageCount" />

            <div class="overflow-x-auto">
                <table class="wikitable w-full text-center m-0!">
                    <thead class="sticky top-0 z-10">
                        <tr>
                            <th class="md:w-16">完成</th>
                            <th class="md:w-40 lg:w-56 xl:w-72">成就名称</th>
                            <th class="md:w-24">分类</th>
                            <th class="md:w-32">子分类</th>
                            <th>描述</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in pageRows" :key="item.id">
                            <td>
                                <NCheckbox
                                    :checked="completed.includes(item.id)"
                                    @change="(checked) => toggle(item.id, checked)"
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
            </div>

            <NPagination v-model:page="page" :page-count="pageCount" />
        </template>

        <div class="text-sm text-gray-400">
            <span>※ 完成成就数据保存在浏览器</span>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NInput, NPagination, NSelect } from 'naive-ui';
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { useAchievementStore } from '../DataSearcher/Achievement/achievementStore';
import { convertDescription } from '../DataSearcher/utils/convertDescription';
import { usePersistentFilter } from './dataV2Settings';

defineOptions({ name: '成就面板' });

const PAGE_SIZE = 20;
/** 与 V1 共用同一份完成记录，V1 / V2 的勾选互通 */
const LOCAL_STORAGE_KEY = 'achievement';

const categoryOrder = ['奈落', '冒险者', '装备', '战斗', '探索', '其他'];

const achievementStore = useAchievementStore();
const { achievementItems, isInit, isLoading } = toRefs(achievementStore);
const { loadAchievementData } = achievementStore;

const filter = usePersistentFilter('achievement', {
    searchText: '',
    category: '',
    subCategory: '',
    completionStatus: 'incomplete',
});

const subCategoryOptions = computed(() =>
    achievementStore.getSubCategories(filter.category).map((sub) => ({
        label: sub,
        value: sub === '全部' ? '' : sub,
    })),
);

const completionStatusOptions = [
    { label: '全部', value: 'all' },
    { label: '已完成', value: 'completed' },
    { label: '未完成', value: 'incomplete' },
];

// 分类切到非「奈落」时清空子分类（与 V1 一致）
watch(
    () => filter.category,
    (cate) => {
        if (cate !== '奈落' && filter.subCategory) {
            filter.subCategory = '';
        }
    },
);

const page = ref(1);
watch(
    filter,
    () => {
        page.value = 1;
    },
    { deep: true },
);

// 完成状态（localStorage，与 V1 一致）
const completed = ref<number[]>([]);

const loadCompleted = () => {
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        completed.value = stored ? (JSON.parse(stored) as number[]) : [];
    } catch {
        completed.value = [];
    }
};

const saveCompleted = () => {
    try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(completed.value));
    } catch {
        // 隐私模式 / 配额满：放弃持久化，不影响页面
    }
};

const toggle = (id: number, checked: boolean) => {
    const index = completed.value.indexOf(id);
    if (checked && index === -1) {
        completed.value.push(id);
    } else if (!checked && index !== -1) {
        completed.value.splice(index, 1);
    }
    saveCompleted();
};

const formatComment = (comment: string) => convertDescription(comment);

const filtered = computed(() =>
    achievementItems.value
        .filter((item) => {
            if (filter.searchText) {
                const kw = filter.searchText.toLowerCase();
                if (!item.name.toLowerCase().includes(kw) && !item.desc.toLowerCase().includes(kw)) {
                    return false;
                }
            }
            if (filter.category && item.cate !== filter.category) return false;
            if (filter.subCategory && (!item.sub || item.sub !== filter.subCategory)) return false;

            const isCompleted = completed.value.includes(item.id);
            if (filter.completionStatus === 'completed' && !isCompleted) return false;
            if (filter.completionStatus === 'incomplete' && isCompleted) return false;

            return true;
        })
        .sort((a, b) => a.i - b.i),
);

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));
const pageRows = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE));

const resetFilter = () => {
    filter.searchText = '';
    filter.category = '';
    filter.subCategory = '';
    filter.completionStatus = 'incomplete';
};

onMounted(() => {
    loadAchievementData();
    loadCompleted();
});
</script>
