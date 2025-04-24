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
            <StatCalculator v-if="activeKey == 'StatCalculator'" v-model:character="calcStatCharacterConfig" />
            <WeaponSearcher v-if="activeKey == 'Weapon'" />
            <ArmorSearcher v-if="activeKey == 'Armor'" />
        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import CharacterSearcher from './Character/CharacterSearcher.vue';
import ArmorSearcher from './Equipment/ArmorSearcher.vue';
import WeaponSearcher from './Equipment/WeaponSearcher.vue';
import InheritSkill from './InheritSkill/InheritSkill.vue';
import SkillSearcher from './Skill/SkillSearcher.vue';
import StatCalculator from './StatCalculator/StatCalculator.vue';

import { onMounted, provide, ref, watch } from 'vue';
import { SimCharacterConfig } from './StatCalculator/types';
import { SearcherExposeData } from './data/SearcherExposeData';

defineOptions({
    name: '数据搜索器',
});

onMounted(() => {
    // 隐藏#firstHeading
    const firstHeading = document.getElementById('firstHeading');
    if (firstHeading) {
        firstHeading.style.display = 'none';
    }

    const searcherActiveKey = localStorage.getItem('searcherActiveKey');
    if (searcherActiveKey) {
        activeKey.value = searcherActiveKey;
    } else {
        activeKey.value = 'Character';
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
        key: 'StatCalculator',
        label: '特性值计算',
    },
];

const calcStatCharacterConfig = ref<SimCharacterConfig | null>(null);

const startCalcStat = (characterName: string, isSub: boolean) => {
    const exposeData = SearcherExposeData.getInstance();
    const data = exposeData.getCharacterData(characterName);
    if (data) {
        calcStatCharacterConfig.value = {
            race: data.race,
            gender: data.gender,
            element: data.element,
            class: isSub && data.class.length > 1 ? data.class[1] : data.class[0],
            tier: 0,
        };
    }
    activeKey.value = 'StatCalculator';
};
provide('startCalcStat', startCalcStat);

const activeKey = ref<string>('');
watch(
    activeKey,
    (newKey) => {
        if (newKey) {
            localStorage.setItem('searcherActiveKey', newKey);
        }
    },
    { immediate: true },
);
</script>
