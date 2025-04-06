<template>
    <div class="flex flex-col gap-4 min-h-[480px]">
        <div class="flex gap-2">
            <NButton :type="activeKey === 'Near' ? 'primary' : 'default'" @click="() => (activeKey = 'Near')">
                将有刷新
            </NButton>
            <NButton :type="activeKey === 'All' ? 'primary' : 'default'" @click="() => (activeKey = 'All')">
                全部
            </NButton>
        </div>
        <div v-if="activeKey === 'Near'">
            <table class="wiztable text-center my-0! w-full" v-if="nearDropConfigs.length > 0">
                <thead>
                    <tr>
                        <th class="w-[4em] md:w-[8em]">类型</th>
                        <th>项目</th>
                        <th class="w-[4em] md:w-[6em]">周期</th>
                        <th class="w-[5.5em] md:w-[10em]">计时</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in nearDropConfigs"
                        :key="item.data.id"
                        class="hover:bg-[#3b322c] cursor-pointer text-green-400"
                        @click="() => clickItem(item)"
                    >
                        <td>{{ getDropCategoryText(item.data.category) }}</td>
                        <td class="text-left">{{ item.data.title }}</td>
                        <td>{{ item.getRefreshTimeText() }}</td>
                        <td>{{ getRemainTimeText(item) }}</td>
                    </tr>
                </tbody>
            </table>
            <div class="h-[360px] flex items-center justify-center" v-else>
                <div class="text-center text-gray-400">暂无一天内会刷新的项目</div>
            </div>
        </div>
        <div v-if="activeKey === 'All'">
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
    <div class="text-center text-amber-300 mt-4 text-sm">
        刷新周期为收集各网站的信息获得，可能有偏差，而且周期较长难以验证，仅供参考
    </div>
    <div class="md:hidden flex justify-center mt-4 gap-4" v-if="onClose">
        <NButton size="small" type="warning" @click="onClose">关闭</NButton>
    </div>
    <NModal v-model:show="isShowItem">
        <div class="max-w-[90%] mx-auto huiji-css-hook bg-transparent!">
            <DropRecorderItem :item="showItem" v-model:dropRecords="dropRecords" :onClose="closeItem" />
        </div>
    </NModal>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import DropRecorderItem from './DropRecorderItem.vue';

import { useLocalStorage } from '@vueuse/core';
import { NModal } from 'naive-ui';
import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue';
import { IS_DEV } from '../../util';
import { DropConfig } from './DropConfig';
import { IDropCategory, IDropConfigFile, IDropRecord } from './type';
import { formatTimeFromMilliseconds } from './util';

defineProps<{
    onClose?: () => void;
}>();

const dropConfigs = ref<DropConfig[]>([]);
const dropCategorys = ref<IDropCategory[]>([]);

const dropRecords = useLocalStorage<IDropRecord[]>('drop-records', []);

const nearDropConfigs = computed(() => {
    const nearConfigs = dropRecords.value
        .filter((record) => {
            const dropConfig = dropConfigs.value.find((config) => config.data.id === record.id);
            if (dropConfig) {
                return dropConfig.isNear(record.timestamp, currentTime.value);
            }
            return false;
        })
        .map((record) => {
            const dropConfig = dropConfigs.value.find((config) => config.data.id === record.id);
            if (dropConfig) {
                return dropConfig;
            }
            return null;
        })
        .filter((item) => item !== null) as DropConfig[];

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
const showItem = ref<DropConfig | null>(null);
const clickItem = (item: DropConfig) => {
    isShowItem.value = true;
    showItem.value = item;
};
const closeItem = () => {
    isShowItem.value = false;
};

const isNear = (item: DropConfig) => {
    if (dropRecords.value) {
        const itemRecord = dropRecords.value.find((record) => record.id === item.data.id);
        if (itemRecord) {
            return item.isNear(itemRecord.timestamp, currentTime.value);
        }
    }
    return false;
};

const getRemainTimeText = (item: DropConfig) => {
    if (dropRecords.value) {
        const itemRecord = dropRecords.value.find((record) => record.id === item.data.id);
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
</script>
