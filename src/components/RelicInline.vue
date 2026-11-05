<template>
    <InlineLinkBase
        :name="props.relicName"
        :resolved-name="relic?.name"
        :id="props.relicId"
        :custom-class="props.customClass"
        fallback="遗物"
        @activate="handleClick"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import InlineLinkBase from './InlineLinkBase.vue';
import { useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    relicName?: string;
    /** 遗物 ID（即遗物道具 id）：有就优先按它定位 */
    relicId?: string;
    /** 自定义样式类（模板里的 `data-class`）：有值时替换掉默认的蓝色 */
    customClass?: string;
}>();

const link = useInlineLink();
const relic = computed(() => link.findRelicLink({ id: props.relicId, name: props.relicName }));

// 遗物在 V2 是道具的一种（`Item::Relic`），打开的是物品 modal
const handleClick = () => void link.openLink('relic', { id: props.relicId, name: props.relicName });
</script>
