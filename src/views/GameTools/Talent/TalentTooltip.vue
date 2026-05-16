<template>
    <Teleport to="body">
        <div
            class="fixed bg-[#25201d] border-2! border-[#37322a]! rounded-lg w-40 text-[#dfdfdf] z-10000"
            :style="{ left: info.x + 14 + 'px', top: info.y - 10 + 'px' }"
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
import type { TooltipInfo } from './types';

defineProps<{ info: TooltipInfo }>();
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
