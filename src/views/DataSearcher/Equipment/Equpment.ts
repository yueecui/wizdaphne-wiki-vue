import type { IEquipmentBase, IEquipmentFilter, IEquipmentStat, IEquipmentStatLevel } from './types';

export class Equipment {
    constructor(
        public data: IEquipmentBase,
        public levels: IEquipmentStatLevel[],
    ) {}

    isMatch(filter: IEquipmentFilter): boolean {
        if (filter.searchText) {
            let found = false;
            if (this.data.n.includes(filter.searchText)) {
                found = true;
            }
            if (this.data.njp && this.data.njp.includes(filter.searchText)) {
                found = true;
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

        return true;
    }

    getCategoryIndex(): number {
        return EQUIPMENT_CATEGORY_SOFT_INDEX_MAP[this.data.sub] ?? 9999;
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
        const statBaseValue = BASE_STAT_BY_SUBCATEGORY[this.data.sub][stat] ?? 0;
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
}

const EQUIPMENT_CATEGORY_SOFT_INDEX_MAP = {
    短剑: 1,
    单手剑: 2,
    单手斧: 3,
    单手钝器: 4,
    单手杖: 5,
    投掷忍具: 6,
    忍者刀: 7,
    刀: 8,
    双手剑: 9,
    双手斧: 10,
    双手钝器: 11,
    双手枪: 12,
    双手杖: 13,
    弓: 14,
    工具: 15,
    帽子: 101,
    轻盔: 102,
    重盔: 103,
    手套: 104,
    护手: 105,
    臂铠: 106,
    衣服: 107,
    轻铠: 108,
    重铠: 109,
    小盾: 110,
    轻盾: 111,
    重盾: 112,
    靴: 113,
    护腿: 114,
    足铠: 115,
    饰品: 116,
};

export const WEAPON_SORT_ORDER = (() => {
    const weapons = Object.keys(EQUIPMENT_CATEGORY_SOFT_INDEX_MAP).filter(
        (key) => EQUIPMENT_CATEGORY_SOFT_INDEX_MAP[key] < 100,
    );
    const weaponSortOrder = weapons.map((key) => {
        return {
            name: key,
            index: EQUIPMENT_CATEGORY_SOFT_INDEX_MAP[key],
        };
    });
    weaponSortOrder.sort((a, b) => a.index - b.index);
    return weaponSortOrder.map((item) => item.name);
})();

export const ARMOR_SORT_ORDER = (() => {
    const armors = Object.keys(EQUIPMENT_CATEGORY_SOFT_INDEX_MAP).filter(
        (key) => EQUIPMENT_CATEGORY_SOFT_INDEX_MAP[key] >= 100,
    );
    const armorSortOrder = armors.map((key) => {
        return {
            name: key,
            index: EQUIPMENT_CATEGORY_SOFT_INDEX_MAP[key],
        };
    });
    armorSortOrder.sort((a, b) => a.index - b.index);
    return armorSortOrder.map((item) => item.name);
})();

const BASE_STAT_BY_SUBCATEGORY: Record<string, IEquipmentStat> = {
    短剑: {
        c: 2,
        spe: 4,
        acc: 15,
        eva: 2,
    },
    单手剑: {
        c: 2,
        acc: 10,
        eva: 2,
    },
    单手斧: {
        acc: 6,
    },
    单手钝器: {
        acc: 4,
        sur: -4,
        eva: 2,
    },
    单手杖: {
        eva: 2,
    },
    投掷忍具: {
        c: 2,
        def: -1,
        mdef: -1,
        acc: -6,
        sur: 1,
    },
    忍者刀: {
        def: -1,
        mdef: -1,
        spe: 1,
        sur: 3,
        eva: 3,
    },
    刀: {
        c: 2,
        acc: 6,
    },
    双手剑: {
        spe: -4,
        acc: 6,
        eva: -2,
    },
    双手斧: {
        spe: -8,
        eva: -6,
    },
    双手钝器: {
        spe: -8,
        sur: -4,
        eva: -6,
    },
    双手枪: {
        acc: 10,
        eva: 4,
    },
    双手杖: {
        eva: -4,
    },
    弓: {
        acc: 4,
    },
    工具: {},
    帽子: {
        res: 4,
    },
    轻盔: {
        spe: -1,
        acc: -2,
        eva: -2,
        res: 4,
    },
    重盔: {
        spe: -2,
        acc: -2,
        eva: -4,
        res: 4,
    },
    手套: {
        acc: 2,
    },
    护手: {},
    臂铠: {
        acc: -2,
    },
    衣服: {},
    轻铠: {
        spe: -1,
        acc: -2,
        eva: -2,
    },
    重铠: {
        spe: -2,
        acc: -2,
        eva: -4,
    },
    小盾: {},
    轻盾: {},
    重盾: {
        spe: -1,
        acc: -2,
        eva: -2,
    },
    靴: {
        spe: 2,
        eva: 2,
    },
    护腿: {},
    足铠: {
        spe: -1,
        eva: -2,
    },
    饰品: {},
};
