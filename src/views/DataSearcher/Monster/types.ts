import type { IMap } from '../Map/types';
import type { IRelicBrew } from '../RelicBrew/types';

export interface IGetMonsterResponse {
    relicbrew_stat_list: string[];
    relicbrew_category: string[];
    monster_race_list: string[];
    relicbrews: IRelicBrew[];
    monsters: IMonster[];
    maps: IMap[];
    map_category: string[];
}

export interface IMonster {
    id: number;
    name: string;
    race: string;
    element?: string;
    weakness: string[];
    comment?: string;
    relic?: string;
    sp_type: number;
}

export interface IMonsterFilter {
    searchText: string;
    race: string;
    element: string;
    weakness: string;
}
