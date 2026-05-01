import type { IEquipmentBase, IEquipmentBaseStat, IEquipmentFilter, IEquipmentStatLevel } from './types';

export class Equipment {
    public sort: number;
    public bonus: Array<Array<number>> | null = null;
    public static baseStats: Record<string, IEquipmentBaseStat & { i: number }> = {};

    constructor(
        public data: IEquipmentBase,
        public levels: IEquipmentStatLevel[] = [],
    ) {
        this.sort = this.getCategoryIndex();
    }

    setBonusData(bonusData: Array<Array<number>> | null) {
        this.bonus = bonusData;
    }

    isMatch(filter: IEquipmentFilter): boolean {
        if (filter.searchText) {
            let found = false;
            if (this.data.n.includes(filter.searchText)) {
                found = true;
            }
            if (this.data.njp && this.data.njp.includes(filter.searchText)) {
                found = true;
            }
            // 添加ID搜索功能，ID必须>0且<8000
            const searchId = parseInt(filter.searchText);
            if (!isNaN(searchId) && searchId > 0 && searchId < 8000) {
                // 检查id字段是否存在且匹配
                if (this.data.id !== undefined && this.data.id === searchId) {
                    found = true;
                }
            }
            if (!found) {
                return false;
            }
        }
        if (filter.category) {
            if (!(this.data.sub === filter.category)) {
                return false;
            }
        }
        if (filter.skill) {
            let found = false;
            if (this.data.sk) {
                this.data.sk.forEach((skill) => {
                    // 名字中包含就可以
                    if (skill.includes(filter.skill)) {
                        found = true;
                    }
                });
            }
            if (this.data.csk) {
                this.data.csk.forEach((skill) => {
                    // 名字中包含就可以
                    if (skill.includes(filter.skill)) {
                        found = true;
                    }
                });
            }
            if (!found) {
                return false;
            }
        }

        // 特典过滤
        if (filter.soucateFilter === 'show') {
            if (this.data.soucate !== 9) {
                return false;
            }
        } else if (filter.soucateFilter === 'hide') {
            if (this.data.soucate === 9) {
                return false;
            }
        }

        // 妖精过滤
        if (filter.fairyFilter) {
            const fairyCan = this.data.fa_can ?? 0;
            if (filter.fairyFilter === '0') {
                if (fairyCan !== 0) return false;
            } else if (filter.fairyFilter === '1') {
                if (fairyCan !== 1 && fairyCan !== 2) return false;
            } else if (filter.fairyFilter === '2') {
                if (fairyCan !== 2) return false;
            }
        }

        // 妖精技能过滤
        if (filter.fairySkillFilter) {
            const fairySkill = this.data.fa_sk ?? '';
            if (!fairySkill.includes(filter.fairySkillFilter)) {
                return false;
            }
        }

        return true;
    }

    getCategoryIndex(): number {
        const baseStat = Equipment.baseStats[this.data.sub];
        return baseStat?.i ?? 9999;
    }

    getValue(stat: string, level = 0): number | null {
        if (level === 0) {
            return this.data[stat] ?? 0;
        } else {
            const levelStat = this.levels.find((item) => item.lv === level);
            if (levelStat) {
                return levelStat[stat] ?? 0;
            } else {
                return null;
            }
        }
    }

    getLvZeroStatColorClass(stat: string): string {
        if (!stat) return '';
        if (this.data.sub === '工具') return '';
        const statValue = this.data[stat];
        const baseStat =
            Equipment.baseStats[`${this.data.sub}R${this.data.t}`] ?? Equipment.baseStats[`${this.data.sub}`];
        const statBaseValue = baseStat?.[stat] ?? 0;
        if (statBaseValue === -1) {
            //表示不参与比较的数值类型
            return '';
        }
        if (this.data.cate === '武器') {
            if (stat === 'atk' && statValue > 0) return ''; // 武器的atk不参与比较
            if (stat === 'c' && statValue === 1) return ''; // 武器的c默认为1
            if (stat === 'mag' && statValue > 0) return ''; // 武器的mag不参与比较
            if (stat === 'div' && statValue > 0) return ''; // 武器的div不参与比较
        } else if (this.data.cate !== '武器') {
            if (stat === 'def' && statValue > 0) return '';
            if (stat === 'mdef' && statValue > 0) return ''; // 防具的mdef不参与比较
        }
        if (statValue > statBaseValue) {
            return 'text-green-400';
        } else if (statValue < statBaseValue) {
            return 'text-red-400';
        }
        if (statBaseValue === 0) {
            return 'text-gray-700';
        }
        return '';
    }

    getLvStatColorClass(stat: string, level: number): string {
        if (!stat) return '';
        const statValueMax = this.getValue(stat, level);
        if (statValueMax === null) return 'text-gray-700';

        const statValueZero = this.getValue(stat, 0) ?? 0;

        const diff = statValueMax - statValueZero;

        if (this.data.cate === '武器') {
            // if (stat === 'atk' && diff > 0) return ''; // 武器的atk不参与比较
            if (stat === 'c' && diff === 1) return ''; // 武器的c默认为1
            // if (stat === 'mag' && diff > 0) return ''; // 武器的mag不参与比较
            // if (stat === 'div' && diff > 0) return ''; // 武器的div不参与比较
        } else if (this.data.cate !== '武器') {
            // if (stat === 'def' && diff > 0) return '';
            // if (stat === 'mdef' && diff > 0) return ''; // 防具的mdef不参与比较
        }
        if (diff > 0) {
            return 'text-green-400';
        } else if (diff < 0) {
            return 'text-red-400';
        }
        if (statValueZero === 0) {
            return 'text-gray-700';
        }
        return '';
    }

    get fairyCan(): number {
        return this.data.fa_can ?? 0;
    }

    get fairySkill(): string {
        return this.data.fa_sk ?? '';
    }
}
