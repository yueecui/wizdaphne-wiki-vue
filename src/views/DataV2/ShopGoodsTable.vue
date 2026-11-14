<template>
    <div class="flex flex-col gap-2">
        <!-- 店铺抬头：常驻看货币；活动看开放 / 截止 -->
        <div v-if="showHeader" class="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
            <div class="font-bold">{{ shop.name }}</div>
            <template v-if="(shop.group ?? 1) === 1">
                <div v-if="currencies.length" class="opacity-70">货币：{{ currencies.join(' / ') }}</div>
            </template>
            <template v-else>
                <div class="opacity-70">
                    开放：{{ shop.start_at ? formatDate(shop.start_at) : '—' }}
                </div>
                <div class="opacity-70">
                    截止：{{ shop.end_at ? formatDate(shop.end_at) : '—' }}
                </div>
            </template>
        </div>

        <!-- 商品表（游戏内顺序：Shop.priority） -->
        <div class="overflow-auto thin-scrollbar" :style="maxHeight ? { maxHeight } : undefined">
            <table class="wikitable w-full text-sm text-center m-0!">
                <thead class="sticky top-0 z-10">
                    <tr>
                        <th>商品</th>
                        <th class="w-[10em]">价格</th>
                        <th class="w-[9em]">限购</th>
                        <th
                            class="w-[9em]"
                            title="Shop.lineup_condition_id：达成条件后才上架。文案来自 wiki 的 Data:ShopCondition.tabx（Api/GetV2Extra.shopCondition），没录入时显示条件 id（0 / 空 = 无条件）"
                        >
                            出现条件
                        </th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="row in shop.items ?? []"
                        :key="`${row.shop_id}-${row.content_id}`"
                        :class="rowClass(row)"
                        @click="open(row)"
                    >
                        <td class="text-left">
                            {{ row.name ?? '—' }}
                            <span v-if="relicRank(row)" class="text-yellow-300 whitespace-nowrap">
                                {{ '★'.repeat(relicRank(row)) }}
                            </span>
                            <span
                                v-if="(row.quantity ?? 1) > 1"
                                class="ml-1 opacity-60 text-xs whitespace-nowrap"
                            >
                                ×{{ row.quantity }}
                            </span>
                            <!-- 分时段上架（悬赏勋章的技能书按月轮换）：同一本书会有多行不同时段 -->
                            <div v-if="shopWindowText(row)" class="text-xs whitespace-nowrap">
                                <span :class="SHOP_WINDOW_STATE_CLASS[shopWindowState(row)]">
                                    [{{ shopWindowState(row) }}]
                                </span>
                                <span class="opacity-50">{{ shopWindowText(row) }}</span>
                            </div>
                        </td>
                        <td class="whitespace-nowrap">{{ row.price ?? 0 }}</td>
                        <td class="whitespace-nowrap">
                            <span v-if="limitText(row)">{{ limitText(row) }}</span>
                            <span v-else class="opacity-40">—</span>
                        </td>
                        <td class="whitespace-nowrap text-xs">
                            <span v-if="conditionText(row)" class="opacity-80">
                                {{ conditionText(row) }}
                            </span>
                            <span v-else class="opacity-40">—</span>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>

        <!-- 商品行自己的弹窗：物品 / 装备（商店页、商店 modal、内联列表共用这一份） -->
        <ItemModal v-model:show="itemShow" :item="selectedItem" />
        <EquipmentModal v-model:show="equipShow" :identification="selectedIdent" />
    </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useWikiDataStore } from '../../stores/wikiData';
import EquipmentModal from './EquipmentModal.vue';
import ItemModal from './ItemModal.vue';
import {
    CURRENCY_LABELS,
    LIMIT_LABELS,
    SHOP_WINDOW_STATE_CLASS,
    shopWindowState,
    shopWindowText,
    type ItemDoc,
} from './itemTypes';
import type { ShopDoc, ShopItemRow } from './shopTypes';

defineOptions({ name: '商店商品表' });

/**
 * 商店页右侧那张商品表。
 *
 * 三处共用：商店页（`ShopPanel`）、内联 `{{商店}}` 打开的 modal（`ShopModal`）、
 * 内联 `{{商店列表}}`，所以样式只维护这一份。
 */
const props = defineProps<{
    shop: ShopDoc;
    /** 是否显示店铺抬头（名字 + 货币 / 开放时间） */
    showHeader?: boolean;
    /** 表格滚动区最大高度；不传表示不限高（内联列表用） */
    maxHeight?: string | null;
}>();

const wiki = useWikiDataStore();

/** 当前店铺使用的货币；兑换点数用商店层级的点数名（银鳞硬币 / 公会点数 …），比「兑换点数」具体 */
const currencies = computed(() => {
    const labels = new Set<string>();
    for (const item of props.shop.items ?? []) {
        const label = item.currency_name ?? CURRENCY_LABELS[item.currency ?? 0];
        if (!label) continue;
        labels.add(label === '兑换点数' && props.shop.point_name ? props.shop.point_name : label);
    }
    return [...labels];
});

const formatDate = (seconds: number) => new Date(seconds * 1000).toLocaleDateString('zh-CN');

// 上架时段 / 状态的格式化在 `itemTypes.ts`（`shopWindowText` / `shopWindowState`），
// 商店表与物品 / 装备 modal 共用同一份，避免三处逻辑漂移。

/** 限购文案；空串 = 不限购（表格里显示为暗色横线） */
const limitText = (item: ShopItemRow) => {
    if (!item.limit_kind) return item.limit_num ? `共 ${item.limit_num} 次` : '';
    const period = item.limit_kind === 4 ? '限购' : (LIMIT_LABELS[item.limit_kind] ?? '');
    const times = item.limit_num ? `${item.limit_num} 次` : '';
    return [period, times].filter(Boolean).join(' ');
};

/**
 * 出现条件（`Shop.lineup_condition_id`）：达成后才上架，空串 = 无条件。
 * 文案来自人工表 `Api/GetV2Extra.shopCondition`（wiki 的 `Data:ShopCondition.tabx`）；
 * 官方 masterdata 里没有这些 id 的文案表（见 docs/07-shops.md §4），没录入时退回显示 id。
 */
const conditionText = (item: ShopItemRow) => {
    if (!item.condition) return '';
    const id = String(item.condition);
    return wiki.shopConditions[id] || id;
};

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
