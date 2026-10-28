<template>
    <div class="flex flex-col gap-3">
        <!-- 二级导航：图鉴四类 + 杂物细分（角色抽卡 / 装备抽卡）+ 按类型细分 + 未分类 -->
        <div class="flex flex-wrap items-center gap-2">
            <template v-for="tab in groupTabs" :key="tab.value">
                <div v-if="tab.divider" class="w-px h-4 mx-1 bg-gray-500/40!"></div>
                <NButton
                    size="small"
                    :type="group === tab.value ? 'primary' : 'default'"
                    @click="group = tab.value"
                >
                    {{ tab.label }}
                </NButton>
            </template>
        </div>

        <!-- 过滤器：类型（原始英文类型）+ 文本 / 重置 -->
        <div class="flex flex-wrap items-center gap-2">
            <NInput
                v-model:value="keyword"
                placeholder="中文名 / 日文名 / ID"
                clearable
                class="w-60!"
            />
            <NSelect
                v-model:value="type"
                :options="typeOptions"
                placeholder="类型"
                clearable
                filterable
                class="w-64!"
            />
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
        </div>

        <div>共有 {{ filtered.length }} 个符合条件的物品</div>

        <div v-if="filtered.length" class="flex flex-col gap-3">
            <NPagination v-model:page="page" :page-count="pageCount" />

            <div class="overflow-x-auto">
                <table class="wikitable w-full table-fixed! text-center m-0!">
                    <thead class="sticky top-0 z-10">
                        <tr>
                            <th class="w-[5em]">编号</th>
                            <th class="w-[16em]">名称</th>
                            <th class="w-[9em]">分类</th>
                            <th class="w-[8em]">出售价格</th>
                            <th>描述</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="item in pageRows"
                            :key="item.id"
                            class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                            @click="open(item)"
                            @contextmenu.prevent="showMenu($event, item)"
                        >
                            <td class="whitespace-nowrap">
                                <template v-if="item.collection?.no != null">
                                    {{ formatCollectionNo(item.collection.no) }}
                                </template>
                                <span v-else class="opacity-40">—</span>
                            </td>
                            <td class="text-left">
                                <div class="truncate">
                                    {{ item.name ?? '—' }}
                                    <span v-if="item.relic?.rank" class="text-yellow-300">
                                        {{ '★'.repeat(item.relic.rank) }}
                                    </span>
                                </div>
                            </td>
                            <td class="whitespace-nowrap">{{ categoryOf(item) }}</td>
                            <td>
                                <template v-if="(item.value ?? 0) > 0">{{ item.value }}</template>
                                <span v-else class="opacity-40">—</span>
                            </td>
                            <td class="text-left opacity-70">
                                <div class="truncate">{{ cleanDescription(item.desc) }}</div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <NPagination v-model:page="page" :page-count="pageCount" />
        </div>

        <ItemModal v-model:show="showModal" :item="selected" />

        <CopyTemplateMenu
            :show="menu.show"
            :x="menu.x"
            :y="menu.y"
            template="物品"
            @copy="copyTemplate"
        />
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput, NPagination, NSelect } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { useWikiDataStore } from '../../stores/wikiData';
import CopyTemplateMenu from './CopyTemplateMenu.vue';
import ItemModal from './ItemModal.vue';
import { usePersistentRef } from './dataV2Settings';
import { templateBody, useCopyMenu } from './useCopyMenu';
import {
    cleanDescription,
    COLLECTION_GROUPS,
    compareCollectionNo,
    formatCollectionNo,
    isUnclassifiedItem,
    ITEM_GROUPS,
    itemGroupOf,
    JUNK_GROUP_LABELS,
    JUNK_GROUPS,
    type CollectionGroup,
    type ItemDoc,
    type ItemGroup,
    type JunkGroup,
} from './itemTypes';

defineOptions({ name: '物品面板' });

const PAGE_SIZE = 20;

/** 道具表由 IndexedDB 缓存统一提供（不再每次进页面重新拉接口） */
const wiki = useWikiDataStore();
const items = computed(() => wiki.items);

type GroupKey = 'all' | CollectionGroup | JunkGroup | ItemGroup | 'unclassified';

/** 图鉴分类（用于决定「按图鉴编号排序」这条规则是否生效） */
const isCollectionGroup = (key: GroupKey): key is CollectionGroup =>
    (COLLECTION_GROUPS as string[]).includes(key);

/** 按 `Item::*` 类型细分的六组 */
const isItemGroup = (key: GroupKey): key is ItemGroup => (ITEM_GROUPS as string[]).includes(key);

/** 杂物细分（角色抽卡 / 装备抽卡），页面上叫「骨头 / 杂物」 */
const isJunkGroup = (key: JunkGroup | ItemGroup): key is JunkGroup =>
    (JUNK_GROUPS as string[]).includes(key);

const labelOf = (name: JunkGroup | ItemGroup): string =>
    (JUNK_GROUP_LABELS as Record<string, string | undefined>)[name] ?? name;

/** 二级导航分段：段内按顺序排列，每段开头加分隔线 */
const NAV_SECTIONS: Array<Array<JunkGroup | ItemGroup>> = [
    ['其他消耗品', '遗物', '精炼石'],
    ['技能书', '转职书'],
    ['角色抽卡', '装备抽卡', '通行证'],
];

// 过滤器持久化（对齐 V1 的 itemFilter）
const keyword = usePersistentRef('item.keyword', '');
/** 类型筛选：`Item::Expendable` 这类原始类型的英文短名 */
const type = usePersistentRef<string | null>('item.type', null);
/** 二级导航：全部 / 图鉴四类 / 杂物细分 / 类型组 / 未分类 */
const group = usePersistentRef<GroupKey>('item.group', 'all');
const page = ref(1);

const showModal = ref(false);
const selected = ref<ItemDoc | null>(null);

// 右击行 → 复制 {{物品|名字|ID}}
const { menu, showMenu, copyTemplate } = useCopyMenu<ItemDoc>('物品', (row) =>
    templateBody(row.name, row.id),
);

const groupTabs = computed<Array<{ label: string; value: GroupKey; divider?: boolean }>>(() => {
    const tabs: Array<{ label: string; value: GroupKey; divider?: boolean }> = [
        { label: `全部 ${items.value.length}`, value: 'all' },
    ];

    /** 段内顺序排列，只有段首才画分隔线 */
    const pushSection = (entries: Array<{ label: string; value: GroupKey }>) => {
        entries.forEach((entry, index) => tabs.push({ ...entry, divider: index === 0 }));
    };

    pushSection(
        COLLECTION_GROUPS.map((name) => ({
            label: `${name} ${items.value.filter((item) => item.collection_group === name).length}`,
            value: name as GroupKey,
        })),
    );

    for (const section of NAV_SECTIONS) {
        pushSection(
            section.map((name) => ({
                label: `${labelOf(name)} ${
                    items.value.filter((item) =>
                        isJunkGroup(name) ? item.junk_group === name : itemGroupOf(item) === name,
                    ).length
                }`,
                value: name as GroupKey,
            })),
        );
    }

    // 未分类紧接最后一段，不再单独加分隔线
    tabs.push({
        // 既不在图鉴四类、也不是两种抽卡的剩余道具
        label: `未分类 ${items.value.filter(isUnclassifiedItem).length}`,
        value: 'unclassified',
    });

    return tabs;
});

/** `Item::Expendable` -> `Expendable` */
const shortType = (value?: string) => (value ?? '').replace('Item::', '') || '—';

const typeOptions = computed(() =>
    [...new Set(items.value.map((item) => shortType(item.type)).filter((name) => name !== '—'))]
        .sort((a, b) => a.localeCompare(b))
        .map((name) => ({ label: name, value: name })),
);

/** 列表「分类」列：与二级导航同一套归属，图鉴分类优先 */
const categoryOf = (item: ItemDoc): string => {
    if (item.collection_group) return item.collection_group;
    if (item.junk_group && item.junk_group !== '未分类') return JUNK_GROUP_LABELS[item.junk_group];
    return itemGroupOf(item) ?? '未分类';
};

const filtered = computed(() => {
    const kw = keyword.value.trim();
    const lower = kw.toLowerCase();
    const numeric = /^\d+$/.test(kw);

    const rows = items.value.filter((item) => {
        if (group.value === 'unclassified') {
            // 未分类 = 图鉴四类 + 两种抽卡之外的全部道具
            if (!isUnclassifiedItem(item)) return false;
        } else if (group.value !== 'all') {
            if (isCollectionGroup(group.value)) {
                if (item.collection_group !== group.value) return false;
            } else if (isItemGroup(group.value)) {
                if (itemGroupOf(item) !== group.value) return false;   // 技能书 / 转职书 / 遗物 …
            } else if (item.junk_group !== group.value) {
                return false;   // 杂物细分：角色抽卡 / 装备抽卡
            }
        }
        if (type.value && shortType(item.type) !== type.value) return false;
        if (!kw) return true;
        // 中文 / 日文名模糊
        if ((item.name ?? '').toLowerCase().includes(lower)) return true;
        if ((item.name_jp ?? '').toLowerCase().includes(lower)) return true;
        // 数据 id / 图鉴编号（编号按原始值匹配，EX 也一样）
        if (!numeric) return false;
        return String(item.id) === kw || String(item.collection?.no ?? '') === kw;
    });

    // 「全部」与图鉴视图按图鉴编号排序：普通编号 → EX → 无编号（无编号内部按数据 id）；
    // 其余页签按游戏的 ``Item.sort_id``（同值按 id）。**必须显式排序**：线上接口返回的
    // items 顺序不定，缓存（IndexedDB）出来又是按主键 id 排的，只有本地 mock 的顺序是对的
    if (group.value !== 'all' && !isCollectionGroup(group.value)) {
        return [...rows].sort(
            (a, b) => (a.sort_id ?? 0) - (b.sort_id ?? 0) || (a.id ?? 0) - (b.id ?? 0),
        );
    }
    return [...rows].sort(
        (a, b) =>
            compareCollectionNo(a.collection?.no, b.collection?.no) || (a.id ?? 0) - (b.id ?? 0),
    );
});

const pageRows = computed(() =>
    filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));

watch([keyword, type, group], () => {
    page.value = 1;
});

const resetFilter = () => {
    keyword.value = '';
    type.value = null;
    group.value = 'all';
};

const open = (item: ItemDoc) => {
    selected.value = item;
    showModal.value = true;
};

</script>
