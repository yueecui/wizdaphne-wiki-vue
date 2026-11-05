<template>
    <InlineLinkBase
        :name="props.monsterName"
        :resolved-name="monster?.name"
        :id="props.monsterId"
        :custom-class="props.customClass"
        fallback="敌人"
        @activate="handleClick"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import InlineLinkBase from './InlineLinkBase.vue';
import { useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    monsterName?: string;
    /** 敌人 ID（图鉴分类 id）：有就优先按它定位 */
    monsterId?: string;
    /** 自定义样式类（模板里的 `data-class`）：有值时替换掉默认的蓝色 */
    customClass?: string;
}>();

const link = useInlineLink();
const monster = computed(() => link.findEnemyLink({ id: props.monsterId, name: props.monsterName }));

// openLink 内部会先 ensureWikiData 加载数据，并把变体 id 一并传给 modal，
// modal 按 enemyVariantId 自动切到对应变体
const handleClick = () => void link.openLink('enemy', { id: props.monsterId, name: props.monsterName });
</script>
