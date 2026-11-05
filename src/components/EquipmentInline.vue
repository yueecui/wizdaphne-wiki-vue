<template>
    <InlineLinkBase
        :name="props.equipmentName"
        :resolved-name="equipment?.name"
        :id="props.equipmentId"
        :custom-class="props.customClass"
        fallback="装备"
        @activate="handleClick"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import InlineLinkBase from './InlineLinkBase.vue';
import { useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    equipmentName?: string;
    /** 装备 ID：有就优先按它定位 */
    equipmentId?: string;
    /** 自定义样式类（模板里的 `data-class`）：有值时替换掉默认的蓝色 */
    customClass?: string;
}>();

const link = useInlineLink();
const equipment = computed(() => link.findEquipmentLink({ id: props.equipmentId, name: props.equipmentName }));

const handleClick = () =>
    void link.openLink('equipment', { id: props.equipmentId, name: props.equipmentName });
</script>
