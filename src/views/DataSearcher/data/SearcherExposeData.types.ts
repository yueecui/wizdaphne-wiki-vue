import type { ELEMENT_TYPE, FATE_TYPE, GENDER_TYPE, PERSONALITY_TYPE, RACE_TYPE, RARITY_TYPE } from './enum';

export interface ISearcherExposeData {
    character: ICharacter[];
    characterConfig: {
        CLASS_STAT_CONFIG: Record<string, Partial<ICharacterStats>>;
        ELEMNET_STAT_CONFIG: Record<ELEMENT_TYPE, Partial<ICharacterStats>>;
        GENDER_STAT_CONFIG: Record<GENDER_TYPE, Partial<ICharacterStats>>;
        RACE_STAT_CONFIG: Record<RACE_TYPE, Partial<ICharacterStats>>;
    };
    class: IClass[];
    skill: ISkill[];
    standardClass: string[];
}

export interface ICharacterStats {
    strength: number;
    intelligence: number;
    piety: number;
    vitality: number;
    dexterity: number;
    speed: number;
    luck: number;
}

export interface ICharacter {
    key: string;
    name: string;
    name_jp: string;
    name_en: string;
    style: string;
    rarity: RARITY_TYPE;
    race: RACE_TYPE;
    gender: GENDER_TYPE;
    element: ELEMENT_TYPE;
    personality: PERSONALITY_TYPE;
    fate_type: FATE_TYPE;
    stats: ICharacterStats;
    class: string[];
    passive_skill: string;
    unique_skill: string[];
    inherit_skill: string;
    discipline_skill: string;
    release_date: string;
}

export interface IClass {
    name: string;
    name_jp: string;
    name_en: string;
    type: '基本' | '上级' | '联动';
    available_weapon: string[];
    available_armor: string[];
    multipliers: {
        attack_power: number;
        magic_power: number;
        divine_power: number;
        defense: number;
        magic_defense: number;
        detect: number;
        disarm_trap: number;
        evade_trap: number;
        action_speed: number;
        accuracy: number;
        evasion: number;
        resistance: number;
    };
    skills: {
        name: string;
        level: number;
    }[];
}

export interface ISkill {
    name: string;
    name_jp: string;
    name_en: string;
    description: string;
    upgrade_description: string;
    required_class: string[];
    required_weapon_range: string[];
    tags: string[];
    category: string;
    element: '默认' | ELEMENT_TYPE;
    max_level: number;
    page_title: string;
    levels: {
        level: number;
        mp: number;
        sp: number;
        description: string;
    }[];
}
