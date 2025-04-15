<template>
    <NModal v-model:show="isShowImporter" :onAfterEnter="onAfterEnter" :onAfterLeave="onAfterLeave">
        <div class="w-[90%] md:h-auto md:max-w-[480px] m-auto huiji-css-hook bg-transparent!">
            <div class="p-4 my-4 bg-card! border! border-cardborder! rounded flex flex-col gap-2">
                <NInput
                    v-model:value="text"
                    type="textarea"
                    :rows="10"
                    :placeholder="mode === 'import' ? '请输入导入的文本' : ''"
                    :autosize="{ minRows: 10, maxRows: 10 }"
                />
                <div class="flex justify-center" v-if="mode == 'export'">
                    <NButton type="primary" @click="copyText">复制</NButton>
                </div>
                <div class="flex justify-between" v-else>
                    <div>
                        <NTooltip trigger="hover">
                            <template #trigger>
                                <NButton type="primary" @click="() => importData('cover')">覆盖</NButton>
                            </template>
                            使用新数据完全覆盖旧数据，会使旧数据丢失
                        </NTooltip>
                    </div>
                    <div class="flex gap-2">
                        <NTooltip trigger="hover">
                            <template #trigger>
                                <NButton type="primary" @click="() => importData('old')">旧数据优先</NButton>
                            </template>
                            合并新数据和旧数据，同时存在时间的数据，会保留旧数据
                        </NTooltip>
                        <NTooltip trigger="hover">
                            <template #trigger>
                                <NButton type="primary" @click="() => importData('new')">新数据优先</NButton>
                            </template>
                            合并新数据和旧数据，同时存在时间的数据，会保留新数据
                        </NTooltip>
                    </div>
                </div>
            </div>
        </div>
    </NModal>
</template>

<script setup lang="ts">
import { useLocalStorage } from '@vueuse/core';
import { NButton, NInput, NModal, NTooltip } from 'naive-ui';
import { ref } from 'vue';
import { IDropRecord } from './type';

const isShowImporter = defineModel('show', {
    type: Boolean,
    required: true,
});

const props = defineProps<{
    mode: 'import' | 'export';
}>();

const text = ref<string>('');

const onAfterEnter = () => {
    if (props.mode === 'export') {
        const dropRecords = useLocalStorage<IDropRecord[]>('drop-records', []);
        text.value = JSON.stringify(dropRecords.value);
    }
};
const onAfterLeave = () => {
    text.value = '';
};

const copyText = () => {
    navigator.clipboard.writeText(text.value).then(
        () => {
            window.wiz.$message.success('复制成功');
        },
        () => {
            window.wiz.$message.error('复制失败');
        },
    );
};

// 三种模式，覆盖、旧数据优先、新数据优先
const importData = (mode: 'cover' | 'old' | 'new') => {
    const showErrorMsg = () => {
        window.wiz.$message.error('导入数据格式错误');
    };
    const dropRecords = useLocalStorage<IDropRecord[]>('drop-records', []);
    const comeData = (() => {
        try {
            return JSON.parse(text.value);
        } catch (e) {
            showErrorMsg();
            return null;
        }
    })();
    if (!comeData) {
        return;
    }
    // 数据不一定是可用的，所以需要检查
    if (!Array.isArray(comeData)) {
        showErrorMsg();
        return;
    }
    const newRecords: IDropRecord[] = [];
    for (const record of comeData) {
        // 老数据兼容
        if (record.timestamp && !record.r) {
            record.r = [record.timestamp];
        }
        if (record.id && record.r) {
            if (typeof record.id !== 'string') {
                showErrorMsg();
                return;
            }
            for (const r of record.r) {
                if (typeof r !== 'number') {
                    showErrorMsg();
                    return;
                }
            }
            newRecords.push({
                id: record.id,
                r: record.r,
            });
        }
    }
    if (newRecords.length === 0) {
        window.wiz.$message.error('没有有效数据');
        return;
    }

    if (mode == 'cover') {
        dropRecords.value = newRecords;
    } else {
        for (const record of newRecords) {
            const existingRecord = dropRecords.value.find((r) => r.id === record.id);
            if (mode === 'old') {
                // 旧数据优先
                if (!existingRecord) {
                    dropRecords.value.push(record);
                }
            } else if (mode === 'new') {
                // 新数据优先
                if (existingRecord) {
                    existingRecord.timestamp = record.timestamp;
                } else {
                    dropRecords.value.push(record);
                }
            }
        }
    }
    window.wiz.$message.success('导入成功');
    isShowImporter.value = false;
};
</script>
