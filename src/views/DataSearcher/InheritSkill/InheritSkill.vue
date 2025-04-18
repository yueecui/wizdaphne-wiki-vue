<template>
    <div>
        <table class="wikitable text-sm">
            <thead>
                <tr>
                    <th>角色</th>
                    <th>继承技能</th>
                    <th>
                        潜在继承技能
                        <WikiImg imageName="icon_RareSkills.png" class="w-5 h-5" />
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="character in characterList"
                    :key="character.data.key"
                    class="hover:bg-black/30 hover:cursor-pointer"
                    @click="() => showDetail(character)"
                >
                    <td class="text-light">
                        {{ character.data.key }}
                    </td>
                    <td>{{ character.data.inherit_skill }}</td>
                    <td>{{ character.data.inherit_skill2 ?? '' }}</td>
                </tr>
            </tbody>
        </table>
        <NModal v-model:show="isShowDetail">
            <template v-if="showDetailCharacter">
                <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                    <CharacterCard :character="showDetailCharacter" :onClose="closeDetail" />
                </div>
            </template>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import WikiImg from '@/components/huiji/WikiImg.vue';
import { NModal } from 'naive-ui';
import CharacterCard from '../Character/CharacterCard.vue';

import { onMounted, ref, shallowRef } from 'vue';
import { Character } from '../Character/Character';
import { SearcherExposeData } from '../data/SearcherExposeData';
import { COMMON_CLASS } from '../data/enum';

const characterList = shallowRef<Character[]>([]);

onMounted(() => {
    characterList.value = SearcherExposeData.getInstance().getCharacterList();
    // 按发布时间倒序排列
    characterList.value.sort((a, b) => {
        // 如果稀有度不同，稀有度高的靠前
        if (a.rarityNumber !== b.rarityNumber) {
            return b.rarityNumber - a.rarityNumber;
        }
        // 按职业顺位排
        let aClassIndex = COMMON_CLASS.indexOf(a.data.class[0]);
        let bClassIndex = COMMON_CLASS.indexOf(b.data.class[0]);
        aClassIndex = aClassIndex === -1 ? COMMON_CLASS.length : aClassIndex;
        bClassIndex = bClassIndex === -1 ? COMMON_CLASS.length : bClassIndex;
        if (aClassIndex !== bClassIndex) {
            return aClassIndex - bClassIndex;
        }

        // 如果发布时间不同，晚发布的靠前
        if (a.releaseDate.getTime() !== b.releaseDate.getTime()) {
            return b.releaseDate.getTime() - a.releaseDate.getTime();
        }
        // 否则按中文名排序
        return a.data.name.localeCompare(b.data.name);
    });
});

const showDetailCharacter = ref<Character | null>(null);
const showDetail = (character: Character) => {
    showDetailCharacter.value = character;
    isShowDetail.value = true;
};
const isShowDetail = ref(false);
const closeDetail = () => {
    isShowDetail.value = false;
};
</script>
