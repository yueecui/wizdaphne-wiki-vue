<template>
    <div class="flex flex-col gap-4 px-2 -mx-2">
        <!-- 过滤器：与 V1 遗物酒页面同一套布局 -->
        <div class="flex flex-col gap-2">
            <div class="flex flex-wrap flex-row gap-2 items-start">
                <div class="flex flex-col w-60">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">搜索词</label>
                    </div>
                    <div class="flex items-center h-12">
                        <NInput v-model:value="filter.searchText" size="small" clearable />
                    </div>
                </div>

                <div class="flex flex-col w-24">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">性格</label>
                    </div>
                    <div class="flex items-center h-12">
                        <NSelect v-model:value="filter.align" size="small" :options="alignOptions" />
                    </div>
                </div>

                <div class="flex flex-col w-32">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">提升属性</label>
                    </div>
                    <div class="flex items-center h-12">
                        <NSelect v-model:value="filter.inc" size="small" :options="statOptions" />
                    </div>
                </div>

                <div class="flex flex-col w-32">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">降低属性</label>
                    </div>
                    <div class="flex items-center h-12">
                        <NSelect v-model:value="filter.dec" size="small" :options="statOptions" />
                    </div>
                </div>

                <div class="flex flex-col w-32">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">推荐类别</label>
                    </div>
                    <div class="flex items-center h-12">
                        <NSelect v-model:value="filter.category" size="small" :options="categoryOptions" />
                    </div>
                </div>

                <div class="flex flex-col w-56">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm"></label>
                    </div>
                    <div class="flex items-center h-12">
                        <NCheckbox v-model:checked="filter.showOnlyDoubleInc">仅显示双提升遗物</NCheckbox>
                    </div>
                </div>
            </div>

            <div class="flex flex-wrap items-center gap-2">
                <NButton size="small" type="error" @click="reset">重置</NButton>
                <NCheckbox v-model:checked="showBrew" size="small">显示遗物酒名</NCheckbox>
                <NCheckbox v-model:checked="showPower" size="small">显示遗物之力</NCheckbox>
                <div class="flex-1"></div>
                <NButton size="tiny" quaternary :loading="loading" @click="wiki.refresh()">重新加载</NButton>
            </div>
        </div>

        <div class="text-xs opacity-70">共 {{ filtered.length }} 件遗物</div>

        <NPagination v-if="pageCount > 1" v-model:page="page" :page-count="pageCount" size="small" />

        <table class="wikitable w-full text-center m-0!">
            <thead>
                <tr>
                    <th class="xl:w-52">遗物名称</th>
                    <th v-if="showBrew" class="xl:w-36">遗物酒名</th>
                    <th v-if="showPower" class="xl:w-36">遗物之力</th>
                    <th class="xl:w-16">性格</th>
                    <th class="xl:w-40">提升属性</th>
                    <th class="xl:w-40">降低属性</th>
                    <th class="xl:w-40">掉落怪物</th>
                </tr>
            </thead>
            <tbody>
                <tr v-if="!filtered.length">
                    <td :colspan="columns" class="text-gray-400">
                        没有符合条件的遗物
                    </td>
                </tr>
                <tr
                    v-for="relic in paged"
                    :key="relic.id"
                    class="hover:bg-[#3a312a]!"
                    @contextmenu.prevent="showMenu($event, relic)"
                >
                    <td class="text-left">
                        <span
                            v-if="relic.skill_id != null"
                            class="cursor-pointer hover:text-light"
                            @click="openSkill(relic)"
                        >
                            {{ relic.name ?? '—' }}
                        </span>
                        <template v-else>{{ relic.name ?? '—' }}</template>
                    </td>
                    <td v-if="showBrew">{{ relic.brew ?? '—' }}</td>
                    <td v-if="showPower">{{ relic.power ?? '—' }}</td>
                    <td>{{ relic.align ?? '—' }}</td>
                    <td>{{ sortRelicStats(relic.inc).join(' / ') || '—' }}</td>
                    <td>{{ sortRelicStats(relic.dec).join(' / ') || '—' }}</td>
                    <td>
                        <template v-if="relic.monsters?.length">
                            <template v-for="(monster, index) in relic.monsters" :key="monster.id ?? index">
                                <span
                                    v-if="enemyIdOf(monster.id) != null"
                                    class="cursor-pointer hover:text-light"
                                    @click="openEnemy(monster.id)"
                                >
                                    {{ monster.name ?? `#${monster.id}` }}
                                </span>
                                <template v-else>{{ monster.name ?? `#${monster.id}` }}</template>
                                <span v-if="index < relic.monsters.length - 1" class="opacity-40"> / </span>
                            </template>
                        </template>
                        <span v-else class="opacity-40">—</span>
                    </td>
                </tr>
            </tbody>
        </table>

        <NPagination v-if="pageCount > 1" v-model:page="page" :page-count="pageCount" size="small" />

        <!-- 点击遗物名称 → 展开它的遗物之力（技能详情） -->
        <SkillModal v-model:show="skillShow" :identification="skillId" />
        <!-- 点击掉落怪物 → 展开对应敌人详情 -->
        <EnemyModal v-model:show="enemyShow" :enemy-id="enemyId" />

        <CopyTemplateMenu
            :show="menu.show"
            :x="menu.x"
            :y="menu.y"
            template="遗物"
            @copy="copyTemplate"
        />
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NInput, NPagination, NSelect } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { useWikiDataStore } from '../../stores/wikiData';
import CopyTemplateMenu from './CopyTemplateMenu.vue';
import EnemyModal from './EnemyModal.vue';
import SkillModal from './SkillModal.vue';
import { useDataV2Store } from './dataV2Store';
import { usePersistentRef } from './dataV2Settings';
import { templateBody, useCopyMenu } from './useCopyMenu';
import { RELIC_ALIGNMENTS, RELIC_STAT_ORDER, sortRelicStats, type RelicDoc } from './relicTypes';

interface RelicFilter {
    searchText: string;
    align: string;
    inc: string;
    dec: string;
    category: string;
    showOnlyDoubleInc: boolean;
}

const emptyFilter = (): RelicFilter => ({
    searchText: '',
    align: '',
    inc: '',
    dec: '',
    category: '',
    showOnlyDoubleInc: false,
});

/** 遗物表由 IndexedDB 缓存统一提供（`Api/GetV2Item.relics`，不再每次进页面重新拉） */
const wiki = useWikiDataStore();
const relics = computed(() => wiki.relics);
const loading = computed(() => wiki.status === 'loading');

// 过滤器持久化（对齐 V1 的 relicBrewFilter）
const filter = usePersistentRef<RelicFilter>('relic.filter', emptyFilter());
const showBrew = ref(false);
const showPower = ref(false);

const alignOptions = [{ label: '全部', value: '' }, ...RELIC_ALIGNMENTS.map((value) => ({ label: value, value }))];

const statOptions = [{ label: '全部', value: '' }, ...RELIC_STAT_ORDER.map((value) => ({ label: value, value }))];

/** 推荐类别：顺序以 `relics_ccate` 为准，缺省时按遗物上出现过的类别兜底 */
const categoryOptions = computed(() => {
    const fromData = wiki.relicCategories;
    const categories = fromData.length
        ? fromData
        : [...new Set(relics.value.flatMap((relic) => relic.categories ?? []))];
    return [{ label: '全部', value: '' }, ...categories.map((value) => ({ label: value, value }))];
});

const filtered = computed(() => {
    const { searchText, align, inc, dec, category, showOnlyDoubleInc } = filter.value;
    const keyword = searchText.trim().toLowerCase();
    return relics.value.filter((relic) => {
        if (keyword) {
            const hay = `${relic.name ?? ''} ${relic.brew ?? ''} ${relic.power ?? ''}`.toLowerCase();
            if (!hay.includes(keyword)) return false;
        }
        if (align && relic.align !== align) return false;
        if (inc && !(relic.inc ?? []).includes(inc)) return false;
        if (dec && !(relic.dec ?? []).includes(dec)) return false;
        if (category && !(relic.categories ?? []).includes(category)) return false;
        if (showOnlyDoubleInc && (relic.inc ?? []).length < 2) return false;
        return true;
    });
});

// 名称 / 性格 / 提升 / 降低 / 掉落怪物 = 5，酒名与遗物之力按开关追加
const columns = computed(() => 5 + (showBrew.value ? 1 : 0) + (showPower.value ? 1 : 0));

const pageSize = 20;
const page = ref(1);
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)));
const paged = computed(() => filtered.value.slice((page.value - 1) * pageSize, page.value * pageSize));

watch(
    () => filter.value,
    () => {
        page.value = 1;
    },
    { deep: true },
);

const reset = () => {
    filter.value = emptyFilter();
};

// 右击行 → 复制 {{遗物|名字|ID}}
const { menu, showMenu, copyTemplate } = useCopyMenu<RelicDoc>('遗物', (row) =>
    templateBody(row.name, row.id),
);

const skillShow = ref(false);
const skillId = ref<number | null>(null);

const openSkill = (relic: RelicDoc) => {
    if (relic.skill_id == null) return;
    skillId.value = relic.skill_id;
    skillShow.value = true;
};

/** 敌人模块按图鉴分类 id 打开，遗物里给的是图鉴编号（`no`），先建索引反查 */
const store = useDataV2Store();
const enemyIdByNo = computed(() => {
    const out = new Map<number, number>();
    for (const enemy of store.enemies) {
        if (enemy.no != null) out.set(enemy.no, enemy.id);
    }
    return out;
});

const enemyIdOf = (no?: number) => (no == null ? null : enemyIdByNo.value.get(no) ?? null);

const enemyShow = ref(false);
const enemyId = ref<number | null>(null);

const openEnemy = (no?: number) => {
    const id = enemyIdOf(no);
    if (id == null) return;
    enemyId.value = id;
    enemyShow.value = true;
};
</script>
