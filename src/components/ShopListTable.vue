<template>
    <div class="my-2 flex flex-col gap-2" :class="props.customClass">
        <!-- 编辑者用 `data-name` 自定义标题；没写就用商品表自带的抬头（店名 + 货币 / 开放时间） -->
        <div v-if="props.shopName" class="text-sm font-bold">{{ props.shopName }}</div>

        <ShopGoodsTable v-if="shop" :shop="shop" :show-header="!props.shopName" />

        <div v-else class="text-xs opacity-60">{{ statusText }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import ShopGoodsTable from '../views/DataV2/ShopGoodsTable.vue';
import { useInlineLink } from './inlineLink';

defineOptions({ name: '商店列表表格' });

/**
 * `{{商店列表|展示名|店铺ID}}`：把商店的商品表**直接渲染**在元素所在位置。
 *
 * 和 `{{商店}}` 的区别只是不弹窗；表格样式与商店页右侧完全一致（共用 `ShopGoodsTable`）。
 * 商品行仍然可点（物品 / 装备弹窗）。
 */
const props = defineProps<{
    /** 模板里写的标题（`data-name`）：有值就替换掉默认抬头 */
    shopName?: string;
    /** 店铺 ID（`data-id`）：有就优先按它定位 */
    shopId?: string;
    /** 自定义样式类（模板里的 `data-class`）：加在容器上 */
    customClass?: string;
}>();

const link = useInlineLink();
const shop = computed(() => link.findShopLink({ id: props.shopId, name: props.shopName }));

const statusText = computed(() => {
    if (link.isLoadingData()) return '商店数据加载中…';
    return '找不到这家商店';
});

// 表格必须立刻有数据才能画，所以挂载时就把整库拉起来（有 IndexedDB 缓存时很快）
onMounted(async () => {
    await link.ensureWikiData();
    if (!shop.value) window.wiz?.$message.error('商店不存在');
});
</script>
