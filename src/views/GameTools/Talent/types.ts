import type { TalentNode } from './TalentNode';

export interface ITalentJson {
    totalPoints: number;
    width: number;
    height: number;
    radius: number;
    nodes: ITalentNode[];
    edges: ITalentEdge[];
    colors: ITalentColor[];
}

export type NodeGroup = '力量' | '智慧' | '信仰心' | '生命力' | '灵巧' | '敏捷' | '幸运' | '无';
export interface ITalentNode {
    id: string;
    label: string;
    type?: number; // 0：普通；1：初始激活；2：未知节点，默认为0
    group: NodeGroup; // 主要决定是哪个灯解锁的背景颜色
    cost: number; // 消耗点数 1/2/3
    x: number; // 与中心节点的水平偏移量
    y: number; // 与中心节点的垂直偏移量
    options: string[]; // 可用选项
    number?: number; // 随机时会从可用选项中选出的数量，默认为3。大于或等于options数量时表示没有随机
}

export interface ITalentEdge {
    from: string;
    to: string;
}

export interface ITalentColor {
    group: string;
    fill: string;
    stroke: string;
    text: string;
    activeFill: string;
    activeStroke: string;
    activeText: string;
    availableFill: string;
    availableStroke: string;
    availableText: string;
}

export interface TooltipInfo {
    node: TalentNode;
    x: number;
    y: number;
}
