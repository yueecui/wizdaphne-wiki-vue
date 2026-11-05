<template>
    <!-- 默认色取自站点链接样式（site.css：a / a:hover），传了 data-class 就整组替换 -->
    <span class="cursor-pointer" :class="customClass || 'text-[#d4ad7a] hover:text-[#f4cf9e]'" @click="handleClick">
        {{ label }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { styledName, useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    characterName?: string;
    /** 角色 ID：有就优先按它定位 */
    characterId?: string;
    /** 自定义样式类（模板里的 `data-class`） */
    customClass?: string;
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
