import type { ELEMENT_TYPE, FATE_TYPE, GENDER_TYPE, PERSONALITY_TYPE, RACE_TYPE, RARITY_TYPE } from './enum';

export interface ISearcherExposeData {
    character: ICharacter[];
    characterConfig: {
        CLASS_STAT_CONFIG: Record<string, Partial<ICharacterStats>>;
        ELEMNET_STAT_CONFIG: Record<ELEMENT_TYPE, Partial<ICharacterStats>>;
        GENDER_STAT_CONFIG: Record<GENDER_TYPE, Partial<ICharacterStats>>;
        RACE_STAT_CONFIG: Record<RACE_TYPE, Partial<ICharacterStats>>;
    };
    // class: IClass[];
    skill: ISkill[];
    standardClass: string[];
    jobMultiplier: IJobMultiplier[];
    characterRates: ICharacterRate[];
}

export interface ICharacterRate {
    name: string;
    str: number;
    iq: number;
    pie: number;
    vit: number;
    spe: number;
    dex: number;
    luck: number;
    rstr: number;
    riq: number;
    rpie: number;
    rvit: number;
    rspe: number;
    rdex: number;
    rluck: number;
    rbase: number;
}

export interface IJobMultiplier {
    job: string; // 职业名
    atk: number; // 攻击力
    mag: number; // 魔力
    div: number; // 神力
    acc: number; // 命中
    sur: number; // 会心
    def: number; // 防御力
    mdef: number; // 法术防御力
    eva: number; // 回避
    res: number; // 抵抗
    det: number; // 探知
    dtrap: number; // 陷阱解除
    etrap: number; // 陷阱回避
    speed: number; // 行动速度
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

export interface TabxDate {
    date: string; // "2024-10-14"
    milliseconds: number;
    time: string; // "16:00:00"
}

export interface ICharacter {
    index: number;
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
    class: string[];
    passive_skill: string;
    unique_skill: string[];
    inherit_skill: string;
    inherit_skill2?: string;
    discipline_skill: string;
    discipline_tags: string[];
    release_date: TabxDate;
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
    index: number;
    name: string;
    name_jp?: string;
    name_en?: string;
    description: string;
    upgrade_description?: string;
    required_class: string[];
    required_weapon_range: string[];
    cost_type?: string;
    cost_value?: number;
    category: string;
    type: string;
    element?: ELEMENT_TYPE;
    max_level: number;
    page_title?: string;
    active_tags: string[];
    passive_tags: string[];
}
