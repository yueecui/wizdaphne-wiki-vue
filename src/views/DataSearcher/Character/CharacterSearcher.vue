<template>
    <div class="flex flex-col gap-4 px-2 -mx-2">
        <div class="flex flex-col gap-2">
            <CharacterFilter v-model:filter="filter" />
            <div><NButton size="small" type="error" @click="onFilterReset">重置</NButton></div>
        </div>
        <div>共有 {{ filteredCharacterList.length }} 个符合条件的角色</div>
        <div class="flex flex-wrap -mx-2">
            <template v-for="char in filteredCharacterList" :key="char.data.key">
                <div
                    class="cursor-pointer relative p-2 group w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 3xl:w-1/6 select-none"
                    @click="() => showDetail(char)"
                >
                    <div
                        class="hidden group-hover:block! absolute border! border-solid border-light! bg-light/10 rounded top-0 left-0 bottom-0 right-0"
                    ></div>
                    <CharacterItem :character="char"></CharacterItem>
                </div>
            </template>
        </div>
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
import { NButton, NModal } from 'naive-ui';
import CharacterCard from './CharacterCard.vue';
import CharacterFilter from './CharacterFilter.vue';
import CharacterItem from './CharacterItem.vue';

import { computed, onMounted, ref, watch } from 'vue';
import { useSearcherDataStore } from '../data/searcherDataStore';
import { Character } from './Character';
import { ICharacterFilter } from './types';

const filter = ref<ICharacterFilter>({
    searchText: '',
    element: '',
    race: '',
    gender: '',
    personality: '',
    rarity: '',
    fate: '',
    class: [''],
    onlyPrimary: true,
    discipline_tags: [],
});

const store = useSearcherDataStore();

// 使用computed属性获取角色列表，确保数据变化时自动更新
const characterList = computed(() => {
    const chars = store.getCharacterList;
    // 按发布时间倒序排列
    return chars.sort((a, b) => {
        // 如果发布时间不同，晚发布的靠前
        if (a.releaseDate.getTime() !== b.releaseDate.getTime()) {
            return b.releaseDate.getTime() - a.releaseDate.getTime();
        }

        // 如果稀有度不同，稀有度高的靠前
        if (a.rarityNumber !== b.rarityNumber) {
            return b.rarityNumber - a.rarityNumber;
        }
        // 否则按中文名排序
        return a.data.name.localeCompare(b.data.name);
    });
});

const filteredCharacterList = computed(() => characterList.value.filter((char) => char.isMatch(filter.value)));

onMounted(async () => {
    // 监听数据加载完成事件，初始化每个角色的数据
    watch(
        () => store.isInit,
        async (newVal) => {
            if (newVal) {
                // 数据加载完成后，初始化每个角色的数据
                for (const char of characterList.value) {
                    await char.initialize();
                }
            }
        },
        { immediate: true },
    );

    // if (IS_DEV) {
    //     showDetailCharacter.value = characterList.value[0];
    //     isShowDetail.value = true;
    // }
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

const onFilterReset = () => {
    filter.value = {
        searchText: '',
        element: '',
        race: '',
        gender: '',
        personality: '',
        rarity: '',
        fate: '',
        class: [''],
        onlyPrimary: true,
        discipline_tags: [],
    };
};
</script>
