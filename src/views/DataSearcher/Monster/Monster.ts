import type { IMonster } from './types';

// 自动弱点映射
const weaknessMap: Record<string, string> = {
    火: '水',
    水: '土',
    土: '风',
    风: '火',
    光: '暗',
    暗: '光',
};

export class Monster {
    constructor(public data: IMonster) {}

    // 获取ID
    get id(): number {
        return this.data.id;
    }

    // 获取ID显示文本
    get idText(): string {
        if (this.id > 10000) return 'Ex';
        return this.id.toString();
    }

    // 获取名称
    get name(): string {
        return this.data.name;
    }

    // 获取种族
    get race(): string {
        return this.data.race;
    }

    // 获取属性
    get element(): string {
        if (!this.data.element) return '-';
        return this.data.element;
    }

    // 获取弱点
    get weakness(): string[] {
        const weakness: string[] = [];
        if (weaknessMap[this.element]) {
            weakness.push(weaknessMap[this.element]);
        }
        weakness.push(...this.data.weakness);
        return weakness;
    }

    // 获取注释
    get comment(): string | undefined {
        return this.data.comment;
    }

    set comment(value: string | undefined) {
        this.data.comment = value;
    }

    // 获取遗物
    get relic(): string | undefined {
        return this.data.relic;
    }

    // 获取SP类型
    get spType(): number {
        return this.data.sp_type;
    }

    // 检查是否包含搜索文本
    containsSearchText(searchText: string): boolean {
        if (!searchText) return true;

        const lowerSearchText = searchText.toLowerCase();

        // 如果搜索词是数字且怪物ID不大于10000，尝试完全匹配ID
        const searchNumber = parseInt(lowerSearchText);
        if (!isNaN(searchNumber) && this.id < 10000 && this.id === searchNumber) {
            return true;
        }

        return (
            this.name.toLowerCase().includes(lowerSearchText) ||
            this.race.toLowerCase().includes(lowerSearchText) ||
            this.element.toLowerCase().includes(lowerSearchText)
        );
    }

    // 检查是否匹配种族过滤
    matchesRace(race: string): boolean {
        if (!race) return true;
        if (race === '未知') return this.race === '？';
        return this.race === race;
    }

    // 检查是否匹配属性过滤
    matchesElement(element: string): boolean {
        if (!element) return true;
        if (element === '无') {
            return !this.data.element;
        }
        if (element === '未知') {
            return this.data.element === '？';
        }
        return this.data.element === element;
    }

    // 检查是否匹配弱点过滤
    matchesWeakness(weakness: string): boolean {
        if (!weakness) return true;
        return this.weakness.some((w) => w === weakness);
    }
}
