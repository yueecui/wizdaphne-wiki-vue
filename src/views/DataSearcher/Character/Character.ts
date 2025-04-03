import { COMMON_CLASS } from '../data/enum';
import type { ICharacter } from '../data/SearcherExposeData.types';
import type { ICharacterFilter } from './types';

export class Character {
    constructor(public data: ICharacter) {}

    // 是否满足过滤器
    isMatch(filter: ICharacterFilter): boolean {
        if (filter.searchText) {
            let found = false;
            if (this.data.key.includes(filter.searchText)) {
                found = true;
            }
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
        if (filter.personality && this.data.personality !== filter.personality) {
            return false;
        }
        if (filter.race && this.data.race !== filter.race) {
            return false;
        }
        if (filter.fate && this.data.fate_type !== filter.fate) {
            return false;
        }
        if (filter.onlyPrimary) {
            if (filter.class[0] === '特殊') {
                let found = false;
                for (let i = 0; i < this.data.class.length; i++) {
                    if (!COMMON_CLASS.includes(this.data.class[i])) {
                        found = true;
                        break;
                    }
                }
                if (!found) {
                    return false;
                }
            } else if (filter.class[0] && this.data.class[0] !== filter.class[0]) {
                return false;
            }
        } else {
            let matchCount = 0;
            for (let i = 0; i < filter.class.length; i++) {
                if (filter.class[i] === '特殊') {
                    let found = false;
                    for (let j = 0; j < this.data.class.length; j++) {
                        if (!COMMON_CLASS.includes(this.data.class[j])) {
                            found = true;
                            break;
                        }
                    }
                    if (found) {
                        matchCount++;
                    }
                }
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

    // 发布时间
    get releaseDate() {
        // 格式为 YYYY-MM-DD，需要转为时间戳
        const date = this.data.release_date.split('-');
        const year = parseInt(date[0]);
        const month = parseInt(date[1]) - 1; // 月份从0开始
        const day = parseInt(date[2]);
        const releaseDate = new Date(year, month, day);
        return releaseDate;
    }

    get rarityNumber() {
        if (this.data.rarity === '传说') {
            return 3;
        } else if (this.data.rarity === '一般') {
            return 2;
        } else {
            return 1;
        }
    }
}
