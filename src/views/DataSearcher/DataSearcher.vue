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
import JunkSearcher from './Junk/JunkSearcher.vue';
import SkillSearcher from './Skill/SkillSearcher.vue';
import StatCalculator from './StatCalculator/StatCalculator.vue';

import { computed, onMounted, provide, ref, toRefs } from 'vue';
import { useSearcherDataStore } from './data/searcherDataStore';
import { useJunkStore } from './Junk/junkStore';
import { SimCharacterConfig } from './StatCalculator/types';

// 使用searcherDataStore的settings
const { settings } = toRefs(useSearcherDataStore());

defineOptions({
    name: '数据搜索器',
});

const junkStore = useJunkStore();

onMounted(() => {
    // 隐藏#firstHeading
    const firstHeading = document.getElementById('firstHeading');
    if (firstHeading) {
        firstHeading.style.display = 'none';
    }

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
            activeKey.value = tabKey;
        }
    }
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
        key: 'StatCalculator',
        label: '特性值计算',
    },
    {
        key: 'AbilityCalculator',
        label: '能力值计算',
    },
];

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
    settings.value.activeTab = 'StatCalculator';
};
provide('startCalcStat', startCalcStat);

// 使用计算属性获取和设置活跃标签
const activeKey = computed({
    get: () => settings.value.activeTab,
    set: (newKey) => (settings.value.activeTab = newKey),
});
</script>
