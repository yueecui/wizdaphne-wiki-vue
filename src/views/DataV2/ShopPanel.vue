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
            <NInput v-model:value="keyword" placeholder="搜索商店 / 商品" clearable class="w-56" />
            <span class="text-xs opacity-60">{{ filtered.length }} 家店 · {{ totalItems }} 件商品</span>
            <div class="flex-1"></div>
            <NButton size="tiny" :loading="loading" @click="wiki.refresh()">重新加载</NButton>
        </div>

        <div class="grid gap-3 md:grid-cols-[17rem_1fr]">
            <!-- 左：店铺列表（按类别分组） -->
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
                    >
                        <span class="truncate">{{ shop.name }}</span>
                        <span class="ml-1 opacity-50 text-xs">{{ shop.count }}</span>
                    </NButton>
                </div>
                <div v-if="!filtered.length && !loading" class="text-xs opacity-50 px-1">没有匹配的商店</div>
            </div>

            <!-- 右：商品表（游戏内顺序：Shop.priority） -->
            <div v-if="active" class="flex flex-col gap-2">
                <!-- 常驻只看货币；活动只看开放 / 截止 -->
                <div class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
                    <div class="font-bold">{{ active.name }}</div>
                    <template v-if="(active.group ?? 1) === 1">
                        <div v-if="currencies.length" class="opacity-70">货币：{{ currencies.join(' / ') }}</div>
                    </template>
                    <template v-else>
                        <div class="opacity-70">
                            开放：{{ active.start_at ? formatDate(active.start_at) : '—' }}
                        </div>
                        <div class="opacity-70">
                            截止：{{ active.end_at ? formatDate(active.end_at) : '—' }}
                        </div>
                    </template>
                </div>

                <div class="overflow-auto max-h-[60vh] thin-scrollbar">
                    <table class="wikitable w-full text-sm text-center m-0!">
                        <thead class="sticky top-0 z-10">
                            <tr>
                                <th>商品</th>
                                <th class="w-[10em]">价格</th>
                                <th class="w-[5em]">数量</th>
                                <th class="w-[9em]">限购</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item in active.items"
                                :key="`${item.shop_id}-${item.content_id}`"
                                :class="rowClass(item)"
                                @click="open(item)"
                            >
                                <td class="text-left">
                                    {{ item.name ?? '—' }}
                                    <span v-if="relicRank(item)" class="text-yellow-300 whitespace-nowrap">
                                        {{ '★'.repeat(relicRank(item)) }}
                                    </span>
                                </td>
                                <td class="whitespace-nowrap">{{ item.price ?? 0 }}</td>
                                <td>{{ item.quantity ?? 1 }}</td>
                                <td class="whitespace-nowrap">
                                    <span v-if="limitText(item)">{{ limitText(item) }}</span>
                                    <span v-else class="opacity-40">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <ItemModal v-model:show="itemShow" :item="selectedItem" />
        <EquipmentModal v-model:show="equipShow" :identification="selectedIdent" />
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { useWikiDataStore } from '../../stores/wikiData';
import EquipmentModal from './EquipmentModal.vue';
import ItemModal from './ItemModal.vue';
import { CURRENCY_LABELS, LIMIT_LABELS, type ItemDoc } from './itemTypes';
import type { ShopDoc, ShopItemRow } from './shopTypes';

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

const groupKey = ref<GroupKey>(1);
const keyword = ref('');

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

/** 限购文案；空串 = 不限购（表格里显示为暗色横线） */
const limitText = (item: ShopItemRow) => {
    if (!item.limit_kind) return item.limit_num ? `共 ${item.limit_num} 次` : '';
    const period = item.limit_kind === 4 ? '限购' : (LIMIT_LABELS[item.limit_kind] ?? '');
    const times = item.limit_num ? `${item.limit_num} 次` : '';
    return [period, times].filter(Boolean).join(' ');
};

/** 当前店铺使用的货币；兑换点数用商店层级的点数名（银鳞硬币 / 公会点数 …），比「兑换点数」具体 */
const currencies = computed(() => {
    const shop = active.value;
    if (!shop) return [];
    const labels = new Set<string>();
    for (const item of shop.items ?? []) {
        const label = item.currency_name ?? CURRENCY_LABELS[item.currency ?? 0];
        if (!label) continue;
        labels.add(label === '兑换点数' && shop.point_name ? shop.point_name : label);
    }
    return [...labels];
});

const formatDate = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('zh-CN');

// ---------- 点击商品：物品 / 装备各自弹窗，其余没有弹窗就没有交互 ----------

const isItemRow = (item: ShopItemRow) => (item.content_type ?? '').startsWith('Item::');

const equipIdentOf = (item: ShopItemRow) => {
    if (item.content_type !== 'Equip::Equipment') return null;
    return item.content_ident ?? null;
};

/** 只有能打开弹窗的行才给手型光标 */
const rowClass = (item: ShopItemRow) =>
    isItemRow(item) || equipIdentOf(item) != null
        ? 'cursor-pointer hover:bg-[#3a312a]! transition-colors select-none'
        : '';

const itemShow = ref(false);
const selectedItem = ref<ItemDoc | null>(null);
const equipShow = ref(false);
const selectedIdent = ref<number | null>(null);

/** 商品弹窗按 id 查道具表（和物品页共用同一份缓存数据） */
const itemDocs = computed(() => new Map(wiki.items.map((doc) => [doc.id, doc])));

/** 遗物商品的星级（`Item.relic.rank`），非遗物返回 0 */
const relicRank = (item: ShopItemRow) => {
    if (item.content_type !== 'Item::Relic' || item.content_id == null) return 0;
    return itemDocs.value.get(item.content_id)?.relic?.rank ?? 0;
};

const open = (item: ShopItemRow) => {
    const ident = equipIdentOf(item);
    if (ident != null) {
        selectedIdent.value = ident;
        equipShow.value = true;
        return;
    }
    if (!isItemRow(item) || item.content_id == null) return;
    const doc = itemDocs.value.get(item.content_id);
    if (!doc) return;
    selectedItem.value = doc;
    itemShow.value = true;
};
</script>
