<template>
    <ThemeConfigProvider>
        <div class="mt-8 px-4 flex flex-col gap-4">
            <div class="flex flex-row gap-2">
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
            <StatCalculator v-if="activeKey == 'StatCalculator'" v-model:character="calcStatCharacter" />
        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import CharacterSearcher from './Character/CharacterSearcher.vue';
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
