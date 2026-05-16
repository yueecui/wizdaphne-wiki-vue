import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { edit } from '../../../api/editPage';
import { IS_DEV } from '../../../util';
import { TalentEdge } from './TalentEdge';
import { TalentNode } from './TalentNode';
import { type ITalentColor, type ITalentJson, type ITalentNode, type TooltipInfo } from './types';

export const useTalentStore = defineStore('talent', () => {
    // ── State ────────────────────────────────────────────────
    const isLoading = ref(false);
    const isInit = ref(false);

    const totalPoints = ref(50);
    const width = ref(2400);
    const height = ref(2400);
    const radius = ref(30);
    const nodes = ref<TalentNode[]>([]);
    const edges = ref<TalentEdge[]>([]);

    const activated = ref<Set<string>>(new Set());
    const tooltip = ref<TooltipInfo | null>(null);
    const colors = ref<Map<string, ITalentColor>>(new Map());

    // ── Node Editor State ────────────────────────────────────
    const selectedNode = ref<TalentNode | null>(null);
    const selectedNodeBackup = ref<TalentNode | null>(null);
    const isConnecting = ref(false);
    const connectingFrom = ref<string | null>(null);
    const lastMessage = ref('');

    // ── Fullscreen State ────────────────────────────────────
    const isFullscreen = ref(false);

    // ── Simulate Mode State ─────────────────────────────────
    const isSimulateMode = ref(false);

    const loadTalentData = async () => {
        if (isLoading.value || isInit.value) return;

        isLoading.value = true;

        try {
            const response = await fetch(
                IS_DEV ? '/talent.json' : 'https://wizdaphne.huijiwiki.com/wiki/Data:Talent.json?action=raw',
            );

            if (response.ok) {
                const data: ITalentJson = await response.json();
                totalPoints.value = data.totalPoints ?? 50;
                width.value = data.width ?? 2400;
                height.value = data.height ?? 2400;
                radius.value = data.radius ?? 30;
                nodes.value = data.nodes.map((n) => new TalentNode(n));
                edges.value = data.edges.map((e) => new TalentEdge(e)).filter((e) => e.isValid());
                colors.value.clear();
                data.colors.forEach((c) => colors.value.set(c.group, c));
                reset();

                isInit.value = true;
            } else {
                console.error('获取天赋数据失败');
            }
        } catch (error) {
            console.error('加载天赋数据时发生错误:', error);
        } finally {
            isLoading.value = false;
        }
    };
    // ── 状态计算 ──────────────────────────────────────────

    const usedPoints = computed(() =>
        Array.from(activated.value).reduce((sum, id) => {
            const node = getNode(id);
            return sum + (node?.cost ?? 0);
        }, 0),
    );

    const remainingPoints = computed(() => totalPoints.value - usedPoints.value);

    // ── 操作 ──────────────────────────────────────────────
    function getNode(id: string): TalentNode | undefined {
        return nodes.value.find((n) => n.id === id);
    }

    function activate(nodeId: string): { success: boolean; reason?: string } {
        const node = getNode(nodeId);
        if (!node) return { success: false, reason: '节点不存在' };
        if (activated.value.has(nodeId)) return { success: true };

        const adjacentNodes = node.getAdjacentNodes();
        if (adjacentNodes.length > 0 && !adjacentNodes.some((n) => activated.value.has(n))) {
            return { success: false, reason: '需要先激活相邻节点' };
        }
        if (remainingPoints.value < node.cost) {
            return { success: false, reason: `点数不足（需要 ${node.cost}，剩余 ${remainingPoints.value}）` };
        }

        activated.value = new Set(activated.value).add(nodeId);
        return { success: true };
    }

    function deactivate(nodeId: string): { success: boolean; reason?: string } {
        if (!activated.value.has(nodeId)) {
            return { success: true };
        }

        const next = new Set(activated.value);
        next.delete(nodeId);

        const type1Nodes = nodes.value.filter((n) => n.type === 1).map((n) => n.id);

        const visited = new Set<string>();
        const queue: string[] = [...type1Nodes.filter((id) => next.has(id))];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const currentNode = getNode(currentId);
            if (currentNode) {
                const adjacentNodes = currentNode.getAdjacentNodes();
                for (const adjId of adjacentNodes) {
                    if (next.has(adjId) && !visited.has(adjId)) {
                        queue.push(adjId);
                    }
                }
            }
        }

        activated.value = visited;
        return { success: true };
    }

    function toggle(nodeId: string): { success: boolean; reason?: string } {
        return activated.value.has(nodeId) ? deactivate(nodeId) : activate(nodeId);
    }

    function reset() {
        activated.value = new Set();
        nodes.value.forEach((n) => {
            if (n.type === 1) {
                activated.value.add(n.id);
            }
        });
    }

    function toggleFullscreen() {
        isFullscreen.value = !isFullscreen.value;
    }

    function toggleSimulateMode() {
        isSimulateMode.value = !isSimulateMode.value;
    }

    // ── Tooltip ───────────────────────────────────────────

    function showTooltip(node: TalentNode, x: number, y: number) {
        tooltip.value = { node, x, y };
    }

    function hideTooltip() {
        tooltip.value = null;
    }

    // ── Computed lists ────────────────────────────────────

    const activatedCount = computed(() => activated.value.size);

    // 获取颜色数组（供编辑组件使用）
    const colorsArray = computed(() => Array.from(colors.value.values()));

    // 更新颜色配置
    function updateColors(newColors: ITalentColor[]) {
        colors.value.clear();
        newColors.forEach((c) => colors.value.set(c.group, c));
    }

    // ── Node Editor Actions ────────────────────────────────────

    function selectNode(node: TalentNode | null) {
        if (node) {
            selectedNode.value = node;
            selectedNodeBackup.value = JSON.parse(JSON.stringify(node));
        } else {
            selectedNode.value = null;
            selectedNodeBackup.value = null;
        }
    }

    function restoreNode() {
        if (selectedNode.value && selectedNodeBackup.value) {
            Object.assign(selectedNode.value.data, selectedNodeBackup.value.data);
        }
    }

    function deleteNode(nodeId: string) {
        const index = nodes.value.findIndex((n) => n.id === nodeId);
        if (index !== -1) {
            nodes.value.splice(index, 1);
            edges.value = edges.value.filter((e) => e.from !== nodeId && e.to !== nodeId);
            if (selectedNode.value?.id === nodeId) {
                selectedNode.value = null;
                selectedNodeBackup.value = null;
            }
        }
    }

    function duplicateNode(node: TalentNode) {
        let newId: string;
        const match = node.id.match(/^(.*?)(\d+)$/);
        if (match) {
            const prefix = match[1];
            const num = parseInt(match[2], 10);
            newId = `${prefix}${num + 1}`;
        } else {
            newId = `${node.id}_copy_${Date.now()}`;
        }
        const offsetX = node.getX() < width.value / 2 ? 80 : -80;
        const newNode = new TalentNode({
            ...JSON.parse(JSON.stringify(node.data)),
            id: newId,
            x: node.data.x + offsetX,
            y: node.data.y,
        });
        nodes.value.push(newNode);
        selectNode(newNode);
        return newNode;
    }

    function createNode(x: number, y: number) {
        const newId = `node_${Date.now()}`;
        const newNode = new TalentNode({
            id: newId,
            label: '新节点',
            group: '无',
            cost: 1,
            x,
            y,
            options: ['待记录1', '待记录2', '待记录3'],
            number: 3,
            type: 0,
        });
        nodes.value.push(newNode);
        selectNode(newNode);
        return newNode;
    }

    function startConnecting(fromNodeId: string) {
        isConnecting.value = true;
        connectingFrom.value = fromNodeId;
        lastMessage.value = '请选择一个节点';
    }

    function endConnecting(toNodeId: string) {
        if (!connectingFrom.value || connectingFrom.value === toNodeId) {
            cancelConnecting();
            return;
        }

        const existingEdge = edges.value.find((e) => e.from === connectingFrom.value && e.to === toNodeId);

        if (existingEdge) {
            edges.value = edges.value.filter((e) => !(e.from === connectingFrom.value && e.to === toNodeId));
            lastMessage.value = `已移除连线 ${connectingFrom.value} → ${toNodeId}`;
        } else {
            const newEdge = new TalentEdge({ from: connectingFrom.value, to: toNodeId });
            edges.value.push(newEdge);
            lastMessage.value = `已添加连线 ${connectingFrom.value} → ${toNodeId}`;
        }

        cancelConnecting();
    }

    function cancelConnecting() {
        isConnecting.value = false;
        connectingFrom.value = null;
        lastMessage.value = '';
    }

    function updateNode(nodeId: string, updates: Partial<ITalentNode>) {
        const node = getNode(nodeId);
        if (node) {
            Object.assign(node.data, updates);
        }
    }

    // 保存数据
    async function saveData() {
        const jsonData: ITalentJson = {
            totalPoints: totalPoints.value,
            width: width.value,
            height: height.value,
            radius: radius.value,
            nodes: nodes.value.map((n) => ({
                ...n.data,
                options: n.data.options.filter((s) => s.trim()),
            })),
            edges: edges.value.filter((e) => e.isValid()).map((e) => ({ from: e.from, to: e.to })),
            colors: Array.from(colors.value.values()),
        };

        if (IS_DEV) {
            try {
                const jsonStringFormatted = JSON.stringify(jsonData, null, 2);
                await navigator.clipboard.writeText(jsonStringFormatted);
                lastMessage.value = '数据已复制到剪贴板';
            } catch (error) {
                console.error('复制失败:', error);
                lastMessage.value = '复制到剪贴板失败';
            }
        } else {
            const jsonStringMinified = JSON.stringify(jsonData);
            const result = await edit({
                title: 'Data:Talent.json',
                text: jsonStringMinified,
                summary: '更新心器之渊数据',
                minor: false,
            });
            if ('error' in result) {
                window.wiz.$message.error(`保存失败：${result.error.info}`);
            } else {
                window.wiz.$message.success('保存成功');
            }
        }
    }

    // 初始化
    loadTalentData();

    return {
        // state
        activated,
        colors,
        colorsArray,
        tooltip,
        usedPoints,
        remainingPoints,
        activatedCount,
        totalPoints,
        nodes,
        edges,
        width,
        height,
        radius,
        // node editor state
        selectedNode,
        selectedNodeBackup,
        isConnecting,
        connectingFrom,
        lastMessage,
        // fullscreen state
        isFullscreen,
        // simulate mode state
        isSimulateMode,
        // queries
        getNode,
        // actions
        activate,
        deactivate,
        toggle,
        reset,
        updateColors,
        // tooltip
        showTooltip,
        hideTooltip,
        // fullscreen actions
        toggleFullscreen,
        // simulate mode actions
        toggleSimulateMode,
        // node editor actions
        selectNode,
        restoreNode,
        deleteNode,
        duplicateNode,
        createNode,
        startConnecting,
        endConnecting,
        cancelConnecting,
        updateNode,
        saveData,
    };
});
