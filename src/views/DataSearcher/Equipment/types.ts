export interface IEquipmentFilter {
    searchText: string;
    category: string;
}

// 配置文件
export interface IEquipmentJson {
    equipments: IEquipment[];
}

export interface IEquipment {
    name: string;
    name_jp: string;
    name_en: string;
    category: string;
    subcategory: string;
    tier: number;
    enhance_level: number;
    attack_power: number;
    attack_count: number;
    magic_power: number;
    divine_power: number;
    defense: number;
    magic_defense: number;
    action_speed: number;
    accuracy: number;
    surety: number;
    evasion: number;
    resistance: number;
    skills?: string[];
    category_skills?: string[];
    description?: string;
    required_class?: string[];
    sources?: string[];
}
