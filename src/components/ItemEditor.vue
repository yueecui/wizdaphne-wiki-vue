<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
        <div v-if="item">
            <div class="text-lg text-light font-bold mb-4">编辑物品备注</div>
            <div class="mb-4">
                <NInput
                    v-model:value="comment"
                    type="textarea"
                    placeholder="输入备注"
                    :autosize="{ minRows: 10, maxRows: 10 }"
                />
            </div>
            <div class="flex justify-end gap-2 mt-4">
                <NButton size="small" type="default" @click="handleCancel">取消</NButton>
                <NButton size="small" type="primary" @click="handleSave" :loading="isSubmitting">保存</NButton>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { NButton, NInput } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { edit } from '../api/editPage';
import { getPageRawByTitle } from '../api/getPageRaw';
import { IS_DEV } from '../util/index';
import { getFieldIndex, type TabxSchema } from '../util/tabxUtils';
import type { Item } from '../views/DataSearcher/Item/Item';
import { useItemStore } from '../views/DataSearcher/Item/itemStore';

const emit = defineEmits<{
    cancel: [];
    submit: [];
}>();

const props = defineProps<{
    itemId: string;
}>();

const itemStore = useItemStore();
const item = ref<Item | undefined>();
const comment = ref('');
const isSubmitting = ref(false);

const loadItemData = () => {
    item.value = itemStore.itemItems.find((i) => i.id.toString() === props.itemId);
    if (item.value) {
        comment.value = item.value.comment || '';
    }
};

const fetchWikiData = async () => {
    try {
        if (IS_DEV) {
            const response = await fetch('/items.json');
            return await response.json();
        } else {
            const data = await getPageRawByTitle<TabxSchema>('Data:Item.tabx', true);
            return data;
        }
    } catch (error) {
        console.error('获取wiki数据失败:', error);
        window.wiz.$message.error('获取wiki数据失败');
        return null;
    }
};

const mergeData = (wikiData: TabxSchema, itemId: string, newComment: string) => {
    if (!wikiData || !Array.isArray(wikiData.data)) {
        return wikiData;
    }

    // 动态获取字段索引
    const commentIndex = getFieldIndex(wikiData, 'comment');

    const mergedData = [...wikiData.data];
    const index = mergedData.findIndex((record: any[]) => record[1].toString() === itemId);

    if (index !== -1) {
        // 更新备注
        if (commentIndex !== -1) {
            mergedData[index][commentIndex] = newComment || null;
        }
    }

    return {
        ...wikiData,
        data: mergedData,
    };
};

const handleSave = async () => {
    if (!item.value) return;

    isSubmitting.value = true;
    try {
        const wikiData = await fetchWikiData();
        if (!wikiData) {
            return;
        }

        const mergedData = mergeData(wikiData, props.itemId, comment.value);

        if (IS_DEV) {
            console.log('提交的数据:', mergedData);
        } else {
            const jsonText = JSON.stringify(mergedData, null, 2);
            const response = await edit({
                title: 'Data:Item.tabx',
                text: jsonText,
                summary: `更新物品「${item.value.name}」的备注`,
                minor: false,
            });

            if ('error' in response) {
                console.error('提交失败:', response.error);
                window.wiz.$message.error(`提交失败: ${response.error.info}`);
                return;
            }
        }

        item.value.comment = comment.value;
        window.wiz.$message.success('数据提交成功');
        emit('submit');
    } catch (error) {
        console.error('提交失败:', error);
        window.wiz.$message.error('提交失败');
    } finally {
        isSubmitting.value = false;
    }
};

const handleCancel = () => {
    emit('cancel');
};

onMounted(() => {
    loadItemData();
});
</script>
