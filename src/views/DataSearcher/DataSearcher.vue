<template>
    <ThemeConfigProvider>
        <div class="flex flex-col gap-4">
            <div class="flex flex-col gap-2">
                <DataSearcherFilter v-model:filter="filter" />
                <div><NButton size="small" type="error" @click="onFilterReset">重置</NButton></div>
            </div>
            <div>共有 {{ filteredCharacterList.length }} 个符合条件的角色</div>
            <div class="flex flex-wrap -m-2">
                <template v-for="char in filteredCharacterList" :key="char.data.key">
                    <div
                        class="cursor-pointer relative p-2 group w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 3xl:w-1/6"
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
                    <CharacterCard :character="showDetailCharacter" />
                </template>
            </NModal>
        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton, NModal } from 'naive-ui';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import CharacterCard from './CharacterCard.vue';
import CharacterItem from './CharacterItem.vue';
import DataSearcherFilter from './DataSearcherFilter.vue';

import { computed, onMounted, ref, shallowRef } from 'vue';
import { IS_DEV } from '../../util';
import { Character } from './Character';
import { SearcherExposeData } from './data/SearcherExposeData';
import { IDataSearcherFilter } from './dataSearcher.type';

defineOptions({
    name: '数据搜索器',
});

const filter = ref<IDataSearcherFilter>({
    searchText: '',
    element: '',
    race: '',
    gender: '',
    rarity: '',
    fate: '',
    class: [''],
    onlyPrimary: true,
});

const characterList = shallowRef<Character[]>([]);

const filteredCharacterList = computed(() => characterList.value.filter((char) => char.isMatch(filter.value)));

onMounted(() => {
    if (IS_DEV) {
        const test = SearcherExposeData.getInstance().getCharacterList();
        characterList.value = [...test, ...test, ...test, ...test, ...test, ...test, ...test];
        showDetailCharacter.value = characterList.value[0];
        isShowDetail.value = true;
    } else {
        characterList.value = SearcherExposeData.getInstance().getCharacterList();
    }
});

const showDetailCharacter = ref<Character | null>(null);
const showDetail = (character: Character) => {
    showDetailCharacter.value = character;
    isShowDetail.value = true;
};
const isShowDetail = ref(false);
const closeDetail = () => {
    showDetailCharacter.value = null;
    isShowDetail.value = false;
};

const onFilterReset = () => {
    filter.value = {
        searchText: '',
        element: '',
        race: '',
        gender: '',
        rarity: '',
        fate: '',
        class: [''],
        onlyPrimary: true,
    };
};
</script>
