<template>
    <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">
        {{ equipment?.data?.n || equipmentName }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useEquipmentModalStore } from '../stores/equipmentModalStore';
import { useEquipmentStore } from '../views/DataSearcher/Equipment/equipmentStore';

const props = defineProps<{
    equipmentName: string;
}>();

const equipmentStore = useEquipmentStore();
const equipmentModalStore = useEquipmentModalStore();

const equipment = computed(() => {
    return equipmentStore.getEquipmentByName(props.equipmentName);
});

const handleClick = () => {
    if (equipment.value) {
        equipmentModalStore.openModal(equipment.value);
    } else if (!equipmentStore.isInit) {
        window.wiz.$message.info('装备数据正在加载，请稍后再试');
    } else {
        window.wiz.$message.error('装备不存在');
    }
};
</script>
