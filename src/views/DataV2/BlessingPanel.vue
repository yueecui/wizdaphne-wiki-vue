<template>
    <div class="flex flex-col gap-3">
        <NAlert v-if="error" type="error" :bordered="false" closable @close="error = null">
            加护数据加载失败：{{ error }}
        </NAlert>

        <div class="flex flex-wrap items-center gap-2">
            <NInput v-model:value="keyword" clearable placeholder="加护名 / 效果 / ID" class="w-64!" />
            <NSelect v-model:value="rarity" :options="RARITY_OPTIONS" class="w-24!" placeholder="稀有度" />
            <NSelect v-model:value="pool" :options="poolOptions" class="w-40!" placeholder="加护池" />
            <!-- 加护池下有多组时再给一个「组」选择器，标签用它挂的楼层名 -->
            <NSelect
                v-if="poolGroupIds.length > 1"
                v-model:value="group"
                :options="groupOptions"
                class="w-56!"
                placeholder="加护组"
            />
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
        </div>

        <div v-if="loading" class="py-10 text-center opacity-70">加载中…</div>
        <template v-else-if="file">
            <div>共有 {{ filtered.length }} 种符合条件的加护</div>

            <div v-if="filtered.length" class="flex flex-col gap-3">
                <!-- 选了具体加护池时一页列完，不翻页 -->
                <NPagination v-if="pageCount > 1" v-model:page="page" :page-count="pageCount" />

                <div class="overflow-x-auto">
                    <table class="wikitable w-full text-center m-0!">
                        <colgroup>
                            <col class="w-[16em]!" />
                            <col class="w-[6em]!" />
                            <col />
                        </colgroup>
                        <thead>
                            <tr>
                                <th>加护</th>
                                <!-- 池选「全部」时跨池比较几率没有意义，直接显示权重 -->
                                <th>{{ pool ? '出现几率' : '权重' }}</th>
                                <th>效果</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="row in pageRows"
                                :key="row.id"
                                class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                                @click="open(row)"
                            >
                                <td class="text-left">
                                    <!-- 用 span 而不是 a：站点的 `a { color }` 会盖掉颜色类 -->
                                    <span
                                        class="cursor-pointer hover:underline"
                                        :class="rarityTextClass(row.rarity)"
                                    >
                                        {{ row.name || `#${row.id}` }}
                                    </span>
                                </td>
                                <td class="whitespace-nowrap">
                                    {{ pool ? chance(row.weight) : row.weight }}
                                </td>
                                <td class="text-left break-words">
                                    <span v-if="row.effects.length">
                                        {{ effectSummary(row.effects, file, kindLabel) }}
                                    </span>
                                    <span v-else class="opacity-40">—</span>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <NPagination v-if="pageCount > 1" v-model:page="page" :page-count="pageCount" />
            </div>
            <NEmpty v-else description="没有符合条件的加护" />
        </template>

        <BlessingModal v-model:show="modal" :blessing="current" :file="file" />
    </div>
</template>

<script setup lang="ts">
import { NAlert, NButton, NEmpty, NInput, NPagination, NSelect } from 'naive-ui';
import { computed, onMounted, ref, watch } from 'vue';
import BlessingModal from './BlessingModal.vue';
import { loadBlessingFile } from './blessingData';
import { effectSummary, poolName, rarityTextClass } from './blessingEffects';
import type { BlessingDoc, BlessingFile } from './blessingTypes';
import { useDataV2Store } from './dataV2Store';
import { usePersistentRef } from './dataV2Settings';

defineOptions({ name: '加护面板' });

const PAGE_SIZE = 25;

/** 稀有度筛选：-1 = 全部，0 白 / 1 绿 / 2 蓝 / 3 紫 */
const RARITY_OPTIONS = [
    { label: '全部', value: -1 },
    { label: '白', value: 0 },
    { label: '绿', value: 1 },
    { label: '蓝', value: 2 },
    { label: '紫', value: 3 },
];

const store = useDataV2Store();
/** 效果种类名：wiki 上维护的中文名优先（`Data:EffectKind.json`） */
const kindLabel = (kind: number) => store.effectKinds[String(kind)]?.name;

const file = ref<BlessingFile | null>(null);
const loading = ref(true);
const error = ref<string | null>(null);

const keyword = usePersistentRef('blessing.keyword', '');
const rarity = usePersistentRef('blessing.rarity', -1);
/** 0 = 全部加护池（池 id 都 ≥ 2000） */
const pool = usePersistentRef('blessing.pool', 0);
/** 0 = 未选组（池内全部） */
const group = usePersistentRef('blessing.group', 0);
const page = ref(1);

const modal = ref(false);
const current = ref<BlessingDoc | null>(null);

const items = computed(() => file.value?.items ?? []);

/** 加护池下的组（`group_id`），升序 */
const poolGroupIds = computed(() => {
    if (!pool.value) return [];
    return [...new Set(items.value.filter((row) => row.pool === pool.value).map((row) => row.group))].sort(
        (a, b) => a - b,
    );
});

/** 组本身没有名字，用挂它的楼层名来标（一个组可能对应多层） */
const layerText = (groupId: number) => {
    const layers = file.value?.groups?.[String(groupId)]?.layers ?? [];
    if (!layers.length) return `组 ${groupId}`;
    return layers.length > 2 ? `${layers[0]} 等 ${layers.length} 层` : layers.join(' / ');
};

const poolOptions = computed(() => {
    const values = [...new Set(items.value.map((row) => row.pool))].sort((a, b) => a - b);
    return [{ label: '全部', value: 0 }, ...values.map((value) => ({ label: poolName(value), value }))];
});

/** 组选择器只显示楼层名（不显示 group id） */
const groupOptions = computed(() =>
    poolGroupIds.value.map((groupId) => ({ label: layerText(groupId), value: groupId })),
);

/** 换池时默认落到最后一个组（例：初始的奈落 → B8F -最深处-） */
watch(pool, (value) => {
    const ids = poolGroupIds.value;
    group.value = value && ids.length ? ids[ids.length - 1] : 0;
    page.value = 1;
});

/** 组在别的池里（数据更新后可能对不上）就当没选 */
const activeGroup = computed(() =>
    poolGroupIds.value.includes(group.value) ? group.value : 0,
);

const filtered = computed(() => {
    const dict = file.value;
    const kw = keyword.value.trim().toLowerCase();
    return items.value.filter((row) => {
        if (rarity.value >= 0 && row.rarity !== rarity.value) return false;
        if (pool.value && row.pool !== pool.value) return false;
        // 组是累进的：选靠后的组时把前面的组一起算（20003 = 20001 + 20002 + 20003）
        if (activeGroup.value && row.group > activeGroup.value) return false;
        if (!kw) return true;
        if (String(row.id).includes(kw)) return true;
        if (`${row.name} ${row.name_jp ?? ''} ${row.name_en ?? ''}`.toLowerCase().includes(kw)) return true;
        // 效果文案也参与搜索：「亚人」「光属性」「攻击力」都能命中
        return dict ? effectSummary(row.effects, dict, kindLabel).toLowerCase().includes(kw) : false;
    });
});

/** 出现几率按当前列表重算（同池累进组内的权重占比） */
const totalWeight = computed(() => filtered.value.reduce((sum, row) => sum + (row.weight || 0), 0));

const chance = (weight: number) => {
    const total = totalWeight.value;
    if (!total || !weight) return '—';
    return `${((weight / total) * 100).toFixed(2)}%`;
};

/** 选了具体加护池（池内最多 34 条）时不分页，一页列完 */
const paged = computed(() => pool.value === 0);

const pageRows = computed(() =>
    paged.value
        ? filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE)
        : filtered.value,
);

const pageCount = computed(() =>
    paged.value ? Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)) : 1,
);

watch(filtered, () => {
    page.value = 1;
});

const open = (row: BlessingDoc) => {
    current.value = row;
    modal.value = true;
};

const resetFilter = () => {
    keyword.value = '';
    rarity.value = -1;
    pool.value = 0;
    group.value = 0;
};

onMounted(async () => {
    try {
        file.value = await loadBlessingFile();
    } catch (e) {
        error.value = e instanceof Error ? e.message : String(e);
    } finally {
        loading.value = false;
    }
});
</script>
