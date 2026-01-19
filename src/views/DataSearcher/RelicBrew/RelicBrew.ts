import { IRelicBrew } from './types';

// 提升、降低的字段顺序
export const STAT_ORDER = [
    'HP',
    'MP',
    'SP',
    '攻击力',
    '魔力',
    '神力',
    '防御力',
    '法术防御力',
    '抵抗',
    '行动速度',
    '命中',
    '会心',
    '回避',
    '探知',
    '陷阱解除',
    '陷阱回避',
    '火耐性',
    '水耐性',
    '土耐性',
    '风耐性',
    '光耐性',
    '暗耐性',
    '全耐性',
    '暴击耐性',
];

export const STAT_DISPLAY_NAME_MAP = {
    全耐性: '全属性耐性',
};

export class RelicBrew {
    private data: IRelicBrew;

    constructor(data: IRelicBrew) {
        this.data = data;
    }

    // 获取怪物名称
    get monster(): string {
        return this.data.monster;
    }

    // 获取力量名称
    get power(): string {
        return this.data.power;
    }

    // 获取性格
    get align(): string {
        return this.data.align;
    }

    // 获取索引
    get index(): number {
        return this.data.i;
    }

    // 获取遗物酒名称
    get name(): string {
        return this.data.name;
    }

    // 获取降低的属性数组（按指定顺序排序）
    get dec(): string[] {
        return this.sortStats(this.data.dec);
    }

    // 获取酿造名称
    get brew(): string {
        return this.data.brew;
    }

    // 获取提升的属性数组（按指定顺序排序）
    get inc(): string[] {
        return this.sortStats(this.data.inc);
    }

    // 获取注释
    get comment(): string | undefined {
        return this.data.comment;
    }

    // 根据指定顺序对属性数组进行排序
    private sortStats(stats: string[]): string[] {
        // 创建一个映射，键是属性名，值是排序索引
        const statIndexMap = new Map<string, number>();
        STAT_ORDER.forEach((stat, index) => {
            statIndexMap.set(stat, index);
        });

        // 排序：先按STAT_ORDER中的顺序，不在其中的放在后面
        return [...stats].sort((a, b) => {
            const indexA = statIndexMap.get(a) ?? STAT_ORDER.length;
            const indexB = statIndexMap.get(b) ?? STAT_ORDER.length;
            return indexA - indexB;
        });
    }

    // 检查是否包含搜索文本
    containsSearchText(searchText: string): boolean {
        if (!searchText) return true;

        const lowerSearchText = searchText.toLowerCase();
        return (
            this.name.toLowerCase().includes(lowerSearchText) ||
            this.brew.toLowerCase().includes(lowerSearchText) ||
            this.power.toLowerCase().includes(lowerSearchText)
        );
    }

    // 检查是否匹配性格过滤
    matchesAlign(align: string): boolean {
        if (!align) return true;
        return this.align === align;
    }

    // 检查是否匹配提升属性过滤
    matchesInc(incFilter: string): boolean {
        if (!incFilter) return true;
        return this.inc.some((stat) => stat === incFilter);
    }

    // 检查是否匹配降低属性过滤
    matchesDec(decFilter: string): boolean {
        if (!decFilter) return true;
        return this.dec.some((stat) => stat === decFilter);
    }
}
