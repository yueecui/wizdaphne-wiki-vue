<template>
    <ThemeConfigProvider>
        <NModal :show="show" @update:show="onShowUpdate" @esc="close" @mask-click="close">
            <div class="w-[95vw] md:w-[880px] max-h-[88vh] m-auto flex flex-col huiji-css-hook bg-transparent!">
                <div class="flex-1 min-h-0 flex flex-col bg-[#312721]! border! border-[#463d38]! rounded">
                    <!-- 头部：分类 / 店名；右侧 ID、关闭 -->
                    <div class="shrink-0 bg-[#312721] px-4 pt-3 pb-2 border-b! border-[#463d38]!">
                        <div class="flex flex-wrap items-start gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="text-sm text-light">{{ kindLabel }}</div>
                                <div class="text-2xl md:text-3xl text-light font-bold break-words">
                                    {{ shop?.name ?? '商店详情' }}
                                </div>
                            </div>
                            <div class="flex w-full md:w-auto flex-col items-end gap-1 shrink-0">
                                <span v-if="shop" class="text-xs text-gray-600">ID {{ shop.id }}</span>
                                <NButton size="tiny" quaternary @click="close">关闭</NButton>
                            </div>
                        </div>
                    </div>

                    <!-- 内容：和商店页右侧完全一致的商品表 -->
                    <div class="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-4 max-h-[70vh]">
                        <ShopGoodsTable v-if="shop" :shop="shop" max-height="62vh" />
                        <div v-else class="text-sm opacity-60">
                            {{ loading ? '商店数据加载中…' : '找不到这家商店' }}
                        </div>
                    </div>
                </div>
            </div>
        </NModal>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton, NModal } from 'naive-ui';
import { computed, onMounted } from 'vue';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import { useWikiDataStore } from '../../stores/wikiData';
import ShopGoodsTable from './ShopGoodsTable.vue';

defineOptions({ name: '商店详情ModalV2' });

/**
 * 内联 `{{商店|...}}` 点开的商店弹窗。样式就是商店页右侧那张表，
 * 所以直接复用 `ShopGoodsTable`（连商品行的物品 / 装备弹窗一起）。
 */
const props = defineProps<{ show: boolean; shopId: number | null }>();
const emit = defineEmits<{ 'update:show': [value: boolean] }>();

const wiki = useWikiDataStore();
const loading = computed(() => wiki.status === 'loading');

const shop = computed(() => wiki.shops.find((row) => row.id === props.shopId) ?? null);
const kindLabel = computed(() => shop.value?.kind_name || '商店');

const close = () => emit('update:show', false);
const onShowUpdate = (value: boolean) => emit('update:show', value);

// 正文里直接点开时数据可能还没加载（内联组件会先 ensureWikiData，这里兜一层）
onMounted(() => {
    if (!wiki.ready) void wiki.init();
});
</script>
