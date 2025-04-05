<template>
    <div class="p-4 bg-card! border! border-cardborder! rounded huiji-css-hook max-w-[640px]">
        <template v-if="item">
            <div class="flex flex-col md:flex-row gap-4">
                <div class="md:w-[20em]">
                    <table class="wiztable my-0! w-full">
                        <tbody>
                            <tr>
                                <th colspan="2">
                                    <div class="p-1">{{ item.title }}</div>
                                </th>
                            </tr>
                            <tr>
                                <th class="w-[6em]">更新周期</th>
                                <td class="w-[10em]">{{ formatRefreshTime(item) }}</td>
                            </tr>
                            <tr>
                                <th>上次记录</th>
                                <td>
                                    <div class="flex justify-between items-center">
                                        <div v-if="recordText">
                                            {{ recordText }}
                                        </div>
                                        <div v-else>-</div>
                                        <div>
                                            <NButton size="tiny" @click="showRecord">记录</NButton>
                                            <NModal v-model:show="isShowRecord">
                                                <div
                                                    class="p-4 bg-card! border! border-cardborder! rounded huiji-css-hook flex flex-col gap-4"
                                                >
                                                    <NDatePicker
                                                        type="datetime"
                                                        v-model:value="timestamp"
                                                    ></NDatePicker>
                                                    <div class="flex justify-between">
                                                        <NButton size="small" @click="clearRecord">清除记录</NButton>
                                                        <NButton size="small" type="primary" @click="saveRecord">
                                                            确定
                                                        </NButton>
                                                    </div>
                                                </div>
                                            </NModal>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th>{{ refreshHour > 0 ? '距离刷新' : '已过去' }}</th>
                                <td>{{ remainTimeText }}</td>
                            </tr>
                            <tr>
                                <th colspan="2">
                                    <div class="p-1">说明</div>
                                </th>
                            </tr>
                            <tr>
                                <td colspan="2">
                                    <div class="p-2 flex flex-col gap-2">
                                        <div>{{ convertDescription(item.description ?? '') }}</div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="flex-1" v-if="item.image">
                    <table class="wiztable my-0! w-full">
                        <tbody>
                            <tr>
                                <th colspan="1">
                                    <div class="p-2">位置图</div>
                                </th>
                            </tr>
                            <tr>
                                <td rowspan="6" class="align-top">
                                    <div class="p-2 flex flex-col gap-2">
                                        <WikiNImage :imageName="item.image" class="w-full"></WikiNImage>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="md:hidden flex justify-center mt-4 gap-4" v-if="onClose">
                    <NButton size="small" type="warning" @click="onClose">关闭</NButton>
                </div>
            </div>
        </template>
    </div>
</template>

<script lang="ts" setup>
import { NButton, NDatePicker, NModal } from 'naive-ui';
import WikiNImage from '../../components/huiji/WikiNImage.vue';

import { computed, onMounted, onUnmounted, ref } from 'vue';
import { convertDescription } from '../DataSearcher/util/convertDescription';
import { IDropConfig, IDropRecord } from './type';
import { formatRefreshTime, formatTimeFromMilliseconds } from './util';

const props = defineProps<{
    item: IDropConfig | null;
    onClose?: () => void;
}>();

const dropRecords = defineModel<IDropRecord[]>('dropRecords', {
    required: true,
});

const thisItemRecord = computed(() => {
    if (props.item) {
        return dropRecords.value.find((record) => record.id === props.item?.id);
    }
    return undefined;
});
const recordText = computed(() => {
    if (thisItemRecord.value) {
        return new Date(thisItemRecord.value.timestamp).toLocaleString();
    }
    return '';
});

const currentTime = ref(Date.now());
let timer: NodeJS.Timeout | null = null;
onMounted(() => {
    timer = setInterval(() => {
        currentTime.value = Date.now();
    }, 1000);
});

onUnmounted(() => {
    if (timer) {
        clearTimeout(timer);
    }
});

const refreshHour = computed(() => {
    if (props.item) {
        return props.item.hours + props.item.days * 24;
    }
    return 0;
});
const remainTimeText = computed(() => {
    if (props.item && thisItemRecord.value) {
        if (refreshHour.value > 0) {
            const targetTime = thisItemRecord.value.timestamp + refreshHour.value * 60 * 60 * 1000;
            const diff = targetTime - currentTime.value;
            if (diff < 0) {
                return '已刷新';
            }
            return formatTimeFromMilliseconds(diff);
        } else {
            // 等于0时不知道刷新时间，所以改为已经经过的时间
            const diff = currentTime.value - thisItemRecord.value.timestamp;
            return formatTimeFromMilliseconds(diff);
        }
    }
    return '-';
});

const timestamp = ref(0);
const isShowRecord = ref(false);
const showRecord = () => {
    if (thisItemRecord.value) {
        timestamp.value = thisItemRecord.value.timestamp;
    } else {
        timestamp.value = Date.now();
    }
    isShowRecord.value = true;
};
const saveRecord = () => {
    if (props.item) {
        const record = dropRecords.value.find((record) => record.id === props.item?.id);
        if (record) {
            record.timestamp = timestamp.value;
        } else {
            dropRecords.value.push({
                id: props.item.id,
                timestamp: timestamp.value,
            });
        }
    }
    isShowRecord.value = false;
};
const clearRecord = () => {
    if (props.item) {
        const record = dropRecords.value.find((record) => record.id === props.item?.id);
        if (record) {
            dropRecords.value.splice(dropRecords.value.indexOf(record), 1);
        }
    }
    isShowRecord.value = false;
};
</script>
