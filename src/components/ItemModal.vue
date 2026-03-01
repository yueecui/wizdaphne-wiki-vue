<template>
    <ThemeConfigProvider>
        <NModal v-model:show="showModal">
            <template v-if="currentItem">
                <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                    <ItemCard :itemId="currentItem.id.toString()" :onClose="closeModal" />
                </div>
            </template>
        </NModal>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NModal } from 'naive-ui';
import { storeToRefs } from 'pinia';
import ThemeConfigProvider from '../layout/ThemeConfigProvider.vue';
import { useItemModalStore } from '../stores/itemModalStore';
import ItemCard from '../views/DataSearcher/Item/ItemCard.vue';

const store = useItemModalStore();
const { showModal, currentItem } = storeToRefs(store);
const { closeModal } = store;
</script>

<style scoped>
/* 可以添加自定义样式 */
</style>
