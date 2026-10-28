<template>
    <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">
        {{ label }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    equipmentName?: string;
    /** 装备 ID：有就优先按它定位 */
    equipmentId?: string;
}>();

const link = useInlineLink();
const equipment = computed(() => link.findEquipmentLink({ id: props.equipmentId, name: props.equipmentName }));

const label = computed(
    () =>
        equipment.value?.name ||
        props.equipmentName ||
        (props.equipmentId ? `#${props.equipmentId}` : '装备'),
);

const handleClick = () =>
    void link.openLink('equipment', { id: props.equipmentId, name: props.equipmentName });
</script>
