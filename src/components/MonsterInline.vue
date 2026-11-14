<template>
    <InlineLinkBase
        :name="props.monsterName"
        :resolved-name="label"
        :id="props.monsterId"
        :custom-class="props.customClass"
        fallback="敌人"
        @activate="handleClick"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import InlineLinkBase from './InlineLinkBase.vue';
import { enemyVariantNameOf, parseId, useInlineLink } from './inlineLink';

defineOptions({ name: '敌人内联链接' });

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    monsterName?: string;
    /**
     * 敌人 ID：可以是图鉴分类 id，也可以是**变体 id**（地图 / 敌群 / 详情页复制出来的是这个，
     * 如 `13301010000`），后者会定位到所属分类并自动切到对应变体
     */
    monsterId?: string;
    /** 自定义样式类（模板里的 `data-class`）：有值时替换掉默认的蓝色 */
    customClass?: string;
}>();

const link = useInlineLink();
const monster = computed(() => link.findEnemyLink({ id: props.monsterId, name: props.monsterName }));

/**
 * 显示名：变体自己的名字优先（如 13301「雪山独眼巨人」下的「碎岩巨鬼」），
 * 没有专属名时才用分类名；数据还没加载时由 `InlineLinkBase` 退回模板里的名字。
 */
const label = computed(
    () => enemyVariantNameOf(monster.value, parseId(props.monsterId)) ?? monster.value?.name,
);

// openLink 内部会先 ensureWikiData 加载数据，并把变体 id 一并传给 modal，
// modal 按 enemyVariantId 自动切到对应变体
const handleClick = () => void link.openLink('enemy', { id: props.monsterId, name: props.monsterName });
</script>
