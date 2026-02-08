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
import { ICustomConfig, IDropRecord } from './type';

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
        const customConfigs = useLocalStorage<ICustomConfig[]>('drop-custom-configs', []);
        const exportData = {
            dropRecords: dropRecords.value,
            customConfigs: customConfigs.value,
        };
        text.value = JSON.stringify(exportData);
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
    const customConfigs = useLocalStorage<ICustomConfig[]>('drop-custom-configs', []);
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

    // 检查新格式：包含 dropRecords 和 customConfigs
    const hasNewFormat = comeData.dropRecords !== undefined && comeData.customConfigs !== undefined;
    // 检查旧格式：直接是数组
    const hasOldFormat = Array.isArray(comeData);

    if (!hasNewFormat && !hasOldFormat) {
        showErrorMsg();
        return;
    }

    // 处理 dropRecords
    const comeRecords: IDropRecord[] = hasNewFormat ? comeData.dropRecords : comeData;
    const newRecords: IDropRecord[] = [];

    for (const record of comeRecords) {
        if (record.id && Array.isArray(record.r)) {
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
                h: record.h,
                lt: record.lt,
                c: record.c,
            });
        }
    }

    // 处理 customConfigs（仅新格式有）
    const comeCustomConfigs: ICustomConfig[] = hasNewFormat ? comeData.customConfigs : [];
    const newCustomConfigs: ICustomConfig[] = [];

    for (const config of comeCustomConfigs) {
        if (config.id && config.title && config.refreshType) {
            if (typeof config.id !== 'string' || typeof config.title !== 'string') {
                showErrorMsg();
                return;
            }
            newCustomConfigs.push({
                id: config.id,
                title: config.title,
                description: config.description || '',
                refreshType: config.refreshType,
                refreshHours: config.refreshHours || 0,
                isJunk: config.isJunk || false,
            });
        }
    }

    if (newRecords.length === 0 && newCustomConfigs.length === 0) {
        window.wiz.$message.error('没有有效数据');
        return;
    }

    // 导入 dropRecords
    if (newRecords.length > 0) {
        if (mode == 'cover') {
            dropRecords.value = newRecords;
        } else {
            for (const record of newRecords) {
                const existingRecord = dropRecords.value.find((r) => r.id === record.id && r.c === record.c);
                if (mode === 'old') {
                    // 旧数据优先
                    if (!existingRecord) {
                        dropRecords.value.push(record);
                    }
                } else if (mode === 'new') {
                    // 新数据优先
                    if (existingRecord) {
                        existingRecord.r = record.r;
                        existingRecord.h = record.h;
                        existingRecord.lt = record.lt;
                    } else {
                        dropRecords.value.push(record);
                    }
                }
            }
        }
    }

    // 导入 customConfigs（仅新格式有，且只有覆盖模式）
    if (newCustomConfigs.length > 0) {
        if (mode === 'cover') {
            customConfigs.value = newCustomConfigs;
        } else {
            // 合并模式：旧数据优先或新数据优先
            for (const config of newCustomConfigs) {
                const existingIndex = customConfigs.value.findIndex((c) => c.id === config.id);
                if (mode === 'old') {
                    // 旧数据优先：已存在的跳过
                    if (existingIndex === -1) {
                        customConfigs.value.push(config);
                    }
                } else if (mode === 'new') {
                    // 新数据优先：覆盖已存在的
                    if (existingIndex !== -1) {
                        customConfigs.value[existingIndex] = config;
                    } else {
                        customConfigs.value.push(config);
                    }
                }
            }
        }
    }

    window.wiz.$message.success('导入成功');
    isShowImporter.value = false;
};
</script>
