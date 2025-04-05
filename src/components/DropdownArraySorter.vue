<template>
    <NDropdown
        trigger="hover"
        :options="getProductListActions(index)"
        @select="(key) => handleProductAction(key, index)"
    >
        <slot></slot>
    </NDropdown>
</template>

<script setup lang="ts">
import { NDropdown, NInputNumber } from 'naive-ui';
import { DropdownMixedOption } from 'naive-ui/es/dropdown/src/interface';
import { h, ref } from 'vue';

const dialog = window.$dialog;

const props = defineProps<{
    listItems: any[];
    index: number;
}>();

const emit = defineEmits<{
    (e: 'update:listItems', listItems: any[]): void;
}>();

const updateListItems = (listItems: any[]) => {
    emit('update:listItems', listItems);
};

// 调整位置
const getProductListActions = (index: number): DropdownMixedOption[] => [
    {
        label: '上移',
        key: 'goUp',
        disabled: index === 0,
    },
    {
        label: '下移',
        key: 'goDown',
        disabled: index === props.listItems.length - 1,
    },
    {
        label: '置顶',
        key: 'goTop',
        disabled: index === 0,
    },
    {
        label: '置底',
        key: 'goBottom',
        disabled: index === props.listItems.length - 1,
    },
    {
        label: '移动',
        key: 'move',
        disabled: props.listItems.length <= 1,
    },
    {
        label: '交换',
        key: 'change',
        disabled: props.listItems.length <= 1,
    },
    {
        label: () => h('div', { class: 'text-red-400 hover:text-blue-400' }, '删除'),
        key: 'delete',
    },
];

const handleProductAction = (key: string, index: number) => {
    const newGalleryItems = [...props.listItems];
    switch (key) {
        case 'delete':
            newGalleryItems.splice(index, 1);
            updateListItems(newGalleryItems);
            break;
        case 'goUp':
            if (index > 0) {
                const temp = newGalleryItems[index];
                newGalleryItems[index] = newGalleryItems[index - 1];
                newGalleryItems[index - 1] = temp;
            }
            updateListItems(newGalleryItems);
            break;
        case 'goDown':
            if (index < newGalleryItems.length - 1) {
                const temp = newGalleryItems[index];
                newGalleryItems[index] = newGalleryItems[index + 1];
                newGalleryItems[index + 1] = temp;
            }
            updateListItems(newGalleryItems);
            break;
        case 'goTop':
            if (index > 0) {
                const temp = newGalleryItems[index];
                newGalleryItems.splice(index, 1);
                newGalleryItems.unshift(temp);
            }
            updateListItems(newGalleryItems);
            break;
        case 'goBottom':
            if (index < newGalleryItems.length - 1) {
                const temp = newGalleryItems[index];
                newGalleryItems.splice(index, 1);
                newGalleryItems.push(temp);
            }
            updateListItems(newGalleryItems);
            break;
        case 'move':
            {
                const newIndex = ref(index + 1);
                const d = dialog.info({
                    title: '输入目标位置',
                    content: () => {
                        return h(
                            'div',
                            {
                                class: 'flex flex-col gap-2',
                            },
                            [
                                h('div', '当前项目会挪到指定位置，其他项目顺延位置'),
                                h(NInputNumber, {
                                    value: newIndex.value,
                                    onUpdateValue: (v) => {
                                        newIndex.value = v ?? 0;
                                    },
                                    min: 1,
                                    max: newGalleryItems.length,
                                }),
                            ],
                        );
                    },
                    positiveText: '移动',
                    onPositiveClick: () => {
                        newIndex.value -= 1;
                        if (index !== newIndex.value && newIndex.value < newGalleryItems.length) {
                            const temp = newGalleryItems[index];
                            newGalleryItems.splice(index, 1);
                            newGalleryItems.splice(newIndex.value, 0, temp);
                            updateListItems(newGalleryItems);
                        }
                        d.destroy();
                    },
                    negativeText: '取消',
                });
            }
            break;
        case 'change':
            {
                const newIndex = ref(index + 1);
                const d = dialog.info({
                    title: '输入目标位置',
                    content: () => {
                        return h(
                            'div',
                            {
                                class: 'flex flex-col gap-2',
                            },
                            [
                                h('div', '当前项目会与目标位置的项目交换位置，其他项目位置不变'),
                                h(NInputNumber, {
                                    value: newIndex.value,
                                    onUpdateValue(v) {
                                        newIndex.value = v ?? 0;
                                    },
                                    min: 1,
                                    max: newGalleryItems.length,
                                }),
                            ],
                        );
                    },
                    positiveText: '交换',
                    onPositiveClick: () => {
                        newIndex.value -= 1;
                        if (index !== newIndex.value && newIndex.value < newGalleryItems.length) {
                            const temp = newGalleryItems[index];
                            newGalleryItems[index] = newGalleryItems[newIndex.value];
                            newGalleryItems[newIndex.value] = temp;
                            updateListItems(newGalleryItems);
                        }
                        d.destroy();
                    },
                    negativeText: '取消',
                });
            }
            break;
    }
};
</script>
