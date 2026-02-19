<template>
    <div>
        <div class="relative">
            <WikiImg :imageName="iconImgName" class="w-full"></WikiImg>
            <div class="absolute right-1 top-1 flex gap-1">
                <div
                    class="text-xs text-blue-300 bg-black/70 border! border-solid rounded-sm px-1 py-0.5 shadow"
                    v-if="character.data.style"
                >
                    SP
                </div>
                <div
                    class="text-xs text-orange-300 bg-black/70 border! border-solid rounded-sm px-1 py-0.5 shadow"
                    v-if="character.data.rarity === RARITY_TYPE.传说"
                >
                    传说
                </div>
            </div>
            <div class="absolute right-1 bottom-1 flex gap-1">
                <div
                    class="text-xs bg-black/70 border! border-solid rounded-sm px-1 py-0.5 shadow"
                    :class="groupInfo?.color"
                    v-if="groupInfo"
                >
                    {{ groupInfo.text }}
                </div>
            </div>
            <div class="absolute left-1 bottom-1">
                <ElementIcon :element="character.data.element"></ElementIcon>
            </div>
        </div>
        <div class="bg-black/50 py-1 text-center text-light">
            {{ character.data.name }}
        </div>
        <div class="bg-black/30 text-sm flex">
            <div class="flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                {{ character.data.race }} / {{ character.data.personality }}
            </div>
            <div class="flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                {{ classText }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import WikiImg from '../../../components/huiji/WikiImg.vue';

import { computed } from 'vue';
import ElementIcon from '../../../components/ElementIcon.vue';
import { RARITY_TYPE } from '../data/enum';
import { Character } from './Character';

// 组别配置
const groupConfig = {
    '-1': { text: '限', color: 'text-orange-300' },
    '-2': { text: '联动', color: 'text-orange-300' },
    '1': { text: 'Ⅰ', color: 'text-green-300' },
    '2': { text: 'Ⅱ', color: 'text-blue-300' },
};

// 计算组别的显示信息
const groupInfo = computed(() => {
    const group = props.character.data.group;
    if (group === 0) return null;
    return groupConfig[group.toString()] || null;
});

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
