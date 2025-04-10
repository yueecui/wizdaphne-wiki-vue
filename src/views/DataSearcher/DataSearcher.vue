<template>
    <ThemeConfigProvider>
        <div class="mt-8 px-4 flex flex-col gap-4">
            <div class="flex flex-row gap-2">
                <NButton
                    :type="activeKey === 'Character' ? 'primary' : 'default'"
                    @click="() => (activeKey = 'Character')"
                >
                    角色
                </NButton>
                <NButton :type="activeKey === 'Skill' ? 'primary' : 'default'" @click="() => (activeKey = 'Skill')">
                    技能
                </NButton>
            </div>
            <CharacterSearcher v-if="activeKey == 'Character'" />
            <SkillSearcher v-if="activeKey == 'Skill'" />
        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import { onMounted, ref } from 'vue';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import CharacterSearcher from './Character/CharacterSearcher.vue';
import SkillSearcher from './Skill/SkillSearcher.vue';

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

const activeKey = ref('Character');
</script>
