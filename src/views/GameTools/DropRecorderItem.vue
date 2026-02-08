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
                                <th class="w-[6em]">刷新时间</th>
                                <td class="w-[10em]">
                                    <div class="flex gap-2 justify-between items-center">
                                        <div>
                                            {{ item.getRefreshTimeText() }}
                                        </div>
                                        <div v-if="item.hasHistory">
                                            <NButton size="tiny" @click="checkHistory">历史</NButton>
                                            <NModal v-model:show="isShowHistory">
                                                <div
                                                    class="p-4 bg-card! border! border-cardborder! rounded flex flex-col gap-4 min-w-[360px]"
                                                >
                                                    <table class="wiztable">
                                                        <thead>
                                                            <tr>
                                                                <th>#</th>
                                                                <th>时间</th>
                                                                <th>间隔</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            <tr
                                                                v-for="(record, index) in recordHistory"
                                                                :key="index"
                                                                class="hover:bg-trhoverbg!"
                                                            >
                                                                <td
                                                                    class="cursor-pointer hover:text-red-400 hover:line-through text-center"
                                                                    @click="() => removeRecord(record)"
                                                                >
                                                                    {{ index + 1 }}
                                                                </td>
                                                                <td>{{ record.timetext }}</td>
                                                                <td>{{ record.intervaltext }}</td>
                                                            </tr>
                                                        </tbody>
                                                    </table>
                                                    <div>
                                                        <NButton size="tiny" @click="clearRecord" type="error">
                                                            清除所有记录
                                                        </NButton>
                                                    </div>
                                                    <div class="text-xs text-gray-500">
                                                        最多存储100条记录，点击序号可以删除
                                                    </div>
                                                </div>
                                            </NModal>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th>最新记录</th>
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
                                                        <NButton size="small" type="primary" @click="updateRecord">
                                                            修改
                                                        </NButton>
                                                    </div>

                                                    <div class="flex justify-end">
                                                        <NButton size="small" type="primary" @click="saveNewRecord">
                                                            以当前时间记录
                                                        </NButton>
                                                    </div>
                                                </div>
                                            </NModal>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr>
                                <th>计时</th>
                                <td>
                                    <div class="flex gap-2 justify-between items-center">
                                        <div>
                                            {{ item.getRemainTimeText() }}
                                        </div>
                                        <div v-if="item.hasHidden">
                                            <NTooltip placement="bottom">
                                                <template #trigger>
                                                    <NButton size="tiny" @click="toggleHidden">
                                                        {{ item.isHidden ? '显示' : '隐藏' }}
                                                    </NButton>
                                                </template>
                                                隐藏的项目将不在「待办项目」中显示
                                            </NTooltip>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                            <tr v-if="item.canCheck">
                                <th>最后检查于</th>
                                <td>
                                    <div class="flex gap-2 justify-between items-center">
                                        <div>
                                            {{ item.getLastCheckText() }}
                                        </div>
                                        <div v-if="item.getLastRecord()">
                                            <NButton size="tiny" @click="updateLastCheck">更新</NButton>
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
                                        <template v-if="item instanceof FixedRefreshConfig && item.data.links">
                                            <div v-for="(link, index) in item.data.links" :key="index">
                                                <a :href="link.url" target="_blank">
                                                    {{ link.text }}
                                                </a>
                                            </div>
                                        </template>
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
import { NButton, NDatePicker, NModal, NTooltip } from 'naive-ui';
import WikiNImage from '../../components/huiji/WikiNImage.vue';

import { computed, ref, toRefs } from 'vue';
import { convertDescription } from '../DataSearcher/utils/convertDescription';
import { DropConfig } from './classes/DropConfig';
import { FixedRefreshConfig } from './classes/FixedRefreshConfig';
import { AbstractRecordConfig } from './type';
import { formatTimeFromMilliseconds } from './util';

const props = defineProps<{
    item: AbstractRecordConfig | null;
    onClose?: () => void;
}>();

const { item } = toRefs(props);

const recordText = computed(() => {
    if (item.value?.getLastRecord()) {
        return new Date(item.value?.getLastRecord()).toLocaleString();
    }
    return '';
});

const timestamp = ref(0);
const isShowRecord = ref(false);
const showRecord = () => {
    if (item.value?.getLastRecord()) {
        timestamp.value = item.value.getLastRecord();
    } else {
        timestamp.value = Date.now();
    }
    isShowRecord.value = true;
};
const updateRecord = () => {
    item.value?.updateLastRecordTime(timestamp.value);
    isShowRecord.value = false;
};
const saveNewRecord = () => {
    item.value?.addNewRecordTime();
    isShowRecord.value = false;
};

const updateLastCheck = () => {
    item.value?.updateLastCheckTime();
};

const clearRecord = () => {
    window.wiz.$dialog.error({
        title: '清除记录',
        content: '确定要清除所有记录吗？',
        positiveText: '清除',
        negativeText: '取消',
        style: 'width: 400px;',
        onPositiveClick: () => {
            item.value?.clearRecord();
            isShowRecord.value = false;
        },
    });
};

const isShowHistory = ref(false);
const checkHistory = () => {
    isShowHistory.value = true;
};
interface RecordHistory {
    index: number;
    timetext: string;
    intervaltext: string;
}
const recordHistory = computed(() => {
    const history = item.value?.getRecordHistory() ?? [];
    const result: RecordHistory[] = [];
    // 最新的在最前面展示
    for (let i = history.length - 1; i >= 0; i--) {
        const record = history[i];
        const interval = i === 0 ? 0 : record - history[i - 1];
        result.push({
            index: i,
            timetext: new Date(record).toLocaleString(),
            intervaltext: interval === 0 ? '-' : formatTimeFromMilliseconds(interval),
        });
    }
    return result;
});
const removeRecord = (record: RecordHistory) => {
    window.wiz.$dialog.error({
        title: '删除记录',
        content: `确定要删除 ${record.timetext} 的记录吗？`,
        positiveText: '删除',
        negativeText: '取消',
        style: 'width: 400px;',
        onPositiveClick: () => {
            item.value?.removeRecord(record.index);
            isShowHistory.value = false;
        },
    });
};

const toggleHidden = () => {
    item.value?.toggleHidden();
};
</script>
