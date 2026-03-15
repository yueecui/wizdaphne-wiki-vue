export interface IMap {
    index: number;
    name: string;
    name_s: string;
    level: number;
    image: string[];
    image_label: string[];
    enemy: string[];
    no_relic_enemy: string[];
    comment?: string;
}

export interface IMapFilter {
    searchText: string;
}
