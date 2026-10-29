import type { BlessingDictionaries, BlessingEffect } from './blessingTypes';

/**
 * 加护效果的文案。
 *
 * 数据里的效果只存 `kind` + `params`，参数含义由 kind 决定。其中 4 个 kind 已确认
 * （见 `local_scripts/clean/blessing.py`）：
 *
 * | kind | 名称 | params |
 * |---|---|---|
 * | 7000 | 加護 | 0: 能力值 id、1: 加成 % |
 * | 150 | 种族特效 | 0: 种族 id、1: 伤害 % |
 * | 2340 | 种族抵抗 | 0: 种族 id、1: 伤害 %（负） |
 * | 2363 | 属性攻击造成伤害提升 | 0: 伤害 %、1: 属性 id |
 *
 * 其余（耐性变动 / 属性伤害减轻 …）只有数值，用数据里带的日文种类名。
 */
export const KIND_BLESSING_STAT = 7000;
export const KIND_RACE_ATTACK = 150;
export const KIND_RACE_RESIST = 2340;
export const KIND_ATTRIBUTE_ATTACK = 2363;

/** 效果表的一行：kind + 效果名 + 参数名 + 值（和技能详情的 sub effect 行同构） */
export interface BlessingEffectRow {
    /** 效果种类 id（行首的小标签，方便对照 EffectKind 表） */
    kind: number;
    /** 效果名（wiki 上的中文名 > 数据里的日文名） */
    group: string;
    /** 参数名（能力值 / 种族 / 加成 …） */
    name: string;
    value: string;
}

/** 效果种类名的取值来源（技能详情用的是 wiki 手改的 `Data:EffectKind.json` 中文名） */
export type KindLabel = (kind: number) => string | null | undefined;

/** 稀有度只体现在加护名的颜色上：0 白 / 1 绿 / 2 蓝 / 3 紫 */
export const rarityTextClass = (value: number) =>
    ['text-white', 'text-green-400', 'text-blue-400', 'text-purple-400'][Math.min(Math.max(value, 0), 3)];

/** 稀有度的文字描述（详情页显示「白 / 绿 / 蓝 / 紫」而不是编号） */
export const RARITY_NAMES = ['白', '绿', '蓝', '紫'];

export const rarityName = (value: number) => RARITY_NAMES[Math.min(Math.max(value, 0), 3)];

/**
 * 加护池的名字。解包表里池只有编号（`HakenBlessing.group_id` 的前几位），
 * 名字按游戏内叫法硬编码在这里。
 */
export const POOL_NAMES: Record<number, string> = {
    2000: '初始的奈落',
    2001: '贸易水路',
    2002: '不落的要塞',
    2003: '豪雪地带',
    7015: '北穿幽灵城',
    600000: '古城遗迹',
};

export const poolName = (value: number) => POOL_NAMES[value] ?? `加护池 ${value}`;

const lookup = (table: Record<string, string> | undefined, id: number | undefined, fallback: string) =>
    table?.[String(id ?? '')] ?? `${fallback}${id ?? '?'}`;

/** 效果种类的显示名：wiki 中文名 > 数据的日文名 > 编号 */
export const kindText = (effect: BlessingEffect, kindLabel?: KindLabel) =>
    kindLabel?.(effect.kind) || effect.kind_name || `效果 ${effect.kind}`;

/** 列表里的一行文案 */
export const effectLabel = (
    effect: BlessingEffect,
    dict: BlessingDictionaries,
    kindLabel?: KindLabel,
): string => {
    const params = effect.params ?? [];
    switch (effect.kind) {
        case KIND_BLESSING_STAT: {
            const stat = lookup(dict.stats, params[0], '能力值');
            return params[1] ? `${stat} +${params[1]}%` : stat;
        }
        case KIND_RACE_ATTACK:
            return `对${lookup(dict.species, params[0], '种族')}伤害 +${params[1] ?? 0}%`;
        case KIND_RACE_RESIST:
            return `受${lookup(dict.species, params[0], '种族')}伤害 ${params[1] ?? 0}%`;
        case KIND_ATTRIBUTE_ATTACK:
            return `${lookup(dict.attributes, params[1], '属性')}属性伤害 +${params[0] ?? 0}%`;
        default: {
            const values = params.filter((value) => value !== 0);
            return values.length ? `${kindText(effect, kindLabel)} ${values.join(' / ')}` : kindText(effect, kindLabel);
        }
    }
};

/**
 * 详情里的效果行：一个参数一行，效果名放在每行开头（技能详情的「项目」列写法）。
 * `20003` 这种带 kind 小标签的样式由组件负责渲染。
 */
export const effectRows = (
    effect: BlessingEffect,
    dict: BlessingDictionaries,
    kindLabel?: KindLabel,
): BlessingEffectRow[] => {
    const params = effect.params ?? [];
    const group = kindText(effect, kindLabel);
    const row = (name: string, value: string): BlessingEffectRow => ({
        kind: effect.kind,
        group,
        name,
        value,
    });

    switch (effect.kind) {
        case KIND_BLESSING_STAT:
            return [
                row('能力值', lookup(dict.stats, params[0], '能力值')),
                row('加成', `${params[1] ?? 0}%`),
            ];
        case KIND_RACE_ATTACK:
            return [
                row('种族', lookup(dict.species, params[0], '种族')),
                row('伤害加成', `+${params[1] ?? 0}%`),
            ];
        case KIND_RACE_RESIST:
            return [
                row('种族', lookup(dict.species, params[0], '种族')),
                row('伤害减免', `${params[1] ?? 0}%`),
            ];
        case KIND_ATTRIBUTE_ATTACK:
            return [
                row('属性', lookup(dict.attributes, params[1], '属性')),
                row('伤害加成', `+${params[0] ?? 0}%`),
            ];
        default:
            // 其余 kind 解不出参数名，按下标显示（没有参数时也留一行，写明效果名）
            if (!params.length) return [row('—', '')];
            return params.map((value, index) => row(`参数${index + 1}`, String(value)));
    }
};

/** 一行里把几个效果连起来 */
export const effectSummary = (
    effects: BlessingEffect[],
    dict: BlessingDictionaries,
    kindLabel?: KindLabel,
): string => effects.map((effect) => effectLabel(effect, dict, kindLabel)).join('；');
