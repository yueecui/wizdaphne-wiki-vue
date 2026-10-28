<template>
    <div class="character-item-wrapper cursor-pointer relative group p-2" @click="handleClick">
        <CharacterCard v-if="character" :character="character" />
        <div
            v-else
            class="w-full aspect-[484/224] rounded bg-black/40 flex items-center justify-center text-xs opacity-40"
        >
            {{ placeholder }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useInlineModalStore } from '../stores/inlineModalStore';
import { useWikiDataStore } from '../stores/wikiData';
import CharacterCard from '../views/DataV2/CharacterCard.vue';
import { useDataV2Store } from '../views/DataV2/dataV2Store';
import { findCharacter, parseId } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 / 没有 ID 时兜底匹配 */
    characterName?: string;
    /** 角色 ID：有就优先按它定位 */
    characterId?: string;
}>();

const wiki = useWikiDataStore();
const store = useDataV2Store();
const modal = useInlineModalStore();

const character = computed(() => {
    const id = parseId(props.characterId);
    if (id != null) return store.characterById.get(id) ?? null;

    const raw = findCharacter(wiki.characters, props.characterName ?? '');
    return raw ? (store.characterById.get(raw.id) ?? null) : null;
});

const placeholder = computed(() => {
    if (wiki.status === 'error') return '加载失败';
    return wiki.ready ? '角色不存在' : '加载中…';
});

// 角色卡要渲染 V2 数据：进页面就初始化整库（IndexedDB 有缓存时很快，多次调用只拉一次）
onMounted(() => {
    void wiki.init();
});

const handleClick = () => {
    if (character.value) {
        modal.open({ kind: 'character', id: character.value.id });
        return;
    }
    if (!wiki.ready) {
        window.wiz.$message.info('角色数据正在加载，请稍后再试');
        return;
    }
    window.wiz.$message.error('角色不存在');
};
</script>

<style scoped>
.character-item-wrapper {
    width: 216px;
    transition: all 0.2s ease;
}
</style>
