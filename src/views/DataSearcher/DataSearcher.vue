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
            <StatCalculator v-if="activeKey == 'StatCalculator'" v-model:character="calcStatCharacter" />
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

import { useLocalStorage } from '@vueuse/core';
import { onMounted, provide, ref } from 'vue';

defineOptions({
    name: '数据搜索器',
});

onMounted(() => {
    // 隐藏#firstHeading
    const firstHeading = document.getElementById('firstHeading');
    if (firstHeading) {
        firstHeading.style.display = 'none';
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
        label: '属性计算',
    },
];

const calcStatCharacter = ref<string | null>(null);

const startCalcStat = (characterName: string) => {
    calcStatCharacter.value = characterName;
    activeKey.value = 'StatCalculator';
};
provide('startCalcStat', startCalcStat);

const activeKey = useLocalStorage<string>('searcherActiveKey', 'Character');
</script>
