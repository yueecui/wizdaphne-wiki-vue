import type { IMap } from './types';

export class GameMap {
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
        return this.data.level ?? 0;
    }

    set level(value: number) {
        this.data.level = value;
    }

    get levelText(): string {
        if (this.level === 0) return '?';
        if (this.level === -1) return '无';
        if (this.level === -2) return '动态';
        return this.level.toString();
    }

    // 获取分类
    get category(): string {
        return this.data.cate;
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
    get backEnemies(): string[] {
        return this.data.back ?? [];
    }

    set backEnemies(value: string[]) {
        this.data.back = value;
    }

    // 精英敌人列表
    get rLvPlus1Enemies(): string[] {
        return this.data.rlv1 ?? [];
    }

    set rLvPlus1Enemies(value: string[]) {
        this.data.rlv1 = value;
    }

    // boss敌人列表
    get bossEnemies(): string[] {
        return this.data.boss ?? [];
    }

    set bossEnemies(value: string[]) {
        this.data.boss = value;
    }

    // 获取遗物等级
    get rlv(): number {
        return this.data.rlv ?? 0;
    }

    set rlv(value: number) {
        this.data.rlv = value;
    }

    get rlvText(): string {
        if (this.rlv === 0) return '？';
        return `★${this.rlv.toString()}`;
    }

    // 获取掉落列表
    // 获取掉落列表
    get drops(): string[] {
        return this.data.drop;
    }

    set drops(value: string[]) {
        this.data.drop = value;
    }

    // 获取 junk 列表
    get junk(): string[] {
        return this.data.junk;
    }

    // 获取 junk 代码列表
    get junkCodes(): string[] {
        return this.data.junk_code;
    }

    setJunks(value: { name: string; uniqueCode: string }[]) {
        this.data.junk = value.map((j) => j.name);
        this.data.junk_code = value.map((j) => j.uniqueCode);
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
