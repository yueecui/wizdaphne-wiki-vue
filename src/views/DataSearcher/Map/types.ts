export interface IMap {
    index: number;
    name: string;
    name_s: string;
    cate: string;
    image: string[];
    image_label: string[];
    level: number;
    rlv: number;
    enemy: string[];
    back: string[];
    rlv1: string[];
    rlv2: string[];
    boss: string[];
    drop: string[];
    junk: string[];
    junk_code: string[];
    comment?: string;
}

export interface IMapFilter {
    searchText: string;
    category: string;
}
