<template>
    <div class="p-4 bg-card! border! border-cardborder! rounded">
        <div class="flex flex-col gap-4">
            <table class="wiztable text-center my-0! w-full" v-for="category in dropConfig.categorys" :key="category.i">
                <thead>
                    <tr>
                        <th colspan="3">{{ category.name }}</th>
                    </tr>
                    <tr>
                        <th>项目</th>
                        <th class="w-[6em]">周期</th>
                        <th class="w-[10em]">计时</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in getCategoryData(category.i)"
                        :key="item.id"
                        class="hover:bg-[#3b322c] cursor-pointer"
                        @click="() => clickItem(item)"
                    >
                        <td class="text-left">{{ item.title }}</td>
                        <td>{{ formatRefreshTime(item) }}</td>
                        <td>{{ getRemainTimeText(item) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="md:hidden flex justify-center mt-4 gap-4" v-if="onClose">
            <NButton size="small" type="warning" @click="onClose">关闭</NButton>
        </div>
        <NModal v-model:show="isShowItem">
            <div class="max-w-[90%] mx-auto huiji-css-hook bg-transparent!">
                <DropRecorderItem :item="showItem" v-model:dropRecords="dropRecords" :onClose="closeItem" />
            </div>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import DropRecorderItem from './DropRecorderItem.vue';

import { useLocalStorage } from '@vueuse/core';
import { NModal } from 'naive-ui';
import { onMounted, onUnmounted, ref } from 'vue';
import { IS_DEV } from '../../util';
import { IDropConfig, IDropConfigFile, IDropRecord } from './type';
import { formatRefreshTime, formatTimeFromMilliseconds } from './util';

const props = defineProps<{
    onClose?: () => void;
}>();

const dropConfig = ref<IDropConfigFile>({
    drops: [],
    categorys: [],
});

const dropRecords = useLocalStorage<IDropRecord[]>('drop-records', []);

const currentTime = ref(Date.now());
let timer: NodeJS.Timeout | null = null;
onMounted(() => {
    timer = setInterval(() => {
        currentTime.value = Date.now();
    }, 1000);
    if (IS_DEV) {
        fetch('/dropconfig.json').then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    dropConfig.value = data;
                });
            } else {
                console.error('获取掉落记录配置失败');
            }
        });
    } else {
        fetch('/api.php?action=lua&module=Api/GetDropConfig&format=json&utf8=1').then((res) => {
            if (res.ok) {
                res.json().then((data) => {
                    dropConfig.value = data;
                });
            } else {
                console.error('获取掉落记录配置失败');
            }
        });

        // getPageRawByTitle<IDropConfigFile>(DROP_RECORDER_CONFIG_TITLE).then((res) => {
        //     if (res === null) {
        //         console.error('获取掉落记录配置失败');
        //         return;
        //     }
        //     dropConfig.value = res;
        // });
    }
});

onUnmounted(() => {
    if (timer) {
        clearTimeout(timer);
    }
});

const getCategoryData = (categoryIndex: number) => {
    return dropConfig.value.drops.filter((item) => item.category === categoryIndex);
};

const isShowItem = ref(false);
const showItem = ref<IDropConfig | null>(null);
const clickItem = (item: IDropConfig) => {
    isShowItem.value = true;
    showItem.value = item;
};
const closeItem = () => {
    isShowItem.value = false;
};

const getRemainTimeText = (item: IDropConfig) => {
    if (item && dropRecords.value) {
        const thisItemRecord = dropRecords.value.find((record) => record.id === item.id);
        if (!thisItemRecord) {
            return '-';
        }

        const hour = item.hours + item.days * 24;
        if (hour > 0) {
            const targetTime = thisItemRecord.timestamp + hour * 60 * 60 * 1000;
            const diff = targetTime - currentTime.value;
            if (diff < 0) {
                return '已刷新';
            }
            return formatTimeFromMilliseconds(diff);
        } else {
            const diff = currentTime.value - thisItemRecord.timestamp;
            return `已过 ${formatTimeFromMilliseconds(diff)}`;
        }
    }
    return '-';
};
</script>
