<template>
    <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">
        {{ item?.name || itemName }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useItemModalStore } from '../stores/itemModalStore';
import { useItemStore } from '../views/DataSearcher/Item/itemStore';

const props = defineProps<{
    itemName: string;
}>();

const itemStore = useItemStore();
const itemModalStore = useItemModalStore();
const item = computed(() => {
    // 如果itemName是数字，则按id查询，否则按物品名查询
    if (/^\d+$/.test(props.itemName)) {
        const itemId = parseInt(props.itemName, 10);
        return itemStore.itemItems.find((i) => i.id === itemId);
    } else {
        return itemStore.itemItems.find((i) => i.name === props.itemName);
    }
});

const handleClick = () => {
    if (item.value) {
        itemModalStore.openModal(item.value);
    } else if (!itemStore.isInit) {
        window.wiz.$message.info('物品数据正在加载，请稍后再试');
    } else {
        window.wiz.$message.error('物品不存在');
    }
};
</script>
