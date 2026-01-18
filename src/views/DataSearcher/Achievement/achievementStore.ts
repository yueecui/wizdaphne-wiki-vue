import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../../util';
import { AchievementItem } from './AchievementItem';
import type { IAchievementJson } from './types';

export const useAchievementStore = defineStore('achievement', () => {
    const achievementItems = ref<AchievementItem[]>([]);
    const isInit = ref(false);
    const isLoading = ref(false);

    const loadAchievementData = async () => {
        if (isLoading.value || isInit.value) return;

        isLoading.value = true;

        try {
            const response = await fetch(
                IS_DEV ? '/achievement.json' : 'https://wizdaphne.huijiwiki.com/api.php?action=lua&module=Api/GetAchievement&format=json&utf8=1',
            );

            if (response.ok) {
                const data: IAchievementJson = await response.json();
                const parsedData = parseAchievementData(data);
                achievementItems.value = parsedData;
                isInit.value = true;
            } else {
                console.error('获取成就数据失败');
            }
        } catch (error) {
            console.error('加载成就数据时发生错误:', error);
        } finally {
            isLoading.value = false;
        }
    };

    const parseAchievementData = (data: IAchievementJson): AchievementItem[] => {
        return data.achievement.map((item, index) => new AchievementItem(item, index));
    };

    const getCategories = () => {
        const categoryOrder = ['奈落', '冒险者', '装备', '战斗', '探索', '其他'];
        const categories = new Set<string>();
        achievementItems.value.forEach((item) => {
            categories.add(item.cate);
        });
        const sortedCategories = categoryOrder.filter((cate) => categories.has(cate));
        const remainingCategories = Array.from(categories).filter((cate) => !categoryOrder.includes(cate));
        return [...sortedCategories, ...remainingCategories.sort()];
    };

    const getSubCategories = (category: string) => {
        if (category !== '奈落') return [];
        const subOrder = ['全部', '初始的奈落', '贸易水路', '不落的要塞', '豪雪地带'];
        const subCategories = new Set<string>();
        achievementItems.value.forEach((item) => {
            if (item.cate === '奈落' && item.sub) {
                subCategories.add(item.sub);
            }
        });
        return subOrder.filter((sub) => sub === '全部' || subCategories.has(sub));
    };

    return {
        achievementItems,
        isInit,
        isLoading,
        loadAchievementData,
        getCategories,
        getSubCategories,
    };
});
