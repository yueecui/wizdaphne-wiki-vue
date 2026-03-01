import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../../util';
import { Item } from './Item';
import type { IItemJson } from './types';

export const useItemStore = defineStore('item', () => {
    const itemItems = ref<Item[]>([]);
    const isInit = ref(false);
    const isLoading = ref(false);

    const loadItemData = async () => {
        if (isLoading.value || isInit.value) return;

        isLoading.value = true;

        try {
            const response = await fetch(
                IS_DEV
                    ? '/items.json'
                    : 'https://wizdaphne.huijiwiki.com/api.php?action=lua&module=Api/GetItem&format=json&utf8=1',
            );
            if (response.ok) {
                const data: IItemJson = await response.json();
                const parsedData = parseItemData(data);
                isInit.value = true;
                itemItems.value = parsedData;
            } else {
                console.error('获取物品数据失败:', response.status, response.statusText);
            }
        } catch (error) {
            console.error('加载物品数据时发生错误:', error);
        } finally {
            isLoading.value = false;
        }
    };

    const parseItemData = (data: IItemJson): Item[] => {
        return data.items.map((item, index) => new Item(item, index));
    };

    const getCategories = () => {
        const categories = new Set<number>();
        itemItems.value.forEach((item) => {
            categories.add(item.cate);
        });
        return Array.from(categories).sort((a, b) => a - b);
    };

    return {
        itemItems,
        isInit,
        isLoading,
        loadItemData,
        getCategories,
    };
});
