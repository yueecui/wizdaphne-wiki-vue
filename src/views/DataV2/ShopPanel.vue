<template>
    <div class="flex flex-col gap-3">
        <!-- 一级分类：常驻商店（默认）/ 活动商店 -->
        <div class="flex flex-wrap items-center gap-2">
            <NButton
                v-for="tab in groupTabs"
                :key="tab.value"
                size="small"
                :type="groupKey === tab.value ? 'primary' : 'default'"
                @click="groupKey = tab.value"
            >
                {{ tab.label }}
            </NButton>
            <NInput v-model:value="keyword" placeholder="搜索商店 / 商品" clearable class="w-60!" />
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
            <span class="text-xs opacity-60">{{ filtered.length }} 家店 · {{ totalItems }} 件商品</span>
        </div>

        <div class="grid gap-3 md:grid-cols-[17rem_1fr]">
            <!-- 左：店铺列表（按类别分组）；右击可复制「商店」/「商店列表」两种内联模板 -->
            <div class="flex flex-col gap-2 max-h-[65vh] overflow-y-auto thin-scrollbar pr-1">
                <div v-for="section in sections" :key="section.label" class="flex flex-col gap-1">
                    <div class="text-xs opacity-50 px-1 pt-1">{{ section.label }}</div>
                    <NButton
                        v-for="shop in section.shops"
                        :key="shop.id"
                        size="small"
                        quaternary
                        :type="active?.id === shop.id ? 'primary' : 'default'"
                        class="justify-start! text-left!"
                        @click="active = shop"
                        @contextmenu.prevent="showMenu($event, shop)"
                    >
                        <span class="truncate">{{ shop.name }}</span>
                        <span class="ml-1 opacity-50 text-xs">{{ shop.count }}</span>
                    </NButton>
                </div>
                <div v-if="!filtered.length && !loading" class="text-xs opacity-50 px-1">没有匹配的商店</div>
            </div>

            <!-- 右：商品表（与商店 modal / 内联「商店列表」共用同一个组件） -->
            <ShopGoodsTable v-if="active" :shop="active" show-header max-height="60vh" />
        </div>

        <!-- 右击店铺：复制内联模板（两种） -->
        <CopyTemplateMenu
            :show="menu.show"
            :x="menu.x"
            :y="menu.y"
            :templates="SHOP_TEMPLATES"
            @copy="copyTemplate"
        />
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput } from 'naive-ui';
import { computed, onBeforeUnmount, ref, watch } from 'vue';
import { useWikiDataStore } from '../../stores/wikiData';
import CopyTemplateMenu from './CopyTemplateMenu.vue';
import ShopGoodsTable from './ShopGoodsTable.vue';
import { usePersistentRef } from './dataV2Settings';
import type { ShopDoc } from './shopTypes';
import { copyTemplateText, templateBody } from './useCopyMenu';

defineOptions({ name: '商店面板' });

/** 一级分类：1 常驻商店（默认）/ 2 活动商店 */
type GroupKey = 1 | 2;

const GROUP_LABELS: Array<{ label: string; value: GroupKey }> = [
    { label: '常驻商店', value: 1 },
    { label: '活动商店', value: 2 },
];

/** 左栏分段用的商店类别（1 金币商店 / 2 宝石商 / 3 黒樽亭 / 4 银鳞伯爵府） */
const KIND_LABELS: Array<{ label: string; value: number }> = [
    { label: '金币商店', value: 1 },
    { label: '宝石商', value: 2 },
    { label: '黒樽亭', value: 3 },
    { label: '银鳞伯爵府', value: 4 },
];

/** 商店表由 IndexedDB 缓存统一提供，进页面不再重新拉接口 */
const wiki = useWikiDataStore();
const shops = computed(() =>
    [...wiki.shops].sort(
        (a, b) =>
            (a.group ?? 1) - (b.group ?? 1) ||
            (a.kind ?? 0) - (b.kind ?? 0) ||
            (a.id ?? 0) - (b.id ?? 0),
    ),
);
const active = ref<ShopDoc | null>(null);
const loading = computed(() => wiki.status === 'loading');

// 过滤器持久化（一级分类 + 搜索词）
const groupKey = usePersistentRef<GroupKey>('shop.group', 1);
const keyword = usePersistentRef('shop.keyword', '');

/** 当前一级分类下的店铺 */
const inGroup = computed(() => shops.value.filter((shop) => (shop.group ?? 1) === groupKey.value));

const groupTabs = computed(() =>
    GROUP_LABELS.map((tab) => ({
        ...tab,
        label: `${tab.label} ${shops.value.filter((s) => (s.group ?? 1) === tab.value).length}`,
    })),
);

const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    return inGroup.value.filter((shop) => {
        if (!kw) return true;
        if ((shop.name ?? '').toLowerCase().includes(kw)) return true;
        return (shop.items ?? []).some((item) => (item.name ?? '').toLowerCase().includes(kw));
    });
});

/** 左栏按商店类别分段，顺序与 `KIND_LABELS` 一致 */
const sections = computed(() =>
    KIND_LABELS.map((tab) => ({
        label: tab.label,
        shops: filtered.value.filter((shop) => (shop.kind ?? 0) === tab.value),
    })).filter((section) => section.shops.length),
);

const totalItems = computed(() => filtered.value.reduce((sum, shop) => sum + (shop.count ?? 0), 0));

// 切换筛选后如果当前店不在列表里，自动选第一家
watch(filtered, (list) => {
    if (!list.length) {
        active.value = null;
        return;
    }
    if (!active.value || !list.some((shop) => shop.id === active.value?.id)) {
        active.value = list[0];
    }
});

/** 重置筛选：回到常驻商店、清空搜索词 */
const resetFilter = () => {
    groupKey.value = 1;
    keyword.value = '';
};

// ---------- 右击店铺：复制内联模板 ----------

/** 同一家店能复制成两种模板：链接（点击开弹窗）/ 内联列表 */
const SHOP_TEMPLATES = ['商店', '商店列表'];

const menu = ref<{ show: boolean; x: number; y: number; shop: ShopDoc | null }>({
    show: false,
    x: 0,
    y: 0,
    shop: null,
});

const closeMenu = () => {
    menu.value = { ...menu.value, show: false };
    document.removeEventListener('click', closeMenu);
};

const showMenu = (event: MouseEvent, shop: ShopDoc) => {
    // 右击第二家店时先摘掉上一次的监听，避免重复绑定
    document.removeEventListener('click', closeMenu);
    menu.value = { show: true, x: event.clientX, y: event.clientY, shop };
    document.addEventListener('click', closeMenu);
};

/** 正文 `店铺展示名|店铺ID`：名字只负责脚本加载前显示，ID 用于定位 */
const copyTemplate = (template: string) => {
    const shop = menu.value.shop;
    closeMenu();
    if (!shop) return;
    copyTemplateText(template, templateBody(shop.name, shop.id));
};

onBeforeUnmount(() => document.removeEventListener('click', closeMenu));
</script>
