<template>
    <InlineLinkBase
        :show-name="label"
        :custom-class="props.customClass"
        fallback="商店"
        @activate="handleClick"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import InlineLinkBase from './InlineLinkBase.vue';
import { useInlineLink } from './inlineLink';

defineOptions({ name: '商店内联链接' });

/**
 * `{{商店|展示名|店铺ID}}`：正文里显示一个可点击的店名，点了打开商店弹窗。
 *
 * 显示文字优先用模板里的 `data-name`（编辑者可自行起名），没有就用数据里的店名
 * （形如「宝石商 · 悬赏勋章」），都没有时退回「商店」。
 */
const props = defineProps<{
    /** 模板里写的名字（`data-name`）：编辑者自定义的显示文字 */
    shopName?: string;
    /** 店铺 ID（`data-id`）：有就优先按它定位 */
    shopId?: string;
    /** 自定义样式类（模板里的 `data-class`）：有值时替换掉默认的蓝色 */
    customClass?: string;
}>();

const link = useInlineLink();
const shop = computed(() => link.findShopLink({ id: props.shopId, name: props.shopName }));

/** 显示优先级：`data-name` -> 数据里的店名 -> 占位文案 */
const label = computed(() => props.shopName || shop.value?.name || '');

// openLink 内部会先 ensureWikiData 加载数据，找不到店时给提示
const handleClick = () => void link.openLink('shop', { id: props.shopId, name: props.shopName });
</script>
