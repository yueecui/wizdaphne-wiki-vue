import { clone } from 'lodash-es';
import { getData } from '../../../util/getData';
import { Character } from '../Character/Character';
import { Skill } from '../Skill/Skill';
import type { ICharacterStats, ISearcherExposeData } from './SearcherExposeData.types';

// 写在页面里的数据
export class SearcherExposeData {
    private static instance: SearcherExposeData;
    public data: ISearcherExposeData;

    private constructor() {
        this.data = getData<ISearcherExposeData>('DATA');
    }

    static getInstance() {
        if (!this.instance) {
            this.instance = new SearcherExposeData();
        }
        return this.instance;
    }

    public calculateStats(data: { race: string; gender: string; element: string; class: string }) {
        const stats: ICharacterStats = {
            strength: 10,
            intelligence: 10,
            piety: 10,
            vitality: 10,
            dexterity: 10,
            speed: 10,
            luck: 10,
        };

        const classStats = this.data.characterConfig.CLASS_STAT_CONFIG[data.class] ?? {};
        const elementStats = this.data.characterConfig.ELEMNET_STAT_CONFIG[data.element] ?? {};
        const genderStats = this.data.characterConfig.GENDER_STAT_CONFIG[data.gender] ?? {};
        const raceStats = this.data.characterConfig.RACE_STAT_CONFIG[data.race] ?? {};

        // 计算属性
        const result = [classStats, elementStats, genderStats, raceStats].reduce((acc, stat) => {
            Object.keys(stat).forEach((key) => {
                acc[key] = (acc[key] as number) + (stat[key] as number);
            });
            return acc;
        }, stats);

        return result as ICharacterStats;
    }

    public getCharacterList() {
        return this.data.character.map((character) => new Character(character));
    }

    public getCharacterData(characterKey: string) {
        return this.data.character.find((character) => character.key === characterKey);
    }

    public getSkillList() {
        return this.data.skill.map((skill) => new Skill(skill));
    }

    public getSkillData(skillName: string) {
        return this.data.skill.find((skill) => skill.name === skillName);
    }

    public getStatSet(kind: string) {
        if (kind === 'race') {
            return this.data.characterConfig.RACE_STAT_CONFIG;
        } else if (kind === 'gender') {
            return this.data.characterConfig.GENDER_STAT_CONFIG;
        } else if (kind === 'element') {
            return this.data.characterConfig.ELEMNET_STAT_CONFIG;
        } else if (kind === 'class') {
            return this.data.characterConfig.CLASS_STAT_CONFIG;
        } else {
            return null;
        }
    }

    public getAllClass() {
        const classList = clone(this.data.standardClass);
        for (const key in this.data.characterConfig.CLASS_STAT_CONFIG) {
            if (!classList.includes(key)) {
                classList.push(key);
            }
        }
        return classList;
    }
}
