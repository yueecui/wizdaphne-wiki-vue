import type { ICharacter } from './data/SearcherExposeData.types';
import type { IDataSearcherFilter } from './dataSearcher.type';

export class Character {
    constructor(public data: ICharacter) {}

    // 是否满足过滤器
    isMatch(filter: IDataSearcherFilter): boolean {
        if (filter.searchText) {
            let found = false;
            if (this.data.name.includes(filter.searchText)) {
                found = true;
            }
            if (this.data.name_en.includes(filter.searchText)) {
                found = true;
            }
            if (this.data.name_jp.includes(filter.searchText)) {
                found = true;
            }
            if (!found) {
                return false;
            }
        }
        if (filter.rarity && this.data.rarity !== filter.rarity) {
            return false;
        }
        if (filter.element && this.data.element !== filter.element) {
            return false;
        }
        if (filter.gender && this.data.gender !== filter.gender) {
            return false;
        }
        if (filter.race && this.data.race !== filter.race) {
            return false;
        }
        if (filter.fate && this.data.fate_type !== filter.fate) {
            return false;
        }
        if (filter.onlyPrimary) {
            if (filter.class[0] && this.data.class[0] !== filter.class[0]) {
                return false;
            }
        } else {
            let matchCount = 0;
            for (let i = 0; i < filter.class.length; i++) {
                if (this.data.class.includes(filter.class[i])) {
                    matchCount++;
                }
            }
            if (matchCount !== filter.class.length) {
                return false;
            }
        }
        return true;
    }
}
