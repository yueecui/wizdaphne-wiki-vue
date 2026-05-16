<template>
    <div v-if="selectedNode" class="border-[#37322a]! border! rounded-lg bg-black p-3">
        <div class="text-sm text-center text-[#e3cc99] mb-3">节点数据</div>

        <!-- ID -->
        <div class="mb-2">
            <label class="text-xs text-gray-400 block">
                ID
                <span v-if="isIdDuplicate" class="text-red-500 ml-1">重复ID</span>
            </label>
            <NInput
                :value="selectedNode.data.id"
                @update:value="(v) => (selectedNode!.data.id = v)"
                size="small"
                :class="{ 'border-red-500': isIdDuplicate }"
            />
        </div>

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

        <!-- Cost -->
        <div class="mb-2">
            <label class="text-xs text-gray-400 block">消耗点数</label>
            <NInputNumber
                :value="selectedNode.data.cost"
                @update:value="(v) => v !== null && (selectedNode!.data.cost = v)"
                :min="0"
                :max="99"
                size="small"
            />
        </div>

        <!-- Type -->
        <div class="mb-2">
            <label class="text-xs text-gray-400 block">类型</label>
            <NSelect
                :value="selectedNode.data.type ?? 0"
                @update:value="(v) => (selectedNode!.data.type = v)"
                :options="typeOptions"
                size="small"
            />
        </div>

        <!-- Position -->
        <div class="mb-2">
            <label class="text-xs text-gray-400 block">位置</label>
            <div class="flex gap-2">
                <NInputNumber
                    :value="selectedNode.data.x"
                    @update:value="(v) => v !== null && (selectedNode!.data.x = v)"
                    size="small"
                />
                <NInputNumber
                    :value="selectedNode.data.y"
                    @update:value="(v) => v !== null && (selectedNode!.data.y = v)"
                    size="small"
                />
            </div>
        </div>

        <!-- Options -->
        <div class="mb-3">
            <label class="text-xs text-gray-400 block">能力（每行一个）</label>
            <NInput
                :value="selectedNode.data.options.join('\n')"
                @update:value="(v) => (selectedNode!.data.options = v.split('\n'))"
                type="textarea"
                size="small"
                :rows="4"
            />
        </div>

        <!-- Number -->
        <div class="mb-2">
            <label class="text-xs text-gray-400 block">能力随机数量</label>
            <NInputNumber
                :value="selectedNode.data.number ?? 3"
                @update:value="(v) => v !== null && (selectedNode!.data.number = v)"
                :min="0"
                :max="99"
                size="small"
            />
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
import { NButton, NInput, NInputNumber, NSelect } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed } from 'vue';
import { useTalentStore } from '../talentStore';
import type { NodeGroup } from '../types';

const talent = useTalentStore();
const { selectedNode } = storeToRefs(talent);

const groupOptions = computed(() => talent.colorsArray.map((c) => ({ label: c.group, value: c.group as NodeGroup })));

const isIdDuplicate = computed(() => {
    if (!selectedNode.value || !selectedNode.value.data.id) return false;
    const currentId = selectedNode.value.data.id;
    const count = talent.nodes.filter((node) => node.data.id === currentId).length;
    return count >= 2;
});

const typeOptions = [
    { label: '普通节点', value: 0 },
    { label: '初始激活', value: 1 },
    { label: '未知节点', value: 2 },
];

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
