<template>
    <div class="p-4 bg-card! border! border-cardborder! rounded huiji-css-hook max-w-[640px]">
        <template v-if="item">
            <div class="flex flex-col md:flex-row gap-4">
                <div class="md:w-[24em]">
                    <table class="wiztable my-0! w-full">
                        <tbody>
                            <tr>
                                <th colspan="2">
                                    <div class="p-1">{{ item.title }}</div>
                                </th>
                            </tr>
                            <tr>
                                <th class="w-[6em]">更新周期</th>
                                <td class="w-[10em]">{{ item.getRefreshTimeText() }}</td>
                            </tr>
                            <tr>
                                <th>上次记录</th>
                                <td>
                                    <div class="flex gap-2 justify-between items-center">
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
                                                    <div class="flex gap-2 items-center">
                                                        <NDatePicker
                                                            type="datetime"
                                                            v-model:value="timestamp"
                                                        ></NDatePicker>
                                                        <NButton size="small" type="primary" @click="saveRecord">
                                                            更新
                                                        </NButton>
                                                    </div>

                                                    <div class="flex justify-between">
                                                        <NButton size="small" @click="clearRecord">清除记录</NButton>
                                                        <NButton
                                                            size="small"
                                                            type="primary"
                                                            @click="saveRecordUseCurrentTime"
                                                        >
                                                            以当前时间更新
                                                        </NButton>
                                                    </div>
                                                </div>
                                            </NModal>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th>刷新时间</th>
                                <td>{{ remainTimeText }}</td>
                            </tr>
                            <tr>
                                <th>最后检查于</th>
                                <td>
                                    <div class="flex gap-2 justify-between items-center">
                                        <div>
                                            {{ lastCheckText }}
                                        </div>
                                        <div v-if="itemRecord">
                                            <NButton size="tiny" @click="updateLastCheckTime">更新</NButton>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th colspan="2">
                                    <div class="p-1">说明</div>
                                </th>
                            </tr>
                            <tr>
                                <td colspan="2">
                                    <div class="p-2 flex flex-col gap-2">
                                        <div v-html="convertDescription(item.description ?? '')"></div>
                                        <div v-if="item instanceof FixedRefreshConfig && item.data.link">
                                            <a :href="item.data.link" target="_blank">
                                                {{ item.data.linkText ?? item.data.link }}
                                            </a>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
                <div class="flex-1" v-if="item instanceof DropConfig && item.data.image">
                    <table class="wiztable my-0! w-full">
                        <tbody>
                            <tr>
                                <th colspan="1">
                                    <div class="p-1">位置图</div>
                                </th>
                            </tr>
                            <tr>
                                <td rowspan="6" class="align-top">
                                    <div class="p-1 flex flex-col gap-2">
                                        <WikiNImage :imageName="item.data.image" class="w-full"></WikiNImage>
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
import { DropConfig } from './classes/DropConfig';
import { FixedRefreshConfig } from './classes/FixedRefreshConfig';
import { IDropRecord, RecordConfig } from './type';
import { formatTimeFromMilliseconds } from './util';

const props = defineProps<{
    item: RecordConfig | null;
    onClose?: () => void;
}>();

const dropRecords = defineModel<IDropRecord[]>('dropRecords', {
    required: true,
});

const itemRecord = computed(() => {
    if (props.item) {
        return dropRecords.value.find((record) => record.id === props.item?.id);
    }
    return undefined;
});
const recordText = computed(() => {
    if (itemRecord.value) {
        return new Date(itemRecord.value.timestamp).toLocaleString();
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

const remainTimeText = computed(() => {
    if (props.item && itemRecord.value) {
        const diff = props.item.getDifferenceTime(itemRecord.value.timestamp, currentTime.value);
        if (props.item.isCountdown) {
            if (diff <= 0) {
                return `已过 ${formatTimeFromMilliseconds(-diff)}`;
            }
            return formatTimeFromMilliseconds(diff);
        } else {
            // 等于0时不知道刷新时间，所以改为已经经过的时间
            return formatTimeFromMilliseconds(diff);
        }
    }
    return '-';
});

const lastCheckText = computed(() => {
    if (props.item && itemRecord.value && itemRecord.value.lt) {
        const diff = props.item.getDifferenceTime(itemRecord.value.timestamp, itemRecord.value.lt);
        if (props.item.isCountdown) {
            if (diff <= 0) {
                return `已过 ${formatTimeFromMilliseconds(-diff)}`;
            }
            return formatTimeFromMilliseconds(diff);
        } else {
            // 等于0时不知道刷新时间，所以改为已经经过的时间
            return formatTimeFromMilliseconds(diff);
        }
    }
    return '-';
});
const updateLastCheckTime = () => {
    if (props.item) {
        const record = dropRecords.value.find((record) => record.id === props.item?.id);
        if (record) {
            record.lt = currentTime.value;
        }
    }
};

const timestamp = ref(0);
const isShowRecord = ref(false);
const showRecord = () => {
    if (itemRecord.value) {
        timestamp.value = itemRecord.value.timestamp;
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
            record.lt = undefined;
        } else {
            dropRecords.value.push({
                id: props.item.id,
                timestamp: timestamp.value,
            });
        }
    }
    isShowRecord.value = false;
};
const saveRecordUseCurrentTime = () => {
    if (props.item) {
        const record = dropRecords.value.find((record) => record.id === props.item?.id);
        if (record) {
            record.timestamp = currentTime.value;
            record.lt = undefined;
        } else {
            dropRecords.value.push({
                id: props.item.id,
                timestamp: currentTime.value,
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
