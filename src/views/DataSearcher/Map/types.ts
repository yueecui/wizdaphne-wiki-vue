export interface IMap {
    index: number;
    name: string;
    name_s: string;
    cate: string;
    level: number;
    image: string[];
    image_label: string[];
    enemy: string[];
    no_relic_enemy: string[];
    drop: string[];
    junk: string[];
    junk_code: string[];
    comment?: string;
}

export interface IMapFilter {
    searchText: string;
    category: string;
}
