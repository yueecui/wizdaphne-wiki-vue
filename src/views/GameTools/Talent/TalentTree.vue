<template>
    <div class="w-full h-full relative" ref="svgContainer">
        <svg
            ref="svgRef"
            :width="talent.width"
            :height="talent.height"
            class="tree-svg"
            :class="isDragging ? 'grabbing' : isDraggingNode ? 'move' : 'grab'"
            xmlns="http://www.w3.org/2000/svg"
            @mousedown="onMouseDown"
            @mousemove="onMouseMoveCanvas"
            @mouseup="onMouseUp"
            @mouseleave="onMouseUp"
            @contextmenu.stop="onCanvasRightClick"
        >
            <!-- Edges -->
            <g class="edges">
                <template v-for="edge in edges">
                    <line
                        v-if="edge.isValid()"
                        :key="`${edge.from}-${edge.to}`"
                        :x1="nodes.find((n) => n.id === edge.from)?.getX()"
                        :y1="nodes.find((n) => n.id === edge.from)?.getY()"
                        :x2="nodes.find((n) => n.id === edge.to)?.getX()"
                        :y2="nodes.find((n) => n.id === edge.to)?.getY()"
                        :stroke="edge.getColor()"
                        :stroke-width="edge.getWidth()"
                        stroke-linecap="round"
                    />
                </template>
            </g>

            <!-- Nodes -->
            <g
                v-for="node in nodes"
                :key="node.id"
                :class="[
                    talent.isSimulateMode
                        ? node.getState() === 'locked'
                            ? 'cursor-not-allowed'
                            : 'cursor-pointer'
                        : 'cursor-default',
                ]"
                @click.stop="onNodeClick($event, node)"
                @contextmenu.stop="onNodeRightClick($event, node)"
                @mouseenter="onMouseEnter($event, node)"
                @mousemove="onMouseMove($event, node)"
                @mouseleave="onMouseLeave"
            >
                <circle
                    :cx="node.getX()"
                    :cy="node.getY()"
                    :r="talent.radius"
                    :fill="node.getColors().fill"
                    :stroke="node.getColors().stroke"
                    :stroke-width="1.5"
                />
                <!-- Main label -->
                <text
                    v-for="(line, i) in splitLabel(node.label)"
                    :key="i"
                    :x="node.getX()"
                    :y="node.getY() + (splitLabel(node.label).length === 1 ? 0 : i * 13 - 5)"
                    text-anchor="middle"
                    :fill="node.getColors().text"
                    :font-size="12"
                    :font-weight="400"
                    font-family="system-ui, sans-serif"
                >
                    {{ line }}
                </text>
                <!-- Cost -->
                <text
                    v-if="node.type === 0"
                    :x="node.getX()"
                    :y="node.getY() + (splitLabel(node.label).length === 1 ? 15 : 22)"
                    text-anchor="middle"
                    :fill="getCostColor(node)"
                    font-size="10"
                    font-family="system-ui, sans-serif"
                >
                    {{ `${node.cost}pt` }}
                </text>
            </g>
        </svg>
    </div>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { MwConfig } from '../../../huiji/MwConfig';
import type { TalentNode } from './TalentNode';
import { useTalentStore } from './talentStore';

const talent = useTalentStore();
const { nodes, edges, isConnecting, connectingFrom, isFullscreen } = storeToRefs(talent);
const canEditTalent = MwConfig.getInstance().canEditTalent;

// ── refs ────────────────────────────────────────────────────────
const svgContainer = ref<HTMLDivElement | null>(null);
const svgRef = ref<SVGSVGElement | null>(null);

// ── drag state ──────────────────────────────────────────────────
const isDragging = ref(false);
const hasInteracted = ref(false);
const dragStartX = ref(0);
const dragStartY = ref(0);
const translateX = ref(0);
const translateY = ref(0);
const isDraggingNode = ref(false);
const dragNodeStartX = ref(0);
const dragNodeStartY = ref(0);
const dragNodeStartOffsetX = ref(0);
const dragNodeStartOffsetY = ref(0);

// 用于 DOM 直接操作的临时变量
let currentTranslateX = 0;
let currentTranslateY = 0;

// ── DOM 操作函数 ────────────────────────────────────────────────
function updateSvgTransform(x: number, y: number) {
    currentTranslateX = x;
    currentTranslateY = y;
    if (svgRef.value) {
        svgRef.value.style.transform = `translate(${x}px, ${y}px)`;
    }
}

// ── drag handlers ───────────────────────────────────────────────

function onMouseDown(e: MouseEvent) {
    if (e.button === 0) {
        hasInteracted.value = true;

        // Ctrl+拖动选中节点（需要权限）
        if (canEditTalent && (e.ctrlKey || e.metaKey) && talent.selectedNode) {
            isDraggingNode.value = true;
            const rect = svgContainer.value?.getBoundingClientRect();
            if (rect) {
                dragNodeStartX.value = e.clientX;
                dragNodeStartY.value = e.clientY;
                dragNodeStartOffsetX.value = talent.selectedNode.getX() - (e.clientX - rect.left - currentTranslateX);
                dragNodeStartOffsetY.value = talent.selectedNode.getY() - (e.clientY - rect.top - currentTranslateY);
            }
        } else {
            isDragging.value = true;
            dragStartX.value = e.clientX - currentTranslateX;
            dragStartY.value = e.clientY - currentTranslateY;
        }
    }
}

function onMouseMoveCanvas(e: MouseEvent) {
    if (isDragging.value) {
        const newTranslateX = e.clientX - dragStartX.value;
        const newTranslateY = e.clientY - dragStartY.value;

        const containerWidth = svgContainer.value?.clientWidth || 0;
        const containerHeight = svgContainer.value?.clientHeight || 0;

        const maxTranslateX = Math.max(0, talent.width - containerWidth);
        const maxTranslateY = Math.max(0, talent.height - containerHeight);

        const targetX = Math.max(-maxTranslateX, Math.min(0, newTranslateX));
        const targetY = Math.max(-maxTranslateY, Math.min(0, newTranslateY));

        // 直接操作 DOM，完全绕过 Vue 响应式
        updateSvgTransform(targetX, targetY);
    } else if (isDraggingNode.value && talent.selectedNode) {
        const rect = svgContainer.value?.getBoundingClientRect();
        if (rect) {
            const x = e.clientX - rect.left - currentTranslateX + dragNodeStartOffsetX.value;
            const y = e.clientY - rect.top - currentTranslateY + dragNodeStartOffsetY.value;

            talent.selectedNode.data.x = Math.max(-talent.width / 2, Math.min(talent.width / 2, x - talent.width / 2));
            talent.selectedNode.data.y = Math.max(
                -talent.height / 2,
                Math.min(talent.height / 2, y - talent.height / 2),
            );
        }
    }
}

function onMouseUp() {
    if (isDragging.value) {
        // 拖动结束时，同步最终位置到响应式变量
        translateX.value = currentTranslateX;
        translateY.value = currentTranslateY;
    }
    isDragging.value = false;
    isDraggingNode.value = false;
}

// ── node interaction ────────────────────────────────────────────

function onNodeClick(e: MouseEvent, node: TalentNode) {
    if (isDragging.value) return;

    // Admin 模式下 Ctrl+点击选中节点
    if (canEditTalent && (e.ctrlKey || e.metaKey)) {
        talent.selectNode(node);
        return;
    }

    // Admin 模式下创建连线
    if (canEditTalent && isConnecting.value) {
        talent.endConnecting(node.id);
        return;
    }

    // 非模拟模式下不响应点击
    if (!talent.isSimulateMode) {
        return;
    }

    if (node.getState() === 'locked') return;
    hasInteracted.value = true;

    // 左键只激活，不取消
    const result = talent.activate(node.id);
    if (!result.success) {
        window.wiz.$message.error(result.reason || '未知错误');
        return;
    }
}

function onNodeRightClick(e: MouseEvent, node: TalentNode) {
    e.preventDefault();
    if (isDragging.value) return;

    // 非模拟模式下不响应右键
    if (!talent.isSimulateMode) {
        return;
    }

    hasInteracted.value = true;

    // 右键只取消
    const result = talent.deactivate(node.id);
    if (!result.success) {
        window.wiz.$message.error(result.reason || '未知错误');
        return;
    }
}

function onCanvasRightClick(e: MouseEvent) {
    e.preventDefault();
    hasInteracted.value = true;

    if (canEditTalent && (e.ctrlKey || e.metaKey)) {
        const rect = svgContainer.value?.getBoundingClientRect();
        if (rect) {
            const x = e.clientX - rect.left - currentTranslateX - talent.width / 2;
            const y = e.clientY - rect.top - currentTranslateY - talent.height / 2;
            talent.createNode(
                Math.max(-talent.width / 2, Math.min(talent.width / 2, x)),
                Math.max(-talent.height / 2, Math.min(talent.height / 2, y)),
            );
            talent.lastMessage = '已创建新节点';
        }
    }
}

function onMouseEnter(e: MouseEvent, node: TalentNode) {
    if (!isDragging.value) {
        talent.showTooltip(node, e.clientX, e.clientY);
    }
}

function onMouseMove(e: MouseEvent, node: TalentNode) {
    if (!isDragging.value) {
        talent.showTooltip(node, e.clientX, e.clientY);
    }
}

function onMouseLeave() {
    talent.hideTooltip();
}

function getCostColor(node: TalentNode): string {
    // 浏览模式下使用默认文字颜色
    if (!talent.isSimulateMode) {
        return node.getColors().text;
    }

    // 已激活的节点使用默认文字颜色
    if (talent.activated.has(node.id)) {
        return node.getColors().text;
    }

    // 未激活节点根据消耗点数显示不同颜色
    switch (node.cost) {
        case 1:
            return '#00e676'; // 绿色
        case 2:
            return '#649eff'; // 蓝色
        case 3:
            return '#e862ff'; // 紫色
        default:
            return node.getColors().text;
    }
}

// ── label splitting ───────────────────────────────────────────

function splitLabel(label: string): string[] {
    if (label.length <= 4) return [label];
    return [label.slice(0, 4), label.slice(4)];
}

// ── resize handling ────────────────────────────────────────────

function handleResize(forceCenter = false) {
    const containerWidth = svgContainer.value?.clientWidth || 0;
    const containerHeight = svgContainer.value?.clientHeight || 0;

    const offsetX = (containerWidth - talent.width) / 2;
    const offsetY = (containerHeight - talent.height) / 2;

    const maxTranslateX = Math.max(0, talent.width - containerWidth);
    const maxTranslateY = Math.max(0, talent.height - containerHeight);

    const centerX = Math.max(-maxTranslateX, Math.min(0, offsetX));
    const centerY = Math.max(-maxTranslateY, Math.min(0, offsetY));

    if (forceCenter || !hasInteracted.value) {
        translateX.value = centerX;
        translateY.value = centerY;
        currentTranslateX = centerX;
        currentTranslateY = centerY;
        updateSvgTransform(centerX, centerY);
    } else {
        translateX.value = Math.max(-maxTranslateX, Math.min(0, translateX.value));
        translateY.value = Math.max(-maxTranslateY, Math.min(0, translateY.value));
        currentTranslateX = translateX.value;
        currentTranslateY = translateY.value;
        updateSvgTransform(translateX.value, translateY.value);
    }
}

// 监听全屏变化，强制居中
watch(isFullscreen, () => {
    nextTick(() => {
        handleResize(true);
    });
});

onMounted(() => {
    window.addEventListener('resize', () => handleResize());
    handleResize();
});

watch(
    () => talent.width,
    () => handleResize(),
);
watch(
    () => talent.height,
    () => handleResize(),
);

onUnmounted(() => {
    window.removeEventListener('resize', () => handleResize());
});
</script>

<style scoped>
.tree-svg {
    display: block;
    user-select: none;
    -webkit-user-select: none;
}

.tree-svg.grab {
    cursor: grab;
}

.tree-svg.grabbing {
    cursor: grabbing;
}

.tree-svg.move {
    cursor: move;
}

.node-group.state-locked {
    cursor: not-allowed;
}
.node-group:hover circle {
    filter: brightness(0.92);
}
</style>
