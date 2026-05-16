<template>
    <Teleport to="body">
        <div
            ref="tooltipRef"
            class="fixed bg-[#25201d] border-2! border-[#37322a]! rounded-lg w-40 text-[#dfdfdf] z-10000"
            :style="tooltipStyle"
        >
            <div class="text-[#e3cc99] bg-black px-2 py-1 rounded-t-lg border-b-2! border-[#37322a]!">
                {{ info.node.label }}
            </div>
            <div class="p-2 text-sm flex flex-col gap-2">
                <div v-if="info.node.cost > 0">
                    <span class="text-[#e3cc99]">消耗点数：</span>
                    {{ info.node.cost }}
                </div>
                <div v-if="info.node.options && info.node.options.length > 0">
                    <div v-if="info.node.options.length > (info.node.number || 1)" class="text-[#e3cc99] mb-1">
                        可能出现的能力
                    </div>
                    <div v-for="(option, index) in info.node.options" :key="index" class="text-sm">
                        {{ option }}
                    </div>
                    <div v-if="info.node.options.length > (info.node.number || 1)" class="text-[#e3cc99] mt-1">
                        随机 {{ info.node.number }} 条
                    </div>
                </div>
            </div>
        </div>
    </Teleport>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { TooltipInfo } from './types';

const props = defineProps<{ info: TooltipInfo }>();

const tooltipRef = ref<HTMLDivElement | null>(null);
const tooltipHeight = ref(150); // 估计高度，实际会通过 DOM 获取

// 获取 tooltip 实际高度
watch(
    () => props.info,
    () => {
        if (tooltipRef.value) {
            tooltipHeight.value = tooltipRef.value.offsetHeight;
        }
    },
    { immediate: true },
);

const tooltipStyle = computed(() => {
    const padding = 16; // 边距
    const offsetX = 14;
    const offsetY = 10;

    let left = props.info.x + offsetX;
    let top = props.info.y - offsetY;

    // 检查右侧边界
    const maxLeft = window.innerWidth - 160 - padding; // 160 是 tooltip 宽度
    if (left > maxLeft) {
        left = props.info.x - 160 - offsetX;
    }

    // 检查底部边界，如果超出则向上显示
    const maxTop = window.innerHeight - tooltipHeight.value - padding;
    if (top > maxTop) {
        top = props.info.y - tooltipHeight.value - offsetY;
    }

    // 确保不超出顶部
    if (top < padding) {
        top = padding;
    }

    // 确保不超出左侧
    if (left < padding) {
        left = padding;
    }

    return {
        left: `${left}px`,
        top: `${top}px`,
    };
});
</script>

<style>
.state.active {
    color: #0f6e56;
}
.state.available {
    color: #185fa5;
}
.state.locked {
    color: #a32d2d;
}
</style>
