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
    itemName?: string;
    /** 物品 ID：有就优先按它定位 */
    itemId?: string;
}>();

const link = useInlineLink();
const item = computed(() => link.findItemLink({ id: props.itemId, name: props.itemName }));

const label = computed(() => item.value?.name || props.itemName || (props.itemId ? `#${props.itemId}` : '物品'));

const handleClick = () => void link.openLink('item', { id: props.itemId, name: props.itemName });
</script>
