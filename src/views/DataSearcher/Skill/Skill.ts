import type { ISkill } from '../data/SearcherData.types';
import type { ISkillFilter } from './types';

export class Skill {
    constructor(public data: ISkill) {}

    isMatch(filter: ISkillFilter): boolean {
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
        if (filter.type) {
            if (!(this.data.type === filter.type)) {
                return false;
            }
        }
        return true;
    }
}
