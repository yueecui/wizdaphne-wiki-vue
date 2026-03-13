export interface IEquipmentFilter {
    searchText: string;
    category: string;
    skill: string;
    showMaxLv: boolean;
    soucateFilter?: 'all' | 'show' | 'hide';
}

// 配置文件
export interface IEquipmentJson {
    equipments: IEquipmentBase[];
    levels: Record<string, IEquipmentStatLevel[]>;
    skill: IEquipmentSkill[];
    bonus: Array<[name: string, rates: Array<Array<number>>]>;
    baseStat: Record<string, IEquipmentBaseStat & { i: number }>; // key是装备类型，i是排序用索引
}

export type IEquipmentBase = IEquipmentBaseStat & {
    id: number;
    n: string;
    njp: string;
    ba?: string;
    cate: string;
    sub: string;
    t: number;
    sk?: string[];
    csk?: string[];
    desc?: string;
    req?: string[];
    soucate: number;
    sou?: string[];
};

export interface IEquipmentBaseStat {
    atk?: number;
    c?: number;
    mag?: number;
    div?: number;
    def?: number;
    mdef?: number;
    spe?: number;
    acc?: number;
    sur?: number;
    eva?: number;
    res?: number;
    esur?: number;
    det?: number;
    dtrap?: number;
    etrap?: number;
}

export type IEquipmentStatLevel = IEquipmentStat & {
    lv: number;
};

export interface IEquipmentStat {
    atk?: number;
    c?: number; // 攻击次数
    mag?: number;
    div?: number;
    def?: number;
    mdef?: number;
    spe?: number;
    acc?: number;
    sur?: number;
    eva?: number;
    res?: number;
}

export interface IEquipmentSkill {
    n: string;
    d: string;
}
