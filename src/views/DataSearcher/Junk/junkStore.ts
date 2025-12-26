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

    // 初始化：加载并解析junkrates.json数据
    fetch(IS_DEV ? '/junkdata.json' : '/api.php?action=lua&module=Api/GetJunkData&format=json&utf8=1').then((res) => {
        if (res.ok) {
            res.json().then(async (data: IJunkJson) => {
                // 解析数据并创建JunkItem对象
                const parsedData = await parseJunkData(data);
                junkItems.value = parsedData;
                isInit.value = true;
            });
        } else {
            console.error('获取垃圾装备数据失败');
        }
    });

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

        // 使用同步构造函数创建JunkItem实例
        const result = data.junkData.data.map((raw) => new JunkItem(raw, { strMap, nameMap }));
        return result;
    };

    return {
        junkItems,
        isInit,
    };
});
