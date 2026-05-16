<template>
    <NModal
        :show="show"
        @update:show="$emit('update:show', $event)"
        preset="card"
        title="颜色配置编辑"
        class="max-w-5xl"
    >
        <div class="space-y-6">
            <!-- 颜色列表 -->
            <div class="space-y-4">
                <div
                    v-for="(color, index) in editableColors"
                    :key="color.group + '_' + index"
                    class="border border-gray-600 rounded-lg p-4"
                >
                    <!-- 头部：名称编辑 + 排序按钮 -->
                    <div class="flex items-center justify-between mb-3">
                        <div class="flex items-center gap-2">
                            <NInput v-model:value="color.group" size="small" placeholder="分组名称" class="w-32" />
                        </div>
                        <div class="flex items-center gap-1">
                            <NButton size="tiny" :disabled="index === 0" @click="moveUp(index)" title="上移">↑</NButton>
                            <NButton
                                size="tiny"
                                :disabled="index === editableColors.length - 1"
                                @click="moveDown(index)"
                                title="下移"
                            >
                                ↓
                            </NButton>
                            <NButton size="tiny" type="error" @click="deleteGroup(index)" title="删除">×</NButton>
                        </div>
                    </div>

                    <!-- 三栏布局：不可用 / 可用 / 激活 -->
                    <div class="flex gap-4">
                        <!-- 不可用状态 -->
                        <div class="flex-1 border border-gray-600 rounded-lg p-3 bg-gray-900/50">
                            <div class="text-xs text-gray-400 mb-2 text-center">不可用状态</div>

                            <!-- 预览区域 -->
                            <div class="flex justify-center mb-3">
                                <svg width="80" height="80" viewBox="-40 -40 80 80">
                                    <circle
                                        :cx="0"
                                        :cy="0"
                                        r="30"
                                        :fill="color.fill"
                                        :stroke="color.stroke"
                                        stroke-width="1.5"
                                    />
                                    <text
                                        :x="0"
                                        y="0"
                                        text-anchor="middle"
                                        :fill="color.text"
                                        font-size="12"
                                        font-weight="400"
                                        font-family="system-ui, sans-serif"
                                    >
                                        测试文字
                                    </text>
                                    <text
                                        :x="0"
                                        y="15"
                                        text-anchor="middle"
                                        :fill="color.text"
                                        font-size="10"
                                        font-family="system-ui, sans-serif"
                                    >
                                        3pt
                                    </text>
                                </svg>
                            </div>

                            <!-- 颜色选择器 -->
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-400 mb-1 block">填充色</label>
                                    <div class="flex items-center gap-2">
                                        <NColorPicker v-model:value="color.fill" show-text size="small" />
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-400 mb-1 block">边框色</label>
                                    <div class="flex items-center gap-2">
                                        <NColorPicker v-model:value="color.stroke" show-text size="small" />
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-400 mb-1 block">文字色</label>
                                    <div class="flex items-center gap-2">
                                        <NColorPicker v-model:value="color.text" show-text size="small" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 可用状态 -->
                        <div class="flex-1 border border-gray-600 rounded-lg p-3 bg-gray-900/50">
                            <div class="text-xs text-gray-400 mb-2 text-center">可用状态</div>

                            <!-- 预览区域 -->
                            <div class="flex justify-center mb-3">
                                <svg width="80" height="80" viewBox="-40 -40 80 80">
                                    <circle
                                        :cx="0"
                                        :cy="0"
                                        r="30"
                                        :fill="color.availableFill"
                                        :stroke="color.availableStroke"
                                        stroke-width="1.5"
                                    />
                                    <text
                                        :x="0"
                                        y="0"
                                        text-anchor="middle"
                                        :fill="color.availableText"
                                        font-size="12"
                                        font-weight="400"
                                        font-family="system-ui, sans-serif"
                                    >
                                        测试文字
                                    </text>
                                    <text
                                        :x="0"
                                        y="15"
                                        text-anchor="middle"
                                        :fill="color.availableText"
                                        font-size="10"
                                        font-family="system-ui, sans-serif"
                                    >
                                        3pt
                                    </text>
                                </svg>
                            </div>

                            <!-- 颜色选择器 -->
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-400 mb-1 block">填充色</label>
                                    <div class="flex items-center gap-2">
                                        <NColorPicker v-model:value="color.availableFill" show-text size="small" />
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-400 mb-1 block">边框色</label>
                                    <div class="flex items-center gap-2">
                                        <NColorPicker v-model:value="color.availableStroke" show-text size="small" />
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-400 mb-1 block">文字色</label>
                                    <div class="flex items-center gap-2">
                                        <NColorPicker v-model:value="color.availableText" show-text size="small" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- 激活状态 -->
                        <div class="flex-1 border border-gray-600 rounded-lg p-3 bg-gray-900/50">
                            <div class="text-xs text-gray-400 mb-2 text-center">激活状态</div>

                            <!-- 预览区域 -->
                            <div class="flex justify-center mb-3">
                                <svg width="80" height="80" viewBox="-40 -40 80 80">
                                    <circle
                                        :cx="0"
                                        :cy="0"
                                        r="30"
                                        :fill="color.activeFill"
                                        :stroke="color.activeStroke"
                                        stroke-width="1.5"
                                    />
                                    <text
                                        :x="0"
                                        y="0"
                                        text-anchor="middle"
                                        :fill="color.activeText"
                                        font-size="12"
                                        font-weight="400"
                                        font-family="system-ui, sans-serif"
                                    >
                                        测试文字
                                    </text>
                                    <text
                                        :x="0"
                                        y="15"
                                        text-anchor="middle"
                                        :fill="color.activeText"
                                        font-size="10"
                                        font-family="system-ui, sans-serif"
                                    >
                                        3pt
                                    </text>
                                </svg>
                            </div>

                            <!-- 颜色选择器 -->
                            <div class="space-y-2">
                                <div>
                                    <label class="text-xs text-gray-400 mb-1 block">填充色</label>
                                    <div class="flex items-center gap-2">
                                        <NColorPicker v-model:value="color.activeFill" show-text size="small" />
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-400 mb-1 block">边框色</label>
                                    <div class="flex items-center gap-2">
                                        <NColorPicker v-model:value="color.activeStroke" show-text size="small" />
                                    </div>
                                </div>
                                <div>
                                    <label class="text-xs text-gray-400 mb-1 block">文字色</label>
                                    <div class="flex items-center gap-2">
                                        <NColorPicker v-model:value="color.activeText" show-text size="small" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 添加新分组 -->
            <div class="flex justify-center">
                <NButton type="primary" @click="addGroup">添加新分组</NButton>
            </div>

            <!-- 操作按钮 -->
            <div class="flex justify-end gap-3 pt-4 border-t border-gray-700">
                <NButton @click="resetColors">重置</NButton>
                <NButton type="primary" @click="saveColors">保存</NButton>
            </div>
        </div>
    </NModal>
</template>

<script setup lang="ts">
import { NButton, NColorPicker, NInput, NModal } from 'naive-ui';
import { ref, watch } from 'vue';
import type { ITalentColor } from '../types';

const props = defineProps<{
    show: boolean;
    colors: ITalentColor[];
}>();

const emit = defineEmits<{
    (e: 'update:show', value: boolean): void;
    (e: 'save', colors: ITalentColor[]): void;
}>();

const editableColors = ref<ITalentColor[]>([]);
const originalColors = ref<ITalentColor[]>([]);

watch(
    () => props.colors,
    (newColors) => {
        editableColors.value = JSON.parse(JSON.stringify(newColors));
        originalColors.value = JSON.parse(JSON.stringify(newColors));
    },
    { immediate: true, deep: true },
);

watch(
    () => props.show,
    (newShow) => {
        if (newShow) {
            editableColors.value = JSON.parse(JSON.stringify(props.colors));
        }
    },
);

const createDefaultColor = (groupName: string): ITalentColor => ({
    group: groupName,
    fill: '#888888',
    stroke: '#555555',
    text: '#ffffff',
    activeFill: '#888888',
    activeStroke: '#333333',
    activeText: '#ffffff',
    availableFill: '#dddddd',
    availableStroke: '#888888',
    availableText: '#333333',
});

const moveUp = (index: number) => {
    if (index > 0) {
        const temp = editableColors.value[index];
        editableColors.value[index] = editableColors.value[index - 1];
        editableColors.value[index - 1] = temp;
    }
};

const moveDown = (index: number) => {
    if (index < editableColors.value.length - 1) {
        const temp = editableColors.value[index];
        editableColors.value[index] = editableColors.value[index + 1];
        editableColors.value[index + 1] = temp;
    }
};

const deleteGroup = (index: number) => {
    editableColors.value.splice(index, 1);
};

const addGroup = () => {
    let newGroupName = '新分组';
    let counter = 1;
    while (editableColors.value.some((c) => c.group === newGroupName)) {
        newGroupName = `新分组${counter}`;
        counter++;
    }
    editableColors.value.push(createDefaultColor(newGroupName));
};

const resetColors = () => {
    editableColors.value = JSON.parse(JSON.stringify(originalColors.value));
};

const saveColors = () => {
    emit('save', JSON.parse(JSON.stringify(editableColors.value)));
    emit('update:show', false);
};
</script>
