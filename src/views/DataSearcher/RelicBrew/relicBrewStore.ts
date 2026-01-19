import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../../util';
import { RelicBrew } from './RelicBrew';
import type { IRelicBrew } from './types';

export const useRelicBrewStore = defineStore('relicBrew', () => {
    // 配置数据
    const relicBrews = ref<RelicBrew[]>([]);
    const isInit = ref(false);
    const isLoading = ref(false);

    // 加载并解析relicbrew.json数据
    const loadRelicBrewData = async () => {
        if (isLoading.value || isInit.value) return;

        isLoading.value = true;

        try {
            const response = await fetch(
                IS_DEV
                    ? '/relicbrew.json'
                    : 'https://wizdaphne.huijiwiki.com/api.php?action=lua&module=Api/GetRelicbrew&format=json&utf8=1',
            );

            if (response.ok) {
                // 先解析为any类型，处理可能包含warnings字段的情况
                const data: any = await response.json();
                // 获取relicbrews字段数据
                const relicBrewData = data.relicbrews || [];
                // 解析数据并创建RelicBrew对象
                const parsedData = parseRelicBrewData(relicBrewData);
                relicBrews.value = parsedData;
                isInit.value = true;
            } else {
                console.error('获取遗物酒数据失败');
            }
        } catch (error) {
            console.error('加载遗物酒数据时发生错误:', error);
        } finally {
            isLoading.value = false;
        }
    };

    // 解析遗物酒数据
    const parseRelicBrewData = (data: IRelicBrew[]): RelicBrew[] => {
        return data.map((brew) => new RelicBrew(brew));
    };

    return {
        relicBrews,
        isInit,
        isLoading,
        loadRelicBrewData,
    };
});
