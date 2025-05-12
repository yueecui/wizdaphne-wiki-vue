export interface IEquipmentFilter {
    searchText: string;
    category: string;
    skill: string;
    showMaxLv: boolean;
}

// 配置文件
export interface IEquipmentJson {
    equipments: IEquipmentBase[];
    levels: Record<string, IEquipmentStatLevel[]>;
    skill: IEquipmentSkill[];
}

export interface IEquipmentBase {
    n: string;
    njp: string;
    ba?: string;
    cate: string;
    sub: string;
    t: number;
    atk: number;
    c: number; // 攻击次数
    mag: number;
    div: number;
    def: number;
    mdef: number;
    spe: number;
    acc: number;
    sur: number;
    eva: number;
    res: number;
    sk?: string[];
    csk?: string[];
    desc?: string;
    req?: string;
    sou?: string[];
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
