<template>
    <ThemeConfigProvider>
        <div class="relative" ref="containerRef">
            <div class="canvas-container" :class="{ fullscreen: talent.isFullscreen }">
                <TalentTree />
                <TalentStats />
                <TalentTooltip v-if="tooltip" :info="tooltip" />
            </div>
            <!-- 管理面板使用绝对定位在右侧外侧 -->
            <div v-if="canEditTalent && !talent.isFullscreen" class="admin-panel">
                <AdminContainer />
            </div>
        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted, onUnmounted } from 'vue';
import { MwConfig } from '../../../huiji/MwConfig';
import ThemeConfigProvider from '../../../layout/ThemeConfigProvider.vue';
import AdminContainer from './admin/AdminContainer.vue';
import TalentStats from './TalentStats.vue';
import { useTalentStore } from './talentStore';
import TalentTooltip from './TalentTooltip.vue';
import TalentTree from './TalentTree.vue';

const talent = useTalentStore();
const { tooltip } = storeToRefs(talent);
const canEditTalent = MwConfig.getInstance().canEditTalent;

function handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape' && talent.isFullscreen) {
        talent.toggleFullscreen();
    }
}

onMounted(() => {
    window.addEventListener('keydown', handleKeydown);
});

onUnmounted(() => {
    window.removeEventListener('keydown', handleKeydown);
});
</script>

<style scoped>
.canvas-container {
    position: relative;
    background: #020a1e;
    border: 2px solid #debe79;
    border-radius: 12px;
    overflow: hidden;
    height: 600px;
}

.canvas-container.fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    border: none;
    border-radius: 0;
    z-index: 9999;
}

.admin-panel {
    position: absolute;
    top: 0;
    left: calc(100% + 16px);
}
</style>

