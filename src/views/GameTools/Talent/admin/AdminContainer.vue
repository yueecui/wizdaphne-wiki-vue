<template>
    <div class="flex flex-col gap-4 w-65">
        <!-- 提示信息 -->
        <div v-if="talent.lastMessage" class="border-[#37322a]! border! rounded-lg bg-black p-2">
            <div class="text-sm text-center text-green-400">{{ talent.lastMessage }}</div>
        </div>
        <!-- 节点编辑器 -->
        <div>
            <NodeEditor />
        </div>
        <!-- 管理功能 -->
        <div class="border-[#37322a]! border! rounded-lg bg-black p-2">
            <div class="flex flex-col gap-2 justify-center">
                <div class="text-sm text-center">管理功能</div>
                <div class="flex flex-col">
                    <div>
                        <label class="text-xs text-gray-400">总点数</label>
                        <NInputNumber
                            :value="talent.totalPoints"
                            @update:value="updateTotalPoints"
                            :min="0"
                            size="small"
                        />
                    </div>
                </div>
                <NButton size="tiny" @click="showColorEditor = true" :disabled="!hasColors">编辑颜色</NButton>
                <NButton size="tiny" @click="handleSave">保存</NButton>
            </div>
        </div>

        <!-- 颜色编辑模态框 -->
        <ColorEditor v-model:show="showColorEditor" :colors="talent.colorsArray" @save="handleSaveColors" />
    </div>
</template>

<script setup lang="ts">
import { NButton, NInputNumber } from 'naive-ui';
import { computed, ref } from 'vue';
import { useTalentStore } from '../talentStore';
import type { ITalentColor } from '../types';
import ColorEditor from './ColorEditor.vue';
import NodeEditor from './NodeEditor.vue';

const talent = useTalentStore();
const showColorEditor = ref(false);

const updateTotalPoints = (v: number | null) => {
    if (v !== null) {
        talent.totalPoints = v;
    }
};

const handleSaveColors = (colors: ITalentColor[]) => {
    talent.updateColors(colors);
};

const handleSave = () => {
    talent.saveData();
};

const hasColors = computed(() => talent.colorsArray.length > 0);
</script>
