import { useLocalStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../util';
import { DropConfig } from './classes/DropConfig';
import { FixedRefreshConfig } from './classes/FixedRefreshConfig';
import type { IDropCategory, IDropConfigFile, IDropRecord } from './type';

export const useDropRecordStore = defineStore('drop-record', () => {
    // 更新旧数据格式到新数据格式
    const dropRecords = useLocalStorage<IDropRecord[]>('drop-records', []);
    (() => {
        for (const record of dropRecords.value) {
            if (record.timestamp && typeof record.timestamp === 'number') {
                record.r = [record.timestamp];
                record.timestamp = undefined;
            }
        }
    })();

    // 配置数据
    const dropConfigs = ref<DropConfig[]>([]);
    const dropCategorys = ref<IDropCategory[]>([]);
    const fixedConfigs: FixedRefreshConfig[] = [
        new FixedRefreshConfig({
            id: 'F1',
            title: '每周官网商店领100石',
            description: '每周可以登录2个官网商店各领取50石，每周日23点刷新',
            refreshType: '每周日',
            refreshText: '每周日晚23点',
            links: [
                {
                    url: 'https://store.wizardry.info/zh-CN',
                    text: '点击打开官网商店1',
                },
                {
                    url: 'https://webstore.wizardry.info/product',
                    text: '点击打开官网商店2',
                },
            ],
        }),
        new FixedRefreshConfig({
            id: 'F2',
            title: '炉壶的灵庙刷新',
            description: '每两周的周六晚23点，炉壶的灵庙会更新',
            refreshType: '双周六',
            refreshText: '双周六晚23点',
        }),
    ];
    // 初始化
    const isInit = ref(false);
    fetch(IS_DEV ? '/dropconfig.json' : '/api.php?action=lua&module=Api/GetDropConfig&format=json&utf8=1').then(
        (res) => {
            if (res.ok) {
                res.json().then((data: IDropConfigFile) => {
                    dropConfigs.value = data.drops.map((item) => new DropConfig(item));
                    dropCategorys.value = data.categorys;
                    isInit.value = true;
                });
            } else {
                console.error('获取掉落记录配置失败');
            }
        },
    );

    const getDropCategoryText = (categoryIndex: number) => {
        const category = dropCategorys.value.find((item) => item.i === categoryIndex);
        if (category) {
            return category.name;
        }
        return '';
    };

    const getDropConfigsByCategory = (categoryIndex: number) => {
        return dropConfigs.value.filter((item) => item.data.category === categoryIndex);
    };

    return {
        dropRecords,

        dropConfigs,
        fixedConfigs,
        dropCategorys,

        isInit,

        getDropCategoryText,
        getDropConfigsByCategory,
    };
});
