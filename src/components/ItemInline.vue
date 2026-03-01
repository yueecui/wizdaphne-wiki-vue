<template>
    <div class="inline-item">
        <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">「{{ itemName }}」</span>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useItemModalStore } from '../stores/itemModalStore';
import { useItemStore } from '../views/DataSearcher/Item/itemStore';

const props = defineProps<{
    itemName: string;
}>();

const itemStore = useItemStore();
const itemModalStore = useItemModalStore();
const item = ref<any>(null);

const handleClick = () => {
    item.value = itemStore.itemItems.find((i) => i.name === props.itemName);
    if (item.value) {
        itemModalStore.openModal(item.value);
    } else {
        window.wiz.$message.error('物品不存在');
    }
};


</script>
