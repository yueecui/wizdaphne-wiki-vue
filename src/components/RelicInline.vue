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
    relicName?: string;
    /** 遗物 ID（即遗物道具 id）：有就优先按它定位 */
    relicId?: string;
}>();

const link = useInlineLink();
const relic = computed(() => link.findRelicLink({ id: props.relicId, name: props.relicName }));

const label = computed(() => relic.value?.name || props.relicName || (props.relicId ? `#${props.relicId}` : '遗物'));

// 遗物在 V2 是道具的一种（`Item::Relic`），打开的是物品 modal
const handleClick = () => void link.openLink('relic', { id: props.relicId, name: props.relicName });
</script>
