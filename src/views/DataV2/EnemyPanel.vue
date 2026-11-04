<template>
    <div class="flex flex-col gap-3">
        <div class="flex flex-wrap items-center gap-2">
            <NInput
                v-model:value="keyword"
                clearable
                placeholder="搜索敌人名（中/日/英）、图鉴编号或 ID"
                class="w-72!"
            />
            <NSelect
                v-model:value="race"
                :options="raceOptions"
                clearable
                filterable
                placeholder="种族"
                class="w-40!"
            />
            <NSelect
                v-model:value="attribute"
                :options="attributeOptions"
                clearable
                placeholder="属性"
                class="w-28!"
            />
            <NSelect
                v-model:value="kind"
                :options="kindOptions"
                clearable
                placeholder="强度"
                class="w-32!"
            />
            <NSelect v-model:value="category" :options="categoryOptions" placeholder="类型" class="w-36!" />
            <NSelect
                v-if="canEdit"
                v-model:value="aiType"
                :options="aiTypeOptions"
                clearable
                filterable
                placeholder="AI 类型"
                class="w-48!"
            />
            <NCheckbox v-model:checked="bookOnly">只看图鉴</NCheckbox>
            <NButton size="small" type="error" @click="resetFilter">重置</NButton>
        </div>

        <div>共有 {{ aiTypeActive ? variantResults.length : filtered.length }} 条</div>

        <!-- 未按 AI 类型过滤：按敌人分类列表 -->
        <template v-if="!aiTypeActive">
            <div v-if="filtered.length" class="flex flex-col gap-3">
                <NPagination v-model:page="page" :page-count="pageCount" />

                <div class="overflow-x-auto">
                    <table class="wikitable w-full table-fixed! text-center m-0! min-w-[900px]">
                        <thead class="sticky top-0 z-10">
                            <tr>
                                <th class="w-[6em]">编号</th>
                                <th>敌人</th>
                                <th class="w-[8em]">种族</th>
                                <th class="w-[6em]">属性</th>
                                <th class="w-[6em]">弱点</th>
                                <th class="w-[12em]">强度</th>
                                <th class="w-[6em]">等级</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="row in pageRows"
                                :key="row.id"
                                class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                                @click="open(row.id)"
                                @contextmenu.prevent="showMenu($event, row)"
                            >
                                <td class="whitespace-nowrap">
                                    <template v-if="row.no">No.{{ row.no }}</template>
                                    <span v-else class="opacity-40">—</span>
                                </td>
                                <td class="text-left">
                                    <div class="flex flex-wrap items-center gap-1">
                                        <span>{{ row.name }}</span>
                                        <NTag v-if="row.boss" size="tiny" type="error" :bordered="false">首领</NTag>
                                        <NTag v-if="!row.no" size="tiny" :bordered="false">无图鉴</NTag>
                                    </div>
                                    <div class="text-xs opacity-40">{{ row.name_jp }}</div>
                                </td>
                                <td class="whitespace-nowrap">{{ row.race.name ?? '—' }}</td>
                                <td class="break-words" :class="row.attribute.length ? undefined : 'opacity-40'">
                                    {{ row.attribute.length ? names(row.attribute) : '无' }}
                                </td>
                                <td class="break-words" :class="row.weak.length ? undefined : 'opacity-40'">
                                    {{ row.weak.length ? names(row.weak) : '无' }}
                                </td>
                                <td class="break-words">{{ row.kind_names.length ? row.kind_names.join(' / ') : '—' }}</td>
                                <td class="whitespace-nowrap">
                                    {{ row.level ? (row.level.min === row.level.max ? row.level.min : `${row.level.min}-${row.level.max}`) : '—' }}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <NPagination v-model:page="page" :page-count="pageCount" />
            </div>
        </template>

        <!-- 按 AI 类型过滤：按变体列表，只列有该 type 的变体 -->
        <template v-else>
            <div v-if="variantResults.length" class="flex flex-col gap-3">
                <NPagination v-model:page="variantPage" :page-count="variantPageCount" />

                <div class="overflow-x-auto">
                    <table class="wikitable w-full table-fixed! text-center m-0! min-w-[760px]">
                        <thead class="sticky top-0 z-10">
                            <tr>
                                <th class="w-[6em]">编号</th>
                                <th>敌人</th>
                                <th class="w-[10em]">变体</th>
                                <th class="w-[7em]">等级</th>
                                <th>匹配条件（type {{ aiType }}）</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr
                                v-for="item in variantPageRows"
                                :key="`${item.enemy.id}-${item.variant.id}`"
                                class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                                @click="openVariant(item.enemy.id, item.variant.id)"
                            >
                                <td class="whitespace-nowrap">
                                    <template v-if="item.enemy.no">No.{{ item.enemy.no }}</template>
                                    <span v-else class="opacity-40">—</span>
                                </td>
                                <td class="text-left">
                                    <div>{{ item.enemy.name }}</div>
                                    <div class="text-xs opacity-40">{{ item.enemy.name_jp }}</div>
                                </td>
                                <td class="whitespace-nowrap">
                                    <div>{{ item.variant.kind_name ?? '—' }}</div>
                                    <div class="text-xs opacity-40">#{{ item.variant.id }}</div>
                                </td>
                                <td class="whitespace-nowrap">
                                    {{ item.variant.level_min === item.variant.level_max ? item.variant.level_min : `${item.variant.level_min}-${item.variant.level_max}` }}
                                </td>
                                <td class="text-left">
                                    <div v-for="(condition, ci) in item.conditions" :key="ci" class="text-sm">
                                        {{ conditionText(condition) }}
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <NPagination v-model:page="variantPage" :page-count="variantPageCount" />
            </div>
            <div v-else class="text-gray-400 p-4 text-center">没有匹配的变体</div>
        </template>

        <EnemyModal v-model:show="modal" :enemy-id="currentId" :enemy-variant-id="currentVariantId" />

        <CopyTemplateMenu
            :show="menu.show"
            :x="menu.x"
            :y="menu.y"
            template="敌人"
            @copy="copyTemplate"
        />
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NInput, NPagination, NSelect, NTag } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { MwConfig } from '../../huiji/MwConfig';
import CopyTemplateMenu from './CopyTemplateMenu.vue';
import EnemyModal from './EnemyModal.vue';
import { useDataV2Store } from './dataV2Store';
import { usePersistentRef } from './dataV2Settings';
import { templateBody, useCopyMenu } from './useCopyMenu';
import type { EnemyAiCondition, EnemyListItem, EnemyVariant } from './types';

defineOptions({ name: '敌人面板V2' });

const PAGE_SIZE = 20;

/** 层主（enemy_species 11~18）不放进种族过滤器 */
const FLOOR_BOSS_RACE_IDS = new Set([11, 12, 13, 14, 15, 16, 17, 18]);

type EnemyCategoryKey = 'all' | 'normal' | 'boss' | 'unbooked';

const store = useDataV2Store();

const keyword = usePersistentRef('enemy.keyword', '');
const race = usePersistentRef<number | null>('enemy.race', null);
const attribute = usePersistentRef<number | null>('enemy.attribute', null);
const kind = usePersistentRef<number | null>('enemy.kind', null);
/** 默认把解包里有、图鉴里没有的分类也列出来（测试数据也在内） */
const bookOnly = usePersistentRef('enemy.bookOnly', false);
const category = usePersistentRef<EnemyCategoryKey>('enemy.category', 'all');
/** 按敌人 AI 的 condition_type 过滤（仅 canEdit 时可用；空 = 不过滤） */
const aiType = usePersistentRef<number | null>('enemy.aiType', null);

const canEdit = MwConfig.getInstance().canEdit;
/** 过滤器仅 canEdit 可用；持久化的旧值在非 canEdit 下不生效 */
const aiTypeActive = computed(() => canEdit && aiType.value != null);

const page = ref(1);

const modal = ref(false);
const currentId = ref<number | null>(null);
const currentVariantId = ref<number | null>(null);

const open = (id: number) => {
    currentVariantId.value = null;
    currentId.value = id;
    modal.value = true;
};

/** 点变体行：连同变体 id 一起打开，modal 会自动定位到该变体 */
const openVariant = (enemyId: number, variantId: number) => {
    currentVariantId.value = variantId;
    currentId.value = enemyId;
    modal.value = true;
};

// 右击行 → 复制 {{敌人|名字|ID}}
const { menu, showMenu, copyTemplate } = useCopyMenu<EnemyListItem>('敌人', (row) =>
    templateBody(row.name, row.id),
);

const categoryOptions = [
    { value: 'all', label: '全部' },
    { value: 'normal', label: '普通怪物' },
    { value: 'boss', label: '首领怪物' },
    { value: 'unbooked', label: '无图鉴怪物' },
];

const raceOptions = computed(() =>
    [...store.enemyById.values()]
        .map((enemy) => enemy.race)
        .filter((item, index, rows) => rows.findIndex((row) => row.id === item.id) === index)
        .filter((item) => !FLOOR_BOSS_RACE_IDS.has(item.id))
        .sort((a, b) => a.id - b.id)
        .map((item) => ({ value: item.id, label: item.name ?? `#${item.id}` })),
);

const attributeOptions = computed(() => {
    const ids = new Set<number>();
    for (const enemy of store.enemies) for (const item of enemy.attribute) ids.add(item.id);
    return [...ids]
        .sort((a, b) => a - b)
        .map((id) => ({ value: id, label: store.enumText('attribute', id) ?? `#${id}` }));
});

const kindOptions = computed(() => {
    const ids = new Set<number>();
    for (const enemy of store.enemies) for (const id of enemy.kinds) ids.add(id);
    return [...ids]
        .sort((a, b) => a - b)
        .map((id) => ({ value: id, label: store.enemyKindName(id) ?? `#${id}` }));
});

const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    const asId = /^\d+$/.test(kw);
    const rows = store.enemies.filter((enemy) => {
        if (category.value === 'boss' && !enemy.boss) return false;
        if (category.value === 'normal' && (enemy.boss || !enemy.no)) return false;
        if (category.value === 'unbooked' && enemy.no) return false;
        if (bookOnly.value && !enemy.no) return false;
        if (race.value != null && enemy.race.id !== race.value) return false;
        if (attribute.value != null && !enemy.attribute.some((item) => item.id === attribute.value)) {
            return false;
        }
        if (kind.value != null && !enemy.kinds.includes(kind.value)) return false;
        if (!kw) return true;
        if (asId) {
            return String(enemy.id) === kw || String(enemy.no ?? '') === kw;
        }
        return [enemy.name, enemy.name_jp, enemy.name_en]
            .filter(Boolean)
            .some((value) => String(value).toLowerCase().includes(kw));
    });
    // 图鉴条目按图鉴序号排，没有图鉴的排到最后（按分类 id）
    return rows.sort((a, b) => {
        if (a.no && b.no) return a.no - b.no;
        if (a.no) return -1;
        if (b.no) return 1;
        return a.id - b.id;
    });
});

const pageRows = computed(() =>
    filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
);

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)));

watch(filtered, () => {
    page.value = 1;
});

// ---------- 敌人 AI 条件类型（condition_type）过滤 ----------
// 清洗时 ``condition_display()`` 把条件类型翻成了文案：已识别的写成可读文案 / 前缀，
// 未识别的兜底成 ``type N(参数)``。这里据此反推数值 type：
//   * 已识别：0 无条件 / 1 HP / 2 回合 / 17 自身状态 / 18 单位 / 22 敌人分类 / 31 我方状态
//   * 未识别：解析 ``type N``，只留 ID
const AI_TYPE_NAMES: Record<number, string> = {
    0: '无条件',
    1: 'HP',
    2: '回合',
    17: '自身状态',
    18: '单位',
    22: '敌人分类',
    31: '我方状态',
};

const aiTypeOf = (condition: EnemyAiCondition): number | null => {
    if (condition.label === '自身处于') return 17;
    if (condition.label === '单位') return 18;
    if (condition.label === '敌人分类') return 22;
    if (condition.label === '我方') return 31;
    const text = condition.text?.trim() ?? '';
    if (!text) return null;
    if (text === '无条件') return 0;
    if (text.startsWith('HP ') || text === 'HP 条件') return 1;
    if (text.startsWith('第 ') || text === '回合条件') return 2;
    // 参数为空时 condition_display 会退化成「xx条件」文案
    if (text === '自身状态条件') return 17;
    if (text === '单位条件') return 18;
    if (text === '敌人分类条件') return 22;
    if (text === '我方状态条件') return 31;
    const match = /^type (\d+)/.exec(text);
    return match ? Number(match[1]) : null;
};

/** 一个变体里所有触发条件（行动规则 + 插入） */
const variantConditions = (variant: EnemyVariant): EnemyAiCondition[] => [
    ...variant.ai_plan.flatMap((rule) => rule.conditions),
    ...variant.interrupts.flatMap((hit) => hit.conditions),
];

/** 条件展示文案：有整段文案直接用，否则拼「前缀 + 状态/引用 + 后缀」 */
const conditionText = (condition: EnemyAiCondition): string => {
    if (condition.text) return condition.text;
    const mid =
        condition.status != null
            ? (store.effectKinds[String(condition.status)]?.name ?? `#${condition.status}`)
            : condition.ref != null
              ? `#${condition.ref}`
              : '';
    return `${condition.label ?? ''}${mid}${condition.suffix ?? ''}`.trim();
};

/** 下拉选项：已识别类型「ID 名称」，未识别只给 ID */
const aiTypeOptions = computed(() => {
    const types = new Set<number>();
    for (const enemy of store.enemies) {
        for (const variant of enemy.variants) {
            for (const condition of variantConditions(variant)) {
                const type = aiTypeOf(condition);
                if (type != null) types.add(type);
            }
        }
    }
    return [...types]
        .sort((a, b) => a - b)
        .map((type) => ({
            value: type,
            label: AI_TYPE_NAMES[type] ? `${type} ${AI_TYPE_NAMES[type]}` : `${type}`,
        }));
});

/** 按 type 过滤后的变体行（其余分类级过滤同样生效） */
const variantResults = computed(() => {
    if (!aiTypeActive.value || aiType.value == null) return [];
    const kw = keyword.value.trim().toLowerCase();
    const asId = /^\d+$/.test(kw);
    const rows: Array<{ enemy: EnemyListItem; variant: EnemyVariant; conditions: EnemyAiCondition[] }> = [];
    for (const enemy of store.enemies) {
        if (category.value === 'boss' && !enemy.boss) continue;
        if (category.value === 'normal' && (enemy.boss || !enemy.no)) continue;
        if (category.value === 'unbooked' && enemy.no) continue;
        if (bookOnly.value && !enemy.no) continue;
        if (race.value != null && enemy.race.id !== race.value) continue;
        if (attribute.value != null && !enemy.attribute.some((item) => item.id === attribute.value)) continue;
        if (kind.value != null && !enemy.kinds.includes(kind.value)) continue;
        if (kw) {
            if (asId) {
                if (String(enemy.id) !== kw && String(enemy.no ?? '') !== kw) continue;
            } else {
                const hit = [enemy.name, enemy.name_jp, enemy.name_en]
                    .filter(Boolean)
                    .some((value) => String(value).toLowerCase().includes(kw));
                if (!hit) continue;
            }
        }
        for (const variant of enemy.variants) {
            const conditions = variantConditions(variant).filter((condition) => aiTypeOf(condition) === aiType.value);
            if (conditions.length) rows.push({ enemy, variant, conditions });
        }
    }
    return rows.sort((a, b) => {
        if (a.enemy.no && b.enemy.no) return a.enemy.no - b.enemy.no || a.variant.id - b.variant.id;
        if (a.enemy.no) return -1;
        if (b.enemy.no) return 1;
        return a.enemy.id - b.enemy.id || a.variant.id - b.variant.id;
    });
});

const variantPage = ref(1);
const variantPageRows = computed(() =>
    variantResults.value.slice((variantPage.value - 1) * PAGE_SIZE, variantPage.value * PAGE_SIZE),
);
const variantPageCount = computed(() => Math.max(1, Math.ceil(variantResults.value.length / PAGE_SIZE)));

watch(variantResults, () => {
    variantPage.value = 1;
});

const names = (rows: Array<{ name?: string | null }>) =>
    rows.map((row) => row.name ?? '').filter(Boolean).join(' / ');

const resetFilter = () => {
    keyword.value = '';
    race.value = null;
    attribute.value = null;
    kind.value = null;
    bookOnly.value = false;
    category.value = 'all';
    aiType.value = null;
};
</script>
