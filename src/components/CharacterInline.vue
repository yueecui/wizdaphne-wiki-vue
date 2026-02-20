<template>
    <a :href="`/wiki/${character?.data.key}`" @click.prevent="handleClick">
        {{ characterName }}
    </a>
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia';
import { onMounted, ref, watch } from 'vue';
import { useCharacterModalStore } from '../stores/characterModalStore';
import { Character } from '../views/DataSearcher/Character/Character';
import { useSearcherDataStore } from '../views/DataSearcher/data/searcherDataStore';

const props = defineProps<{
    characterName: string;
}>();

const searcherStore = useSearcherDataStore();
const { isInit, getCharacterList } = storeToRefs(searcherStore);
const characterModalStore = useCharacterModalStore();
const character = ref<Character | null>(null);

// 初始化时获取角色数据
onMounted(async () => {
    // 等待 store 数据加载完成
    watch(isInit, async (newVal) => {
        if (newVal) {
            // 获取角色数据
            const charData = searcherStore.getCharacterData(props.characterName);
            if (charData) {
                // 从角色列表中找到对应角色
                character.value = getCharacterList.value.find((c) => c.data.key === charData.key) || null;
            }
        }
    });
});

// 点击事件处理
const handleClick = () => {
    if (character.value) {
        // 使用 store 打开模态框
        characterModalStore.openModal(character.value);
    }
};
</script>
