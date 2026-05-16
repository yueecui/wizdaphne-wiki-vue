<template>
    <div class="stats-container select-none">
        <div class="border-[#37322a]! border! rounded-lg bg-black/80 p-2 flex items-center gap-4">
            <template v-if="talent.isSimulateMode">
                <div class="flex flex-col gap-0.5 px-2">
                    <div class="text-[#e3cc99] text-xs">点数</div>
                    <div>{{ talent.remainingPoints }} / {{ talent.totalPoints }}</div>
                </div>
                <div class="flex items-center">
                    <NButton size="tiny" class="w-full" @click="talent.reset">重置</NButton>
                </div>
                <div class="w-px h-6 bg-[#37322a]" />
            </template>
            <div class="flex items-center">
                <NButton v-if="!talent.isSimulateMode" size="tiny" @click="talent.toggleSimulateMode">模拟模式</NButton>
                <NButton v-else size="tiny" @click="talent.toggleSimulateMode">浏览模式</NButton>
            </div>
            <div class="flex items-center">
                <NButton v-if="!talent.isFullscreen" size="tiny" @click="talent.toggleFullscreen">全屏</NButton>
                <NButton v-else size="tiny" @click="talent.toggleFullscreen">退出全屏</NButton>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import { useTalentStore } from './talentStore';

const talent = useTalentStore();
</script>

<style scoped>
.stats-container {
    position: absolute;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 10;
}
</style>
