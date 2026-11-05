<template>
    <InlineLinkBase
        :name="props.itemName"
        :resolved-name="item?.name"
        :id="props.itemId"
        :custom-class="props.customClass"
        fallback="物品"
        @activate="handleClick"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import InlineLinkBase from './InlineLinkBase.vue';
import { useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    itemName?: string;
    /** 物品 ID：有就优先按它定位 */
    itemId?: string;
    /** 自定义样式类（模板里的 `data-class`）：有值时替换掉默认的蓝色 */
    customClass?: string;
}>();

const link = useInlineLink();
const item = computed(() => link.findItemLink({ id: props.itemId, name: props.itemName }));

const handleClick = () => void link.openLink('item', { id: props.itemId, name: props.itemName });
</script>
