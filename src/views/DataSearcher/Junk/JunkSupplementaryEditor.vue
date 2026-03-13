<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
        <!-- 标题部分 -->
        <div>
            <h2 class="text-xl text-light font-bold mb-4">杂物补充数据编辑器</h2>
        </div>

        <!-- 如果没有传入junkItem，显示提示 -->
        <div v-if="!junkItem" class="bg-yellow-800/30 border border-yellow-600 text-yellow-200 p-4 rounded">
            未指定要编辑的杂物项
        </div>

        <!-- 编辑表单 -->
        <div v-if="junkItem" class="bg-[#2a231e]! p-4 rounded">
            <div class="mb-4">
                <div class="flex items-center gap-2 mb-2">
                    <NCheckbox v-model:checked="editedData.not_obt" @update:checked="onNotObtChange" />
                    <label>无法获取</label>
                </div>
            </div>

            <div>
                <label class="block text-sm mb-2">描述</label>
                <NInput
                    v-model:value="editedData.desc"
                    type="textarea"
                    :rows="5"
                    placeholder="请输入杂物的额外描述"
                    style="width: 100%"
                />
            </div>
        </div>

        <!-- 操作按钮 -->
        <div class="flex justify-end gap-2 mt-4">
            <NButton type="default" @click="onCancel">取消</NButton>
            <NButton type="primary" @click="onSubmit" :disabled="isSubmitting || !junkItem">
                {{ isSubmitting ? '提交中...' : '提交' }}
            </NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NInput } from 'naive-ui';
import { onMounted, reactive, ref } from 'vue';
import { edit } from '../../../api/editPage';
import { getPageRawByTitle } from '../../../api/getPageRaw';
import { IS_DEV } from '../../../util/index';
import { JunkItem } from './JunkItem';
import { useJunkStore } from './junkStore';
import type { IJunkSupplementary } from './types';

// 定义组件属性
const props = defineProps<{
    junkItem: JunkItem;
}>();

const emit = defineEmits<{
    cancel: [];
    submit: [];
}>();

// 获取杂物store
const junkStore = useJunkStore();

// 编辑的数据
const editedData = reactive<{
    not_obt: boolean;
    desc: string;
}>({
    not_obt: false,
    desc: '',
});

// 提交状态
const isSubmitting = ref(false);

// 从wiki拉取数据
const fetchWikiData = async () => {
    try {
        if (IS_DEV) {
            // 开发环境：使用本地JSON文件
            const response = await fetch('/junk_supplementary.json');
            return await response.json();
        } else {
            // 生产环境：使用getPageRawByTitle获取Data:JunkSupplementary.tabx的数据
            const data = await getPageRawByTitle<any>('Data:JunkSupplementary.tabx');
            return data;
        }
    } catch (error) {
        console.error('获取wiki数据失败:', error);
        window.wiz.$message.error('获取wiki数据失败');
        return null;
    }
};

// 加载当前杂物项的补充数据
const loadCurrentJunkData = async () => {
    if (!props.junkItem) return;

    // 重置编辑数据
    editedData.not_obt = false;
    editedData.desc = '';

    // 从wiki拉取数据
    const wikiData = await fetchWikiData();
    if (!wikiData || !Array.isArray(wikiData.data)) return;

    // 查找当前杂物项的补充数据
    const supplementaryData = wikiData.data.find((item: any[]) => item[0] === props.junkItem.uniqueCode);
    if (supplementaryData) {
        editedData.not_obt = supplementaryData[1] === 1;
        editedData.desc = supplementaryData[2] || '';
    }
};

// 当not_obt值改变时
const onNotObtChange = () => {
    // 确保not_obt是布尔值
    editedData.not_obt = Boolean(editedData.not_obt);
};

// 合并数据到wiki数据
const mergeData = (wikiData: any, newItem: IJunkSupplementary) => {
    if (!wikiData || !Array.isArray(wikiData.data)) {
        // 如果wiki数据无效，直接返回包含新数据的结构
        return {
            ...wikiData,
            data: [[newItem.id, newItem.not_obt, newItem.desc, newItem.name]],
        };
    }

    // 创建一个映射表，用于快速查找现有记录
    const existingRecords = new Map<string, number>();
    wikiData.data.forEach((record: any[], index: number) => {
        const key = record[0]; // 使用id作为唯一键
        existingRecords.set(key, index);
    });

    // 合并新数据
    const mergedData = [...wikiData.data];
    const newRecord = [newItem.id, newItem.not_obt, newItem.desc, newItem.name];

    if (existingRecords.has(newItem.id)) {
        // 如果记录已存在，更新它
        const index = existingRecords.get(newItem.id)!;
        mergedData[index] = newRecord;
    } else {
        // 如果记录不存在，添加新记录
        mergedData.push(newRecord);
    }

    // 返回合并后的完整数据
    return {
        ...wikiData,
        data: mergedData,
    };
};

// 提交编辑
const onSubmit = async () => {
    if (!props.junkItem) return;

    // 设置提交状态为true
    isSubmitting.value = true;

    try {
        // 从wiki拉取数据
        const wikiData = await fetchWikiData();
        if (!wikiData) {
            return;
        }

        // 准备新数据
        const newData: IJunkSupplementary = {
            id: props.junkItem.uniqueCode,
            not_obt: editedData.not_obt ? 1 : 0,
            desc: editedData.desc,
            name: props.junkItem.name,
        };

        // 合并数据
        const mergedData = mergeData(wikiData, newData);

        if (IS_DEV) {
            // 开发环境：仅打印日志
            console.log('提交的数据:', mergedData);
        } else {
            // 生产环境：使用edit函数提交到Data:JunkSupplementary.tabx页面
            const jsonText = JSON.stringify(mergedData, null, 2);
            const response = await edit({
                title: 'Data:JunkSupplementary.tabx',
                text: jsonText,
                summary: `更新${props.junkItem.name}的补充数据`,
                minor: false,
            });

            // 检查响应是否包含错误
            if ('error' in response) {
                console.error('提交失败:', response.error);
                window.wiz.$message.error(`提交失败: ${response.error.info}`);
                return;
            }
        }

        // 更新junkStore中的数据
        junkStore.updateSupplementaryData(newData);

        // 显示成功消息
        window.wiz.$message.success('数据提交成功');

        // 通知父组件提交完成
        emit('submit');
    } catch (error) {
        console.error('提交失败:', error);
        window.wiz.$message.error('提交失败');
    } finally {
        // 无论成功失败，都设置提交状态为false
        isSubmitting.value = false;
    }
};

// 取消编辑
const onCancel = () => {
    emit('cancel');
};

// 组件挂载时加载数据
onMounted(async () => {
    // 确保杂物数据已加载
    if (!junkStore.isAllInit) {
        await junkStore.loadAndInitJunkData();
    }

    // 加载当前杂物项的补充数据
    await loadCurrentJunkData();
});
</script>
