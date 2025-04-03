<template>
    <div>
        <div class="relative">
            <WikiImg :imageName="iconImgName" class="w-full"></WikiImg>
            <div
                class="absolute right-1 top-1 text-xs text-light bg-black/70 border! border-solid rounded-sm px-1 py-0.5 shadow"
                v-if="character.data.rarity === RARITY_TYPE.传说"
            >
                传说
            </div>
            <div class="absolute left-1 bottom-1">
                <ElementIcon :element="character.data.element"></ElementIcon>
            </div>
        </div>
        <div class="bg-black/50 py-1 text-center text-light">{{ character.data.name }}</div>
        <div class="bg-black/30 text-center text-sm flex">
            <div class="flex-1">{{ character.data.race }} / {{ character.data.personality }}</div>
            <div class="flex-1">{{ classText }}</div>
        </div>
    </div>
</template>

<script setup lang="ts">
import WikiImg from '../../../components/huiji/WikiImg.vue';

import { computed } from 'vue';
import ElementIcon from '../../../components/ElementIcon.vue';
import { RARITY_TYPE } from '../data/enum';
import { Character } from './Character';

const props = defineProps<{
    character: Character;
}>();

const iconImgName = computed(() => {
    return `Character_${props.character.data.key}.png`;
});

const classText = computed(() => {
    return props.character.data.class.join(' / ');
});
</script>
