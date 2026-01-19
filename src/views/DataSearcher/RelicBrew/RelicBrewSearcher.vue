<template>
    <NSpin :show="!isInit && isLoading" size="large" description="加载中..." display-directive="show">
        <div class="flex flex-col gap-4 px-2 -mx-2">
            <!-- 过滤器 -->
            <div class="flex flex-col gap-2">
                <RelicBrewFilter v-model:filter="filter" />
                <div class="flex items-center gap-2">
                    <NButton size="small" type="error" @click="onFilterReset">重置</NButton>
                    <NButton size="small" type="primary" @click="openRelicBrewWiki">遗物酒说明</NButton>
                    <NButton size="small" type="primary" @click="showAIPromptModal">AI提示词</NButton>
                </div>
            </div>
            <div v-if="isInit">共有 {{ filteredList.length }} 个符合条件的遗物酒</div>
            <template v-if="filteredList.length > 0">
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
                <table class="wikitable w-full text-center">
                    <thead>
                        <tr>
                            <th class="xl:w-48">遗物名称</th>
                            <th class="xl:w-36 2xl:w-48">遗物酒名</th>
                            <th class="xl:w-36 2xl:w-48">遗物之力</th>
                            <th class="md:w-16">性格</th>
                            <th class="xl:w-36">提升属性</th>
                            <th class="xl:w-36">降低属性</th>
                            <th>掉落怪物</th>
                            <th class="xl:w-36 2xl:w-48">备注</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in paginatedList" :key="item.index" class="hover:bg-[#3a312a]!">
                            <td>{{ item.name }}</td>
                            <td>{{ item.brew }}</td>
                            <td>{{ item.power }}</td>
                            <td>{{ item.align }}</td>
                            <td>{{ item.inc.join(' / ') }}</td>
                            <td>{{ item.dec.join(' / ') }}</td>
                            <td>{{ item.monster }}</td>
                            <td>{{ item.comment || '-' }}</td>
                        </tr>
                    </tbody>
                </table>

                <!-- 分页 -->
                <NPagination v-model:page="pageIndex" :page-count="pageCount"></NPagination>
            </template>
        </div>
    </NSpin>

    <!-- AI提示词模态框 -->
    <NModal v-model:show="isAIPromptModalVisible" title="">
        <template #default>
            <div class="w-[90%] md:h-auto md:w-[700px] m-auto huiji-css-hook bg-transparent!">
                <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
                    <div class="top-0 bg-[#312721] z-10 py-2 text-xl font-bold text-light">
                        <div>AI提示词 - 用于查询黒樽亭每周货物</div>
                    </div>
                    <div class="text-sm">
                        以下是基于当前遗物酒数据生成的AI提示词，请复制并提供给AI大模型，之后可通过截图黒樽亭的购买页面提供给AI的方式快速查询。
                    </div>
                    <NInput
                        v-model:value="aiPrompt"
                        type="textarea"
                        :rows="10"
                        readonly
                        placeholder="AI提示词"
                    ></NInput>
                    <div class="flex justify-end gap-2">
                        <NButton @click="isAIPromptModalVisible = false">关闭</NButton>
                        <NButton type="primary" @click="copyAIPrompt">复制</NButton>
                    </div>
                </div>
            </div>
        </template>
    </NModal>
</template>

<script setup lang="ts">
import { NButton, NInput, NModal, NPagination, NSpin } from 'naive-ui';
import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { useSearcherDataStore } from '../data/searcherDataStore';
import RelicBrewFilter from './RelicBrewFilter.vue';
import { useRelicBrewStore } from './relicBrewStore';

// 使用searcherDataStore的settings
const { settings } = toRefs(useSearcherDataStore());

// 使用计算属性获取和设置过滤器
const filter = computed({
    get: () => settings.value.relicBrewFilter,
    set: (newFilter) => (settings.value.relicBrewFilter = newFilter),
});

// 监听过滤器变化，重置页码
watch(
    () => filter.value,
    (newFilter) => {
        pageIndex.value = 1;
    },
    { deep: true },
);

// 获取relicBrewStore数据
const relicBrewStore = useRelicBrewStore();
const { relicBrews, isInit, isLoading } = toRefs(relicBrewStore);
const { loadRelicBrewData } = relicBrewStore;

// 组件初始化时直接加载数据
onMounted(() => {
    loadRelicBrewData();
});

// 分页相关
const pageSize = ref(20);
const pageIndex = ref(1);
const start = computed(() => (pageIndex.value - 1) * pageSize.value);

// AI提示词相关
const isAIPromptModalVisible = ref(false);
const aiPrompt = ref('');

// 打开AI提示词模态框
const showAIPromptModal = () => {
    // 生成AI提示词
    aiPrompt.value = generateAIPrompt();
    // 显示模态框
    isAIPromptModalVisible.value = true;
};

// 生成AI提示词
const generateAIPrompt = () => {
    // 构建遗物酒数据的详细信息
    const relicBrewDetails = relicBrews.value
        .sort((a, b) => a.index - b.index)
        .map((item) => {
            const incStats = item.inc.join(' / ');
            const decStats = item.dec.join(' / ');
            return `${item.name}（性格：${item.align}，提升属性：${incStats}，降低属性：${decStats}）`;
        })
        .join('\n');

    // 构建完整的AI提示词
    return `请根据以下遗物酒数据为用户提供查询服务：\n\n${relicBrewDetails}\n\n用户会通过截图或文字的方式提供多个遗物酒的名称，请根据用户提供的名称，生成表格展示这些遗物酒的名称、性格、提升属性、降低属性，如果有缺失的遗物酒名称需要告知用户。\n\n不用对本条信息进行解释，下一次用户消息后再进行回复。每次回复只提供表格，不需要其他额外的内容生成。`;
};

// 复制AI提示词到剪贴板
const copyAIPrompt = async () => {
    try {
        await navigator.clipboard.writeText(aiPrompt.value);
        window.wiz.$message.success('AI提示词已复制到剪贴板');
    } catch (err) {
        console.error('复制失败:', err);
        window.wiz.$message.error('复制失败，请手动复制');
    }
};

// 根据过滤器过滤遗物酒，并按i字段（index）排序
const filteredList = computed(() => {
    return relicBrews.value
        .filter((item) => {
            // 搜索文本过滤
            if (filter.value.searchText) {
                if (!item.containsSearchText(filter.value.searchText)) {
                    return false;
                }
            }

            // 性格过滤
            if (filter.value.align && !item.matchesAlign(filter.value.align)) {
                return false;
            }

            // 提升属性过滤
            if (filter.value.inc && !item.matchesInc(filter.value.inc)) {
                return false;
            }

            // 降低属性过滤
            if (filter.value.dec && !item.matchesDec(filter.value.dec)) {
                return false;
            }

            // 仅显示双提升遗物过滤
            if (filter.value.showOnlyDoubleInc && item.inc.length <= 1) {
                return false;
            }

            return true;
        })
        .sort((a, b) => a.index - b.index); // 按i字段（index）排序
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
    // 使用searcherDataStore中的方法获取默认过滤器设置
    const store = useSearcherDataStore();
    filter.value = store.getDefaultRelicBrewFilter();
};

// 打开遗物酒说明页面
const openRelicBrewWiki = () => {
    window.open('/wiki/遗物酒', '_blank');
};
</script>
