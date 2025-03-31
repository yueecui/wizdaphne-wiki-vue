import { BookIconData } from '../types/database/book';
import { CharacterIconData } from '../types/database/character';
import { ItemIconData } from '../types/database/item';
import { LightconeIconData } from '../types/database/lightcone';
import { MonsterIconData } from '../types/database/monster';
import { RelicsIconData } from '../types/database/relics';

/** 更新查询的返回包 */
interface FetchUpdateResponse {
    version: number;
    data?: {
        character: CharacterIconData[];
        lightcone: LightconeIconData[];
        item: ItemIconData[];
        relics: RelicsIconData[];
        book: BookIconData[];
        monster: MonsterIconData[];
    };
}

/**
 * 从服务器请求，获取图标用的数据，主要用于更新indexDB，也可以直接单独拉取某一类数据生成
 * @returns 返回更新数据
 **/
export const fetchAllData = async (
    version: number,
    type?: 'character' | 'lightcone' | 'character' | 'relics' | 'book' | 'monster' | 'all',
): Promise<FetchUpdateResponse> => {
    const requestUrl = [
        '/api.php?action=lua',
        'module=Api/GetAllIconData',
        'format=json',
        'utf8=1',
        'version=' + version,
        'test=11',
    ];

    if (type) {
        requestUrl.push('type=' + type);
    }
    const response = await fetch(requestUrl.join('&'));
    const data: FetchUpdateResponse = await response.json();
    if (data.data && data.data.book) {
        data.data.book.map((book: BookIconData) => {
            book.collectable = (book.collectable as unknown) === '';
        });
    }
    return data;
};
