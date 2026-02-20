<template>
    <ThemeConfigProvider>
        <NModal v-model:show="showModal">
            <template v-if="currentCharacter">
                <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                    <CharacterCard :character="currentCharacter" :onClose="closeModal" />
                </div>
            </template>
        </NModal>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NModal } from 'naive-ui';
import { storeToRefs } from 'pinia';
import ThemeConfigProvider from '../layout/ThemeConfigProvider.vue';
import { useCharacterModalStore } from '../stores/characterModalStore';
import CharacterCard from '../views/DataSearcher/Character/CharacterCard.vue';

const store = useCharacterModalStore();
const { showModal, currentCharacter } = storeToRefs(store);
const { closeModal } = store;
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>
