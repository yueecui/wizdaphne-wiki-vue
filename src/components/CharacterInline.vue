<template>
    <a class="cursor-pointer text-blue-200 hover:text-blue-400" @click.prevent="handleClick">
        {{ label }}
    </a>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { styledName, useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    characterName?: string;
    /** 角色 ID：有就优先按它定位 */
    characterId?: string;
}>();

const link = useInlineLink();
const character = computed(() =>
    link.findCharacterLink({ id: props.characterId, name: props.characterName }),
);

/**
 * 显示优先用模板里写的名字：有风格的角色写作「风格名 + 角色名」，
 * 而数据里的 `name` 只有角色名，换掉会丢掉风格信息。
 */
const label = computed(() => {
    if (props.characterName) return props.characterName;
    if (character.value) return styledName(character.value);
    return props.characterId ? `#${props.characterId}` : '角色';
});

const handleClick = () =>
    void link.openLink('character', { id: props.characterId, name: props.characterName });
</script>
