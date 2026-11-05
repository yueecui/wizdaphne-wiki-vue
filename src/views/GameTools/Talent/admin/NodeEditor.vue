<template>
    <div v-if="selectedNode" class="border-[#37322a]! border! rounded-lg bg-black p-3">
        <div class="text-sm text-center text-[#e3cc99] mb-3">节点数据</div>

        <!-- Label -->
        <div class="mb-2">
            <label class="text-xs text-gray-400 block">名称</label>
            <NInput
                :value="selectedNode.data.label"
                @update:value="(v) => (selectedNode!.data.label = v)"
                size="small"
            />
        </div>

        <!-- Group -->
        <div class="mb-2">
            <label class="text-xs text-gray-400 block">分组</label>
            <NSelect
                :value="selectedNode.data.group"
                @update:value="(v) => (selectedNode!.data.group = v)"
                :options="groupOptions"
                size="small"
            />
        </div>

        <!-- 其余字段来自游戏数据，只读展示 -->
        <div class="flex flex-col gap-1 text-xs text-gray-400 border-t! border-[#37322a]! pt-2 mb-2">
            <div class="flex justify-between gap-2">
                <span class="shrink-0">ID</span>
                <span class="text-gray-200 text-right break-all">{{ selectedNode.data.id }}</span>
            </div>
            <div class="flex justify-between">
                <span>消耗点数</span>
                <span class="text-gray-200">{{ selectedNode.data.cost }}</span>
            </div>
            <div class="flex justify-between">
                <span>类型</span>
                <span class="text-gray-200">{{ typeLabel }}</span>
            </div>
            <div class="flex justify-between">
                <span>位置</span>
                <span class="text-gray-200">{{ selectedNode.data.x }}, {{ selectedNode.data.y }}</span>
            </div>
            <div class="flex justify-between">
                <span>能力随机数量</span>
                <span class="text-gray-200">{{ selectedNode.number }}</span>
            </div>
        </div>

        <!-- Options -->
        <div v-if="optionRows.length" class="mb-3">
            <div class="text-xs text-gray-400 mb-1">可能出现的能力</div>
            <div class="flex flex-col gap-0.5 max-h-40 overflow-y-auto thin-scrollbar">
                <div v-for="(row, index) in optionRows" :key="index" class="flex justify-between gap-2 text-xs">
                    <span class="text-gray-200 break-all">{{ row.name }}</span>
                    <span v-if="row.percent" class="text-gray-500 shrink-0">{{ row.percent }}</span>
                </div>
            </div>
        </div>

        <!-- Actions -->
        <div class="flex justify-between">
            <div class="flex gap-1">
                <NButton size="tiny" :type="talent.isConnecting ? 'error' : 'primary'" @click="toggleConnecting">
                    {{ talent.isConnecting ? '取消连线' : '连线' }}
                </NButton>
                <NButton size="tiny" @click="handleDeselect">取消选择</NButton>
            </div>
            <div class="flex gap-1">
                <NButton size="tiny" @click="handleDuplicate">复制</NButton>
                <NButton size="tiny" @click="handleRestore">还原</NButton>
                <NButton size="tiny" type="error" @click="handleDelete">删除</NButton>
            </div>
        </div>
    </div>

    <div v-else class="border-[#37322a]! border! rounded-lg bg-black p-3">
        <div class="text-sm text-center text-gray-400">未选择节点</div>
        <div class="text-xs text-center text-gray-500 mt-4">Ctrl+左击节点查看数据</div>
        <div class="text-xs text-center text-gray-500 mt-2">Ctrl+右击空白创建新节点</div>
        <div class="text-xs text-center text-gray-500 mt-2">Ctrl+左键拖动移动节点</div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput, NSelect } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useTalentStore } from '../talentStore';
import type { NodeGroup } from '../types';

const talent = useTalentStore();
const { selectedNode } = storeToRefs(talent);

const groupOptions = computed(() => talent.colorsArray.map((c) => ({ label: c.group, value: c.group as NodeGroup })));

const typeLabels: Record<number, string> = {
    0: '普通节点',
    1: '初始激活',
    2: '未知节点',
};

const typeLabel = computed(() => typeLabels[selectedNode.value?.data.type ?? 0] ?? `未知(${selectedNode.value?.data.type})`);

/** 能力 + 出现概率（只读，权重来自游戏数据） */
const optionRows = computed(() => {
    const node = selectedNode.value;
    if (!node) return [];
    return node.options.map((name, index) => ({ name, percent: node.getPercent(index) }));
});

const handleRestore = () => {
    talent.restoreNode();
};

const handleDuplicate = () => {
    if (selectedNode.value) {
        talent.duplicateNode(selectedNode.value);
    }
};

const handleDelete = () => {
    if (selectedNode.value) {
        talent.deleteNode(selectedNode.value.id);
    }
};

const toggleConnecting = () => {
    if (talent.isConnecting) {
        talent.cancelConnecting();
    } else if (selectedNode.value) {
        talent.startConnecting(selectedNode.value.id);
    }
};

const handleDeselect = () => {
    talent.selectNode(null);
};
</script>
