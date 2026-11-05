<template>
    <InlineLinkBase
        :show-name="props.showName"
        :name="props.mapName"
        :id="props.mapId"
        :custom-class="props.customClass"
        fallback="地图"
        @activate="handleClick"
    />
</template>

<script setup lang="ts">
import InlineLinkBase from './InlineLinkBase.vue';
import { useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    mapName?: string;
    /** 页面上原本的显示文本（可选，优先显示） */
    showName?: string;
    /** 地图层 ID：有就优先按它定位 */
    mapId?: string;
    /** 自定义样式类（模板里的 `data-class`）：有值时替换掉默认的蓝色 */
    customClass?: string;
}>();

const link = useInlineLink();

// V2 没有地图级 modal，按名字 / ID 对到对应的一层（`MapFloorModal`）
const handleClick = () => void link.openLink('map', { id: props.mapId, name: props.mapName });
</script>
