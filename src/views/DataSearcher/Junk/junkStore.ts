import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../../util';
import { useEquipmentStore } from '../Equipment/equipmentStore';
import { JunkItem } from './JunkItem';
import type { IJunkJson } from './types';

export const useJunkStore = defineStore('junk', () => {
    // 配置数据
    const junkItems = ref<JunkItem[]>([]);
    const isInit = ref(false);
    const isLoading = ref(false);


    // 加载并解析junkrates.json数据
    const loadJunkData = async () => {
        if (isLoading.value || isInit.value) return;

        isLoading.value = true;

        try {
            const response = await fetch(
                IS_DEV ? '/junkdata.json' : '/api.php?action=lua&module=Api/GetJunkData&format=json&utf8=1',
            );

            if (response.ok) {
                const data: IJunkJson = await response.json();
                // 解析数据并创建JunkItem对象
                const parsedData = await parseJunkData(data);
                junkItems.value = parsedData;
                isInit.value = true;
            } else {
                console.error('获取垃圾装备数据失败');
            }
        } catch (error) {
            console.error('加载杂物数据时发生错误:', error);
        } finally {
            isLoading.value = false;
        }
    };

    // 解析compact格式的junk数据
    const parseJunkData = async (data: IJunkJson): Promise<JunkItem[]> => {
        const equipmentStore = useEquipmentStore();
        // 先等待装备数据加载完成
        await equipmentStore.waitForInit();

        // 转换一下
        const strMap = (() => {
            const map: Map<number, string> = new Map();
            data.junkData.strMap.forEach((str, index) => {
                map.set(index, str);
            });
            return map;
        })();

        const nameMap = (() => {
            const map: Map<string, string> = new Map();
            data.junkNameMap.forEach(([key, value]) => {
                map.set(key, value);
            });
            return map;
        })();

        // 使用异步并行方式创建JunkItem实例，避免主线程阻塞
        const promises = data.junkData.data.map((raw) => {
            // 使用Promise包装JunkItem创建过程
            return new Promise<JunkItem>((resolve) => {
                // 使用setTimeout将创建过程放入事件队列，避免阻塞主线程
                setTimeout(() => {
                    resolve(new JunkItem(raw, { strMap, nameMap }));
                }, 0);
            });
        });

        // 等待所有JunkItem创建完成
        const result = await Promise.all(promises);
        return result;
    };

    return {
        junkItems,
        isInit,
        isLoading,
        loadJunkData,
    };
});
