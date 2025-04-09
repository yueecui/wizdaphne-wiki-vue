<template>
    <div class="flex flex-col gap-4 min-h-[480px]">
        <div class="flex justify-between">
            <div class="flex gap-2">
                <NButton :type="activeKey === 'Near' ? 'primary' : 'default'" @click="() => (activeKey = 'Near')">
                    待办项目
                </NButton>
                <NButton :type="activeKey === 'All' ? 'primary' : 'default'" @click="() => (activeKey = 'All')">
                    全部
                </NButton>
            </div>
            <div class="flex gap-2">
                <NButton @click="() => showImporter('export')">导出</NButton>
                <NButton @click="() => showImporter('import')">导入</NButton>
            </div>
        </div>

        <div v-if="activeKey === 'Near'">
            <table class="wiztable text-center my-0! w-full" v-if="nearDropConfigs.length > 0">
                <thead>
                    <tr>
                        <th class="w-[4em] md:w-[8em]">类型</th>
                        <th>项目</th>
                        <th class="w-[4em] md:w-[8em]">周期</th>
                        <th class="w-[5.5em] md:w-[10em]">计时</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="item in nearDropConfigs" :key="item.id">
                        <tr
                            v-if="item instanceof DropConfig"
                            class="hover:bg-[#3b322c] cursor-pointer text-green-400"
                            @click="() => clickItem(item)"
                        >
                            <td>{{ getDropCategoryText(item.category) }}</td>
                            <td class="text-left">{{ item.title }}</td>
                            <td>{{ item.getRefreshTimeText() }}</td>
                            <td>{{ getRemainTimeText(item) }}</td>
                        </tr>
                        <tr
                            v-if="item instanceof FixedRefreshConfig"
                            class="hover:bg-[#3b322c] cursor-pointer text-green-400"
                            @click="() => clickItem(item)"
                        >
                            <td>固定周期</td>
                            <td class="text-left">{{ item.title }}</td>
                            <td>{{ item.getRefreshTimeText() }}</td>
                            <td>{{ getRemainTimeText(item) }}</td>
                        </tr>
                    </template>
                </tbody>
            </table>
            <div class="h-[360px] flex items-center justify-center" v-else>
                <div class="text-center text-gray-400">暂无一天内会刷新的项目</div>
            </div>
        </div>
        <div v-if="activeKey === 'All'" class="flex flex-col gap-4">
            <div class="text-center text-amber-300 mt-4 text-sm">
                刷新周期目前为收集各网站的信息获得，正在逐步验证，可能有偏差，仅供参考
            </div>
            <table class="wiztable text-center my-0! w-full">
                <thead>
                    <tr>
                        <th colspan="3">固定周期</th>
                    </tr>
                    <tr>
                        <th>项目</th>
                        <th class="w-[4em] md:w-[8em]">周期</th>
                        <th class="w-[5.5em] md:w-[10em]">计时</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in fixedConfigs"
                        :key="item.data.id"
                        class="hover:bg-[#3b322c] cursor-pointer"
                        :class="isNear(item) ? 'text-green-400' : ''"
                        @click="() => clickItem(item)"
                    >
                        <td class="text-left">{{ item.data.title }}</td>
                        <td>{{ item.getRefreshTimeText() }}</td>
                        <td>{{ getRemainTimeText(item) }}</td>
                    </tr>
                </tbody>
            </table>
            <table class="wiztable text-center my-0! w-full" v-for="category in dropCategorys" :key="category.i">
                <thead>
                    <tr>
                        <th colspan="3">{{ category.name }}</th>
                    </tr>
                    <tr>
                        <th>项目</th>
                        <th class="w-[4em] md:w-[6em]">周期</th>
                        <th class="w-[5.5em] md:w-[10em]">计时</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in getDropConfigsByCategory(category.i)"
                        :key="item.data.id"
                        class="hover:bg-[#3b322c] cursor-pointer"
                        :class="isNear(item) ? 'text-green-400' : ''"
                        @click="() => clickItem(item)"
                    >
                        <td class="text-left">{{ item.data.title }}</td>
                        <td>{{ item.getRefreshTimeText() }}</td>
                        <td>{{ getRemainTimeText(item) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <div class="md:hidden flex justify-center mt-4 gap-4" v-if="onClose">
        <NButton size="small" type="warning" @click="onClose">关闭</NButton>
    </div>
    <NModal v-model:show="isShowItem">
        <div class="max-w-[90%] mx-auto huiji-css-hook bg-transparent!">
            <DropRecorderItem :item="showItem" v-model:dropRecords="dropRecords" :onClose="closeItem" />
        </div>
    </NModal>
    <DropRecorderImporter v-model:show="isShowImporter" :mode="importMode" />
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import DropRecorderImporter from './DropRecorderImporter.vue';
import DropRecorderItem from './DropRecorderItem.vue';

import { useLocalStorage } from '@vueuse/core';
import { NModal } from 'naive-ui';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { IS_DEV } from '../../util';
import { DropConfig } from './classes/DropConfig';
import { FixedRefreshConfig } from './classes/FixedRefreshConfig';
import { IDropCategory, IDropConfigFile, IDropRecord, RecordConfig } from './type';
import { formatTimeFromMilliseconds } from './util';

defineProps<{
    onClose?: () => void;
}>();

const dropConfigs = ref<DropConfig[]>([]);
const dropCategorys = ref<IDropCategory[]>([]);
const fixedConfigs: FixedRefreshConfig[] = [
    new FixedRefreshConfig({
        id: 'F1',
        title: '每周官网商店领50石',
        description: '每周可以登录官网商店领取50石，每周日23点刷新',
        refreshType: '每周日',
        refreshText: '每周日晚23点',
        link: 'https://store.wizardry.info/ja-JP',
        linkText: '点击打开官网商店',
    }),
    new FixedRefreshConfig({
        id: 'F2',
        title: '炉壶的灵庙刷新',
        description: '每两周的周六晚23点，炉壶的灵庙会更新',
        refreshType: '双周六',
        refreshText: '双周六晚23点',
    }),
];

const dropRecords = useLocalStorage<IDropRecord[]>('drop-records', []);

const nearDropConfigs = computed<RecordConfig[]>(() => {
    const nearConfigs = [
        // 第一部分是有记录的drop record，并且临期了
        ...dropRecords.value.map((record) => {
            const dropConfig = dropConfigs.value.find((config) => config.data.id === record.id);
            if (dropConfig) {
                if (dropConfig.isNear(record.timestamp, currentTime.value)) {
                    return dropConfig;
                }
                return null;
            }
            return null;
        }),
        // 第二部分是检查所有固定项目，临期或是没记录的都要
        ...fixedConfigs.map((config) => {
            const dropRecord = dropRecords.value.find((item) => item.id === config.data.id);
            if (dropRecord) {
                if (config.isNear(dropRecord.timestamp, currentTime.value)) {
                    return config;
                }
                return null;
            } else {
                return config;
            }
        }),
    ].filter((item) => item !== null);

    nearConfigs.sort((a, b) => {
        const aRecord = dropRecords.value.find((record) => record.id === a.data.id);
        const bRecord = dropRecords.value.find((record) => record.id === b.data.id);
        if (aRecord && bRecord) {
            return a.getTargetTime(aRecord.timestamp) - b.getTargetTime(bRecord.timestamp);
        }
        return 0;
    });
    return nearConfigs;
});

const currentTime = ref(Date.now());
let timer: NodeJS.Timeout | null = null;
onMounted(() => {
    timer = setInterval(() => {
        currentTime.value = Date.now();
    }, 1000);

    fetch(IS_DEV ? '/dropconfig.json' : '/api.php?action=lua&module=Api/GetDropConfig&format=json&utf8=1').then(
        (res) => {
            if (res.ok) {
                res.json().then((data: IDropConfigFile) => {
                    dropConfigs.value = data.drops.map((item) => new DropConfig(item));
                    dropCategorys.value = data.categorys;

                    nextTick(() => {
                        if (nearDropConfigs.value.length === 0) {
                            activeKey.value = 'All';
                        }
                    });
                });
            } else {
                console.error('获取掉落记录配置失败');
            }
        },
    );
});

onUnmounted(() => {
    if (timer) {
        clearTimeout(timer);
    }
});

const activeKey = ref('Near');

const getDropCategoryText = (categoryIndex: number) => {
    const category = dropCategorys.value.find((item) => item.i === categoryIndex);
    if (category) {
        return category.name;
    }
    return '';
};
const getDropConfigsByCategory = (categoryIndex: number) => {
    return dropConfigs.value.filter((item) => item.data.category === categoryIndex);
};

const isShowItem = ref(false);
const showItem = ref<RecordConfig | null>(null);
const clickItem = (item: RecordConfig) => {
    isShowItem.value = true;
    showItem.value = item;
};
const closeItem = () => {
    isShowItem.value = false;
};

const isNear = (item: RecordConfig) => {
    if (dropRecords.value) {
        const itemRecord = dropRecords.value.find((record) => record.id === item.id);
        if (itemRecord) {
            return item.isNear(itemRecord.timestamp, currentTime.value);
        }
    }
    return false;
};

const getRemainTimeText = (item: RecordConfig) => {
    if (dropRecords.value) {
        const itemRecord = dropRecords.value.find((record) => record.id === item.id);
        if (!itemRecord) {
            return '-';
        }

        const diff = item.getDifferenceTime(itemRecord.timestamp, currentTime.value);
        if (item.isCountdown) {
            if (diff < 0) {
                return '已刷新';
            }
            return formatTimeFromMilliseconds(diff);
        } else {
            return `已过 ${formatTimeFromMilliseconds(diff)}`;
        }
    }
    return '-';
};

// 导入导出
const isShowImporter = ref(false);
const importMode = ref<'import' | 'export'>('import');
const showImporter = (mode: 'import' | 'export') => {
    importMode.value = mode;
    isShowImporter.value = true;
};
</script>
