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
    mapName?: string;
    /** 页面上原本的显示文本（可选，优先显示） */
    showName?: string;
    /** 地图层 ID：有就优先按它定位 */
    mapId?: string;
}>();

const link = useInlineLink();

const label = computed(
    () => props.showName || props.mapName || (props.mapId ? `#${props.mapId}` : '地图'),
);

// V2 没有地图级 modal，按名字 / ID 对到对应的一层（`MapFloorModal`）
const handleClick = () => void link.openLink('map', { id: props.mapId, name: props.mapName });
</script>
