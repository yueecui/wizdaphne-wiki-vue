<template>
    <ThemeConfigProvider>
        <div class="mt-8 -mx-4 md:mx-0 px-4 flex flex-col gap-4">
            <div class="flex flex-wrap flex-row gap-2">
                <NButton
                    v-for="tab in tabs"
                    :key="tab.key"
                    :type="activeKey === tab.key ? 'primary' : 'default'"
                    @click="() => (activeKey = tab.key)"
                >
                    {{ tab.label }}
                </NButton>
            </div>
            <CharacterSearcher v-if="activeKey == 'Character'" />
            <SkillSearcher v-if="activeKey == 'Skill'" />
            <InheritSkill v-if="activeKey == 'InheritSkill'" />
            <AbilityCalculator v-if="activeKey == 'AbilityCalculator'" />
            <StatCalculator v-if="activeKey == 'StatCalculator'" v-model:character="calcStatCharacterConfig" />
            <WeaponSearcher v-if="activeKey == 'Weapon'" />
            <ArmorSearcher v-if="activeKey == 'Armor'" />
            <JunkSearcher v-if="activeKey == 'Junk'" />
            <AchievementSearcher v-if="activeKey == 'Achievement'" />
            <ItemSearcher v-if="activeKey == 'Item'" />
            <RelicBrewSearcher v-if="activeKey == 'RelicBrew'" />
        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import AbilityCalculator from './AbilityCalculator/AbilityCalculator.vue';
import AchievementSearcher from './Achievement/AchievementSearcher.vue';
import CharacterSearcher from './Character/CharacterSearcher.vue';
import ArmorSearcher from './Equipment/ArmorSearcher.vue';
import WeaponSearcher from './Equipment/WeaponSearcher.vue';
import InheritSkill from './InheritSkill/InheritSkill.vue';
import ItemSearcher from './Item/ItemSearcher.vue';
import JunkSearcher from './Junk/JunkSearcher.vue';
import RelicBrewSearcher from './RelicBrew/RelicBrewSearcher.vue';
import SkillSearcher from './Skill/SkillSearcher.vue';
import StatCalculator from './StatCalculator/StatCalculator.vue';

import { onMounted, provide, ref, watch } from 'vue';
import { useSearcherDataStore } from './data/searcherDataStore';
import { SimCharacterConfig } from './StatCalculator/types';

const LocalStorageKey = 'DataSearcherActiveTab';

// 独立的activeKey，不使用useLocalStorage同步
const activeKey = ref((localStorage.getItem(LocalStorageKey) || 'Character') as string);

// 监听activeKey的变化，同步更新浏览器地址
watch(
    activeKey,
    (newKey) => {
        localStorage.setItem(LocalStorageKey, newKey);

        // 更新URL参数
        const urlParams = new URLSearchParams(window.location.search);
        // 如果是默认标签页，移除tab参数；否则设置tab参数
        urlParams.set('tab', newKey);
        // 构建新的URL
        const newUrl = `${window.location.pathname}${urlParams.toString() ? `?${urlParams.toString()}` : ''}`;
        // 使用replaceState更新URL，不刷新页面
        window.history.replaceState({}, '', newUrl);
    },
    // 移除immediate: true选项，避免在组件初始化时立即执行
);

defineOptions({
    name: '数据搜索器',
});

const tabs = [
    {
        key: 'Character',
        label: '角色',
    },
    {
        key: 'Skill',
        label: '技能',
    },
    {
        key: 'InheritSkill',
        label: '继承技能',
    },
    {
        key: 'Weapon',
        label: '武器',
    },
    {
        key: 'Armor',
        label: '防具',
    },
    {
        key: 'Junk',
        label: '杂物',
    },
    {
        key: 'Achievement',
        label: '成就',
    },
    {
        key: 'Item',
        label: '物品',
    },
    {
        key: 'RelicBrew',
        label: '遗物酒',
    },
    {
        key: 'StatCalculator',
        label: '特性值计算',
    },
    {
        key: 'AbilityCalculator',
        label: '能力值计算',
    },
];

// 组件初始化时优先检查URL参数
const initActiveTabFromUrl = () => {
    // 从URL参数中获取默认标签页
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    if (tabParam) {
        // 检查参数是否是有效的标签页key
        let tabKey = tabParam;
        const isValidTab = tabs.some((tab) => {
            if (tab.key === tabParam) return true;
            if (tab.label === tabParam) {
                tabKey = tab.key;
                return true;
            }
            return false;
        });
        if (isValidTab) {
            // 从localStorage读取初始值
            activeKey.value = tabKey;
        }
    }
};

// 立即执行初始化函数
initActiveTabFromUrl();

onMounted(() => {
    // 隐藏#firstHeading
    const firstHeading = document.getElementById('firstHeading');
    if (firstHeading) {
        firstHeading.style.display = 'none';
    }
});

const calcStatCharacterConfig = ref<SimCharacterConfig | null>(null);

const startCalcStat = (characterName: string, isSub: boolean) => {
    const store = useSearcherDataStore();
    const data = store.getCharacterData(characterName);
    if (data) {
        calcStatCharacterConfig.value = {
            race: data.race,
            gender: data.gender,
            element: data.element,
            class: Array.isArray(data.class) ? data.class[0] : data.class,
            tier: 0, // 角色数据中没有tier属性，使用默认值0
        };
    }
    activeKey.value = 'StatCalculator';
};
provide('startCalcStat', startCalcStat);
</script>
