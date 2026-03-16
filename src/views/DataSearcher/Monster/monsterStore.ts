import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../../util';
import { GameMap } from '../Map/Map';
import type { IMap } from '../Map/types';
import { RelicBrew } from '../RelicBrew/RelicBrew';
import type { IRelicBrew } from '../RelicBrew/types';
import { Monster } from './Monster';
import type { IGetMonsterResponse, IMonster } from './types';

export const useMonsterStore = defineStore('monster', () => {
    // 配置数据
    const relicBrews = ref<RelicBrew[]>([]);
    const monsters = ref<Monster[]>([]);
    const maps = ref<GameMap[]>([]);
    const isInit = ref(false);
    const isLoading = ref(false);
    const monsterRaceList = ref<string[]>([]);
    const relicStatList = ref<string[]>([]);
    const reliceCategoryList = ref<string[]>([]);

    // 加载并解析monster.json数据
    const loadAllData = async () => {
        if (isLoading.value || isInit.value) return;

        isLoading.value = true;

        try {
            const response = await fetch(
                IS_DEV
                    ? '/monster.json'
                    : 'https://wizdaphne.huijiwiki.com/api.php?action=lua&module=Api/GetMonster&format=json&utf8=1',
            );

            if (response.ok) {
                const data: IGetMonsterResponse = await response.json();

                monsterRaceList.value = data.monster_race_list || [];
                relicStatList.value = data.relicbrew_stat_list || [];
                reliceCategoryList.value = data.relicbrew_category || [];

                relicBrews.value = parseRelicBrewData(data.relicbrews || []);
                monsters.value = parseMonsterData(data.monsters || []);
                maps.value = parseMapData(data.maps || []);
                isInit.value = true;
            } else {
                console.error('获取怪物数据失败');
            }
        } catch (error) {
            console.error('加载怪物数据时发生错误:', error);
        } finally {
            isLoading.value = false;
        }
    };

    // 解析遗物酒数据
    const parseRelicBrewData = (data: IRelicBrew[]): RelicBrew[] => {
        return data.map((brew) => new RelicBrew(brew));
    };

    // 解析怪物数据
    const parseMonsterData = (data: IMonster[]): Monster[] => {
        return data.map((monster) => new Monster(monster));
    };

    // 解析地图数据
    const parseMapData = (data: IMap[]): GameMap[] => {
        return data.map((map) => new GameMap(map));
    };

    return {
        relicBrews,
        monsters,
        maps,
        isInit,
        isLoading,
        monsterRaceList,
        relicStatList,
        reliceCategoryList,
        loadAllData,
    };
});
