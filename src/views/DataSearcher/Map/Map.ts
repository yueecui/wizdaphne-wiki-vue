import type { IMap } from './types';

export class Map {
    constructor(public data: IMap) {}

    // 获取索引
    get index(): number {
        return this.data.index;
    }

    // 获取名称
    get name(): string {
        return this.data.name;
    }

    // 获取简称
    get shortName(): string {
        return this.data.name_s;
    }

    // 获取等级
    get level(): number {
        return this.data.level;
    }

    // 获取图片
    get images(): string[] {
        return this.data.image;
    }

    // 获取图片标签
    get imageLabels(): string[] {
        return this.data.image_label;
    }

    // 获取敌人列表
    get enemies(): string[] {
        return this.data.enemy;
    }

    set enemies(value: string[]) {
        this.data.enemy = value;
    }

    // 获取无遗物敌人列表
    get noRelicEnemies(): string[] {
        return this.data.no_relic_enemy;
    }

    set noRelicEnemies(value: string[]) {
        this.data.no_relic_enemy = value;
    }

    // 获取注释
    get comment(): string | undefined {
        return this.data.comment;
    }

    set comment(value: string | undefined) {
        this.data.comment = value;
    }

    // 检查是否包含搜索文本
    containsSearchText(searchText: string): boolean {
        if (!searchText) return true;

        const lowerSearchText = searchText.toLowerCase();
        return (
            this.name.toLowerCase().includes(lowerSearchText) ||
            this.shortName.toLowerCase().includes(lowerSearchText) ||
            this.enemies.some((e) => e.toLowerCase().includes(lowerSearchText))
        );
    }
}
