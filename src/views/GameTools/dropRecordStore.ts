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

    // 用户配置数据（非记录数据）
    const dropSettings = useLocalStorage<{
        activeAllTab?: string | number;
        hideHiddenItems?: boolean;
    }>('drop-settings', {});

    // 自定义项配置（单独存储）
    const customConfigsData = useLocalStorage<import('./type').ICustomConfig[]>('drop-custom-configs', []);

    // 配置数据
    const dropConfigs = ref<DropConfig[]>([]);
    const dropCategorys = ref<IDropCategory[]>([]);
    const fixedConfigs = ref<FixedRefreshConfig[]>([]);

    // 初始化
    const isInit = ref(false);
    fetch(IS_DEV ? '/dropconfig.json' : '/api.php?action=lua&module=Api/GetDropConfig&format=json&utf8=1').then(
        (res) => {
            if (res.ok) {
                res.json().then((data: IDropConfigFile) => {
                    dropConfigs.value = data.drops.map((item) => new DropConfig(item));
                    dropCategorys.value = data.categorys;

                    // 从API获取固定配置，如果没有则使用空数组
                    if (data.fixed) {
                        fixedConfigs.value = data.fixed.map((item) => new FixedRefreshConfig(item));
                    } else {
                        fixedConfigs.value = [];
                    }

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
        dropSettings,
        customConfigsData,

        dropConfigs,
        fixedConfigs,
        dropCategorys,

        isInit,

        getDropCategoryText,
        getDropConfigsByCategory,
    };
});
