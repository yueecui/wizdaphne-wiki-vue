import type { IEquipment, IEquipmentFilter } from './types';

export class Equipment {
    public enhances: IEquipment[] = [];

    constructor(
        public data: IEquipment,
        enhances?: IEquipment[],
    ) {
        if (enhances) {
            this.enhances = enhances;
        }
    }

    isMatch(filter: IEquipmentFilter): boolean {
        if (filter.searchText) {
            let found = false;
            if (this.data.name.includes(filter.searchText)) {
                found = true;
            }
            if (this.data.name_en && this.data.name_en.includes(filter.searchText)) {
                found = true;
            }
            if (this.data.name_jp && this.data.name_jp.includes(filter.searchText)) {
                found = true;
            }
            if (!found) {
                return false;
            }
        }
        if (filter.category) {
            if (!(this.data.category === filter.category)) {
                return false;
            }
        }

        return true;
    }

    getCategoryIndex(): number {
        return EQUIPMENT_CATEGORY_SOFT_INDEX_MAP[this.data.subcategory] ?? 9999;
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
