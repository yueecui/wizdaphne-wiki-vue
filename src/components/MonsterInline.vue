<template>
    <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">
        {{ label }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    monsterName?: string;
    /** 敌人 ID（图鉴分类 id）：有就优先按它定位 */
    monsterId?: string;
}>();

const link = useInlineLink();
const monster = computed(() => link.findEnemyLink({ id: props.monsterId, name: props.monsterName }));

const label = computed(() => monster.value?.name || props.monsterName || (props.monsterId ? `#${props.monsterId}` : '敌人'));

// openLink 内部会先 ensureWikiData 加载数据，并把变体 id 一并传给 modal，
// modal 按 enemyVariantId 自动切到对应变体
const handleClick = () => void link.openLink('enemy', { id: props.monsterId, name: props.monsterName });
</script>
