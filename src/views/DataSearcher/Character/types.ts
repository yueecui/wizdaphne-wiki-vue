import type { ELEMENT_TYPE, FATE_TYPE, GENDER_TYPE, RACE_TYPE, RARITY_TYPE } from '../data/enum';

export interface ICharacterFilter {
    searchText: string;
    element: ELEMENT_TYPE | '';
    race: RACE_TYPE | '';
    gender: GENDER_TYPE | '';
    rarity: RARITY_TYPE | '';
    fate: FATE_TYPE | '';
    class: (string | '特殊' | '')[];
    onlyPrimary: boolean; // 只检查主职业
}
