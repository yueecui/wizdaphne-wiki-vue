<template>
    <ThemeConfigProvider>
        <NModal :show="show" @update:show="onShowUpdate" @esc="close" @mask-click="close">
            <div class="w-[95vw] md:w-[880px] h-[88vh] m-auto flex flex-col huiji-css-hook bg-transparent!">
                <div class="flex flex-col min-h-0 bg-[#312721]! border! border-[#463d38]! rounded">
                    <div class="shrink-0 bg-[#312721] px-4 pt-3 pb-2 border-b! border-[#463d38]!">
                        <div class="flex items-start gap-3">
                            <WikiImg
                                v-if="item?.icon"
                                :imageName="`${item.icon}.png`"
                                class="w-16 h-16 object-contain shrink-0 self-center"
                            />
                            <div class="flex-1 min-w-0">
                                <div v-if="item" class="text-sm text-light">
                                    <template v-if="item.collection_id === 'EX'">Ex</template>
                                    <template v-else-if="item.collection_id !== null">
                                        No. {{ item.collection_id }}
                                    </template>
                                    <template v-else>无图鉴</template>
                                </div>
                                <div
                                    class="text-2xl md:text-3xl text-light font-bold break-words flex items-baseline gap-3"
                                >
                                    <span>{{ item?.name ?? '装备详情' }}</span>
                                    <span v-if="item?.soucate === 9" class="text-sm text-blue-300">特典</span>
                                </div>
                                <div v-if="item?.name_jp" class="text-sm text-gray-400 break-words">
                                    {{ item.name_jp }}
                                </div>
                            </div>
                            <div class="flex items-center gap-3 shrink-0">
                                <span v-if="item" class="text-xs text-gray-600">ID {{ item.id }}</span>
                                <NButton size="tiny" quaternary @click="close">关闭</NButton>
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-4 flex flex-col gap-4">
                        <template v-if="item">
                            <!-- 基础信息 + 特效 / 妖精技能 -->
                            <div class="flex flex-col md:flex-row gap-4">
                                <div class="flex-1">
                                    <table class="wikitable w-full text-center m-0!">
                                        <tbody>
                                            <tr>
                                                <th colspan="2">基础</th>
                                            </tr>
                                            <tr>
                                                <th class="w-[7em]">装备类型</th>
                                                <td>{{ item.type ?? '—' }}</td>
                                            </tr>
                                            <tr>
                                                <th>阶级</th>
                                                <td>{{ item.rank }}</td>
                                            </tr>
                                            <tr>
                                                <th>说明</th>
                                                <td class="text-left">
                                                    <div class="text-sm">
                                                        <div v-if="item.req.length" class="text-red-400">
                                                            职业限制：{{ item.req.join('、') }}
                                                        </div>
                                                        <div v-if="item.fa_can === 1" class="text-light">
                                                            妖精可装备
                                                        </div>
                                                        <div v-if="item.fa_can === 2" class="text-light">
                                                            仅可由妖精装备
                                                        </div>
                                                        <div v-if="item.desc" v-html="renderDesc(item.desc)"></div>
                                                    </div>
                                                </td>
                                            </tr>
                                            <tr v-if="item.sou.length">
                                                <th>非杂物来源</th>
                                                <td class="text-left">
                                                    <div class="flex flex-col gap-2">
                                                        <div
                                                            v-for="(source, index) in item.sou"
                                                            :key="index"
                                                            v-html="renderDesc(source)"
                                                        ></div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>

                                <div class="flex-1 flex flex-col gap-4">
                                    <table
                                        v-if="item.skills.length || item.traits.length"
                                        class="wikitable w-full text-center m-0!"
                                    >
                                        <tbody>
                                            <tr>
                                                <th>特效</th>
                                            </tr>
                                            <tr>
                                                <td class="text-left">
                                                    <div class="flex flex-col gap-2">
                                                        <div v-for="ref in skillRefs" :key="ref.id">
                                                            <div
                                                                class="text-light"
                                                                :class="{
                                                                    'cursor-pointer hover:underline': ref.canOpen,
                                                                }"
                                                                @click="openSkill(ref.id)"
                                                            >
                                                                {{ ref.name }}
                                                                <span v-if="ref.showLevel" class="text-xs">
                                                                    Lv{{ ref.level }}
                                                                </span>
                                                            </div>
                                                            <div
                                                                class="text-sm text-gray-300"
                                                                v-html="renderDesc(ref.desc)"
                                                            ></div>
                                                        </div>
                                                    </div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>

                                    <table v-if="item.fa_sk" class="wikitable w-full text-center m-0!">
                                        <tbody>
                                            <tr>
                                                <th>妖精技能</th>
                                            </tr>
                                            <tr>
                                                <td class="text-left">
                                                    <div class="text-light">{{ item.fa_sk }}</div>
                                                    <div
                                                        class="text-sm text-gray-300"
                                                        v-html="renderDesc(item.fa_sk_desc ?? '')"
                                                    ></div>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <NTabs type="card" size="small" v-model:value="activeTab">
                                <NTabPane name="attributes" tab="属性值">
                                    <div
                                        v-if="overRankGroups.length"
                                        class="mt-2 flex items-center gap-2 whitespace-nowrap"
                                    >
                                        <span class="shrink-0 text-sm text-light">材质补强</span>
                                        <div class="w-[180px] shrink-0">
                                            <NSelect
                                                v-model:value="overRankSelection"
                                                :options="overRankOptions"
                                                size="small"
                                            />
                                        </div>
                                    </div>
                                    <div v-if="overRankSelected" class="mt-1 text-xs text-gray-400">
                                        数值已加上该等级及之前的补强加成
                                    </div>
                                    <div class="mt-2 overflow-x-auto">
                                        <table class="wikitable w-full text-center m-0!">
                                            <thead>
                                                <tr>
                                                    <th class="w-1/6">属性</th>
                                                    <th v-for="lv in LEVELS" :key="lv" class="w-1/6">
                                                        +{{ lv }}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <template v-for="stat in STAT_ROWS" :key="stat.key">
                                                    <tr>
                                                        <th>{{ stat.label }}</th>
                                                        <td
                                                            v-for="lv in LEVELS"
                                                            :key="lv"
                                                            :class="cellColor(stat.key, lv)"
                                                        >
                                                            {{ cellText(stat.key, lv)
                                                            }}<span
                                                                v-if="
                                                                    overRankValue(stat.key) &&
                                                                    statAt(stat.key, lv) !== null
                                                                "
                                                                class="ml-1 text-xs text-green-400"
                                                                >(+{{ overRankValue(stat.key) }})</span
                                                            >
                                                        </td>
                                                    </tr>
                                                    <tr v-if="stat.key === 'atk' && isWeapon">
                                                        <th>次数</th>
                                                        <!-- 攻击次数不随强化变化，横跨所有强化等级列 -->
                                                        <td
                                                            :colspan="LEVELS.length"
                                                            :class="cellColor('c', 0)"
                                                        >
                                                            {{ cellText('c', 0) }}
                                                        </td>
                                                    </tr>
                                                </template>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div class="text-sm text-gray-400 mt-4">
                                        ※
                                        +0数据红色表示比同类型装备的基准值低，绿色表示比同类型装备的基准值高。其他强化值数据，绿色表示相比+0有所提升
                                    </div>
                                </NTabPane>

                                <NTabPane
                                    v-if="overRankGroups.length"
                                    name="over_rank"
                                    tab="材质补强"
                                >
                                    <div class="mt-2 overflow-x-auto">
                                        <table class="wikitable w-full text-center m-0! table-fixed!">
                                            <colgroup>
                                                <col class="w-[7em]" />
                                                <col class="w-[5em]" />
                                                <col class="w-[7em]" />
                                                <col
                                                    v-for="stat in OVER_RANK_STATS"
                                                    :key="stat.key"
                                                />
                                            </colgroup>
                                            <thead>
                                                <tr>
                                                    <th class="whitespace-nowrap">目标阶级</th>
                                                    <th class="whitespace-nowrap">次数</th>
                                                    <th class="whitespace-nowrap">费用</th>
                                                    <th
                                                        v-for="stat in OVER_RANK_STATS"
                                                        :key="stat.key"
                                                    >
                                                        {{ stat.label }}
                                                    </th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <template
                                                    v-for="group in overRankGroups"
                                                    :key="group.rank"
                                                >
                                                    <tr
                                                        v-for="(entry, i) in group.rows"
                                                        :key="entry.index"
                                                    >
                                                        <th
                                                            v-if="i === 0"
                                                            :rowspan="group.rows.length + 1"
                                                        >
                                                            {{ group.rank }} 阶
                                                        </th>
                                                        <td>{{ entry.row.level }}/{{ group.total }}</td>
                                                        <td>{{ formatCost(entry.row.cost) }}</td>
                                                        <td
                                                            v-for="stat in OVER_RANK_STATS"
                                                            :key="stat.key"
                                                            :class="signedClass(entry.delta[stat.key])"
                                                        >
                                                            {{ signed(entry.delta[stat.key]) }}
                                                        </td>
                                                    </tr>
                                                    <tr class="bg-black/20">
                                                        <td colspan="2">小计</td>
                                                        <td
                                                            v-for="stat in OVER_RANK_STATS"
                                                            :key="stat.key"
                                                            :class="signedClass(group.subtotal[stat.key])"
                                                        >
                                                            {{ signed(group.subtotal[stat.key]) }}
                                                        </td>
                                                    </tr>
                                                </template>
                                                <tr>
                                                    <th colspan="3">总加成</th>
                                                    <td
                                                        v-for="stat in OVER_RANK_STATS"
                                                        :key="stat.key"
                                                        :class="signedClass(overRankTotal[stat.key])"
                                                    >
                                                        {{ signed(overRankTotal[stat.key]) }}
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>
                                    <div class="text-sm text-gray-400 mt-4">
                                        ※
                                        材质补强（合材补强）用同品质或更高品质的装备作为素材，让低于最高阶级的装备继续提升。
                                        表格按目标阶级分组：每行是该次补强的属性变化，小计为该阶级的合计，总加成为全部补强完成后的累计值。
                                        武器提升攻击力 / 魔力 / 神力，防具提升防御力 / 法术防御力。
                                    </div>
                                </NTabPane>

                                <!-- 杂物来源：本地无整理结果时也显示，点开页签才去下载 + 整理 -->
                                <NTabPane
                                    name="junk-sources"
                                    :tab="junkReady ? `杂物来源 (${junkSources.length})` : '杂物来源'"
                                >
                                    <NSpin
                                        v-if="!junkReady"
                                        :show="junkLoading"
                                        size="medium"
                                        description="正在下载并整理杂物数据（首次较慢）…"
                                        class="py-8"
                                    >
                                        <div class="py-6 text-center text-sm text-gray-400">
                                            本地暂无杂物整理结果，点击本页签可加载
                                        </div>
                                    </NSpin>
                                    <template v-else>
                                        <NEmpty
                                            v-if="!junkSources.length"
                                            class="py-6"
                                            description="该装备无法通过杂物获得"
                                        />
                                        <template v-else>
                                            <div class="mt-2 overflow-x-auto">
                                                <table class="wikitable w-full text-center m-0!">
                                                    <thead>
                                                        <tr>
                                                            <th>杂物名称</th>
                                                            <th>最高星级</th>
                                                            <th>最高颜色</th>
                                                            <th>出现几率</th>
                                                            <th>平均杂物数</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr
                                                            v-for="source in junkSources"
                                                            :key="source.junk.name"
                                                            class="cursor-pointer hover:bg-[#3a312a]! transition-colors select-none"
                                                            @click="handleJunkClick(source.junk)"
                                                        >
                                                            <td class="text-left">{{ source.junk.name }}</td>
                                                            <td>{{ source.maxQuality }}</td>
                                                            <td :class="getGradeColorClass(source.maxGrade)">
                                                                {{ source.maxGrade }}
                                                            </td>
                                                            <td>{{ (source.totalRate * 100).toFixed(4) }}%</td>
                                                            <td>
                                                                {{
                                                                    source.totalRate > 0
                                                                        ? (1 / source.totalRate).toFixed(0)
                                                                        : '∞'
                                                                }}
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                            <div class="text-sm text-gray-400 mt-4">
                                                ※
                                                点击杂物可查看该装备在杂物内的星级 / 颜色分布。出现几率为全部星级与颜色合计，平均杂物数为期望开启数量。
                                            </div>
                                        </template>
                                    </template>
                                </NTabPane>

                                <!-- 选中杂物后：该杂物开出此装备的几率 -->
                                <NTabPane
                                    v-if="selectedJunk"
                                    name="junk-detail"
                                    :tab="selectedJunk.name"
                                >
                                    <div class="mt-2">
                                        <div
                                            class="text-md text-light font-semibold bg-black/50 px-2 py-1"
                                        >
                                            「{{ item?.name }}」出现几率
                                        </div>
                                        <div class="mt-2 overflow-x-auto">
                                            <table class="wikitable w-full text-center m-0!">
                                                <thead>
                                                    <tr>
                                                        <th>品质</th>
                                                        <th>物品内几率</th>
                                                        <th>杂物内几率</th>
                                                        <th>平均需杂物数</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr
                                                        v-for="row in selectedJunkQualityData.filter(
                                                            (entry) => entry.junkInnerRate > 0,
                                                        )"
                                                        :key="`${row.quality}-${row.grade}`"
                                                    >
                                                        <td :class="getGradeColorClass(row.grade)">
                                                            {{ getQualityDisplay(row.quality, row.grade) }}
                                                        </td>
                                                        <td>
                                                            {{ (row.itemInnerRate * 100).toFixed(4) }}%
                                                        </td>
                                                        <td>
                                                            {{ (row.junkInnerRate * 100).toFixed(4) }}%
                                                        </td>
                                                        <td>
                                                            {{
                                                                row.averageAttempts === Infinity
                                                                    ? '∞'
                                                                    : row.averageAttempts
                                                            }}
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                </NTabPane>

                                <NTabPane v-if="item.bonus && item.bonus.length" name="bonus" tab="加护">
                                    <div class="mt-2">
                                        <div class="flex items-center mt-4">
                                            <NRadioGroup v-model:value="orderType" class="flex gap-2">
                                                <NRadio value="attribute">属性顺序</NRadio>
                                                <NRadio value="probability">概率顺序</NRadio>
                                            </NRadioGroup>
                                        </div>
                                        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
                                            <div
                                                v-for="(slot, index) in bonusSlots"
                                                :key="index"
                                                class="flex flex-col gap-2"
                                            >
                                                <div
                                                    class="text-center text-md text-light font-semibold bg-black/50 px-2 py-1"
                                                >
                                                    加护 {{ index + 1 }}
                                                </div>
                                                <table class="wikitable w-full text-center">
                                                    <thead>
                                                        <tr>
                                                            <th class="text-left">属性</th>
                                                            <th class="text-right">概率</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr v-for="row in slot.rows" :key="row.name">
                                                            <th class="text-left">{{ row.name }}</th>
                                                            <td class="text-right">{{ row.value.toFixed(4) }}%</td>
                                                        </tr>
                                                        <tr v-if="!slot.rows.length">
                                                            <td colspan="2" class="text-center text-gray-400">
                                                                无属性
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                        <div class="text-sm text-gray-400 mt-4">
                                            ※
                                            加护数据来自攻略站统计，每件装备有 4 个加护槽，数值为该属性在对应品质下出现的百分比。
                                        </div>
                                    </div>
                                </NTabPane>

                            </NTabs>

                            <div class="flex justify-center gap-4 mt-4">
                                <NButton size="small" type="warning" @click="close">关闭</NButton>
                            </div>
                        </template>

                        <NEmpty v-else description="未选择装备" />
                    </div>
                </div>
            </div>
        </NModal>

        <!-- 特效（装备类型特性）大多就是技能，点开复用技能详情 -->
        <SkillModal v-model:show="skillShow" :identification="skillId" />
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import DOMPurify from 'dompurify';
import {
    NButton,
    NEmpty,
    NModal,
    NRadio,
    NRadioGroup,
    NSelect,
    NSpin,
    NTabPane,
    NTabs,
} from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref, watch } from 'vue';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import WikiImg from '../../components/huiji/WikiImg.vue';
import SkillModal from './SkillModal.vue';
import { useDataV2Store } from './dataV2Store';
import { getGradeColorClass, getQualityDisplay } from './junk/constants';
import { hasJunkCache } from './junk/junkCache';
import type { JunkItem } from './junk/JunkItem';
import { useJunkStore } from './junk/junkStore';
import type { EquipmentListItem, EquipmentOverRank, EquipmentStatKey } from './types';

defineOptions({ name: '装备详情ModalV2' });

const props = defineProps<{ show: boolean; identification: number | null }>();
const emit = defineEmits<{ 'update:show': [value: boolean] }>();

const store = useDataV2Store();

const item = computed<EquipmentListItem | null>(
    () => store.equipments.find((row) => row.id === props.identification) ?? null,
);

// 杂物来源：打开弹窗只读本地缓存，真正下载 + 整理由点开「杂物来源」页签触发
const junkStore = useJunkStore();
const { junkItems, isAllInit: junkReady, isLoading: junkLoading } = storeToRefs(junkStore);

interface JunkSource {
    junk: JunkItem;
    totalRate: number;
    maxQuality: number;
    maxGrade: number;
}

/** 能开出当前装备的杂物（排除无法获取的），按星级 / 颜色 / 几率排序 */
const junkSources = computed<JunkSource[]>(() => {
    const row = item.value;
    if (!row || !junkReady.value) return [];

    const result: JunkSource[] = [];
    for (const junk of junkItems.value) {
        if (junk.notObt) continue;
        const matched = junk.items.filter(
            (entry) => entry.name === row.name_jp || entry.name_cn === row.name,
        );
        if (!matched.length) continue;
        result.push({
            junk,
            totalRate: matched.reduce((sum, entry) => sum + entry.rates, 0),
            maxQuality: matched.reduce((max, entry) => Math.max(max, entry.quality), 0),
            maxGrade: matched.reduce((max, entry) => Math.max(max, entry.grade), 0),
        });
    }

    return result.sort(
        (a, b) =>
            b.maxGrade - a.maxGrade || b.maxQuality - a.maxQuality || b.totalRate - a.totalRate,
    );
});

onMounted(async () => {
    if (await hasJunkCache()) await junkStore.loadAndInitJunkData();
});

/** 从来源列表点选杂物后展示的详情 */
const selectedJunk = ref<JunkItem | null>(null);

const handleJunkClick = (junk: JunkItem) => {
    selectedJunk.value = junk;
    activeTab.value = 'junk-detail';
};

/** 选中的杂物中，当前装备在各星级 / 颜色下的几率分布（与 V1 同算法） */
const selectedJunkQualityData = computed(() => {
    const row = item.value;
    const junk = selectedJunk.value;
    if (!row || !junk) return [];

    const qualityData = new Map<string, { quality: number; grade: number; rate: number }>();
    let totalItemRate = 0;
    let totalJunkRate = 0;

    for (const entry of junk.items) {
        totalJunkRate += entry.rates;
        if (entry.name === row.name_jp || entry.name_cn === row.name) {
            totalItemRate += entry.rates;
            const key = `${entry.quality}-${entry.grade}`;
            const current = qualityData.get(key);
            if (current) current.rate += entry.rates;
            else {
                qualityData.set(key, {
                    quality: entry.quality,
                    grade: entry.grade,
                    rate: entry.rates,
                });
            }
        }
    }

    return Array.from(qualityData.values())
        .map((info) => ({
            ...info,
            itemInnerRate: totalItemRate > 0 ? info.rate / totalItemRate : 0,
            junkInnerRate: totalJunkRate > 0 ? info.rate / totalJunkRate : 0,
            averageAttempts: info.rate > 0 ? Math.round(1 / info.rate) : Infinity,
        }))
        .sort((a, b) => b.quality - a.quality || b.grade - a.grade);
});

const activeTab = ref('attributes');
const orderType = ref<'attribute' | 'probability'>('probability');

// 点开杂物来源页签时才真正下载 + 整理（本地已有结果时 loadJunkData 直接命中缓存）
watch(activeTab, (tab) => {
    if (tab === 'junk-sources' && !junkReady.value) void junkStore.loadAndInitJunkData();
});

const LEVELS = [0, 5, 10, 15, 20];

/** 材质补强会改动的五项属性（武器只加前三项，防具只加后两项） */
const OVER_RANK_STAT_KEYS = ['atk', 'mag', 'div', 'def', 'mdef'] as const;
type OverRankStatKey = (typeof OVER_RANK_STAT_KEYS)[number];
type OverRankStat = Record<OverRankStatKey, number>;

const ZERO_OVER_RANK_STAT: OverRankStat = { atk: 0, mag: 0, div: 0, def: 0, mdef: 0 };

const OVER_RANK_STATS: Array<{ key: OverRankStatKey; label: string }> = [
    { key: 'atk', label: '攻击力' },
    { key: 'mag', label: '魔力' },
    { key: 'div', label: '神力' },
    { key: 'def', label: '防御力' },
    { key: 'mdef', label: '法术防御力' },
];

const overRankStatOf = (row: EquipmentOverRank): OverRankStat => ({
    atk: row.atk,
    mag: row.mag,
    div: row.div,
    def: row.def,
    mdef: row.mdef,
});

interface OverRankEntry {
    index: number;
    row: EquipmentOverRank;
    /** 相比上一次补强的属性增量 */
    delta: OverRankStat;
}

interface OverRankGroup {
    /** 目标阶级 */
    rank: number;
    /** 该阶级的补强总次数 */
    total: number;
    rows: OverRankEntry[];
    /** 该阶级内的属性增量合计 */
    subtotal: OverRankStat;
}

const overRankRows = computed(() => item.value?.over_rank ?? []);

/** 按目标阶级分组；表里的属性是累计值，这里换算成每次补强的增量 */
const overRankGroups = computed<OverRankGroup[]>(() => {
    const groups: OverRankGroup[] = [];
    let prev = { ...ZERO_OVER_RANK_STAT };

    overRankRows.value.forEach((row, index) => {
        const current = overRankStatOf(row);
        const delta = { ...ZERO_OVER_RANK_STAT };
        for (const key of OVER_RANK_STAT_KEYS) delta[key] = current[key] - prev[key];

        let group = groups[groups.length - 1];
        if (!group || group.rank !== row.rank) {
            group = {
                rank: row.rank,
                total: 0,
                rows: [],
                subtotal: { ...ZERO_OVER_RANK_STAT },
            };
            groups.push(group);
        }

        group.rows.push({ index, row, delta });
        group.total = Math.max(group.total, row.level);
        for (const key of OVER_RANK_STAT_KEYS) group.subtotal[key] += delta[key];

        prev = current;
    });

    return groups;
});

/** 全部补强完成后的累计加成 */
const overRankTotal = computed<OverRankStat>(() => {
    const rows = overRankRows.value;
    return rows.length ? overRankStatOf(rows[rows.length - 1]) : { ...ZERO_OVER_RANK_STAT };
});

/** 属性表叠加的补强等级（``over_rank`` 下标）；-1 = 无 */
const overRankSelection = ref(-1);

/** 下拉：无 + 所有补强等级（阶级与次数降序） */
const overRankOptions = computed(() => {
    const totals = new Map<number, number>();
    for (const row of overRankRows.value) {
        totals.set(row.rank, Math.max(totals.get(row.rank) ?? 0, row.level));
    }

    const options = overRankRows.value.map((row, index) => ({
        label: `阶级${row.rank}，${row.level}/${totals.get(row.rank) ?? row.level}`,
        value: index,
    }));
    options.reverse();

    return [{ label: '无', value: -1 }, ...options];
});

const overRankSelected = computed(() => {
    const index = overRankSelection.value;
    return index >= 0 ? overRankRows.value[index] ?? null : null;
});

// 换一件装备时回到「无」，避免沿用上一件装备的补强等级 / 选中的杂物
watch(
    () => props.identification,
    () => {
        overRankSelection.value = -1;
        selectedJunk.value = null;
        activeTab.value = 'attributes';
    },
);

/** 当前选中补强等级给某个属性的累计加成 */
const overRankValue = (key: EquipmentStatKey) => {
    const row = overRankSelected.value;
    if (!row) return 0;
    return OVER_RANK_STAT_KEYS.includes(key as OverRankStatKey)
        ? row[key as OverRankStatKey]
        : 0;
};

const signed = (value: number) => (value > 0 ? `+${value}` : String(value));
const signedClass = (value: number) =>
    value > 0 ? 'text-green-400' : value < 0 ? 'text-red-400' : 'text-gray-500';
const formatCost = (value: number) => value.toLocaleString('zh-CN');

const STAT_ROWS: Array<{ key: EquipmentStatKey; label: string }> = [
    { key: 'atk', label: '攻击力' },
    { key: 'mag', label: '魔力' },
    { key: 'div', label: '神力' },
    { key: 'def', label: '防御' },
    { key: 'mdef', label: '魔防' },
    { key: 'spe', label: '速度' },
    { key: 'acc', label: '命中' },
    { key: 'sur', label: '会心' },
    { key: 'eva', label: '回避' },
    { key: 'res', label: '抵抗' },
    { key: 'det', label: '探知' },
    { key: 'dtrap', label: '陷阱解除' },
    { key: 'etrap', label: '陷阱回避' },
];

/** 加护的 19 个属性，顺序与攻略站统计一致 */
const BONUS_ATTRIBUTES = [
    '攻击力%',
    '魔力%',
    '神力%',
    '命中%',
    '回避%',
    '抵抗%',
    '防御%',
    '魔防%',
    '速度%',
    '攻击力',
    '魔力',
    '神力',
    '命中',
    '回避',
    '抵抗',
    '防御',
    '魔防',
    '会心',
    '速度',
];

const isWeapon = computed(
    () => item.value?.category === '武器' || item.value?.category === '工具',
);

const baseStatOf = (row: EquipmentListItem) =>
    store.equipmentBaseStat[`${row.type}R${row.rank}`] ?? store.equipmentBaseStat[row.type ?? ''] ?? {};

/** 探索三项：有值即绿字，0 显示灰色（与列表一致） */
const SCOUT_KEYS = new Set<EquipmentStatKey>(['det', 'dtrap', 'etrap']);

/** +0 与同类型基准比较（与列表一致） */
const zeroColor = (row: EquipmentListItem, key: EquipmentStatKey) => {
    if (row.type === '工具') return '';
    const value = row.stats[key] ?? 0;
    if (SCOUT_KEYS.has(key)) return value > 0 ? 'text-green-400' : 'text-gray-700';
    const base = baseStatOf(row)[key] ?? 0;
    if (base === -1) return '';
    if (row.category === '武器' || row.category === '工具') {
        if (key === 'atk' && value > 0) return '';
        if (key === 'c' && value === 1) return '';
        if (key === 'mag' && value > 0) return '';
        if (key === 'div' && value > 0) return '';
    } else {
        if (key === 'def' && value > 0) return '';
        if (key === 'mdef' && value > 0) return '';
    }
    if (value > base) return 'text-green-400';
    if (value < base) return 'text-red-400';
    return base === 0 ? 'text-gray-700' : '';
};

/** 取某个强化等级下的数值；超出强化上限返回 null（显示 ??） */
const statAt = (key: EquipmentStatKey, lv: number): number | null => {
    const row = item.value;
    if (!row) return null;
    if (lv === 0) return row.stats[key] ?? 0;
    if (lv > row.reinforce_max) return null;
    // 攻击次数不随强化变化，强化曲线里也没有这一项（解码时缺失的 num 会补 0）
    if (key === 'c') return row.stats.c ?? 0;
    // 每个等级行都是「该等级的完整数值」，取 <= lv 的最后一行即可
    let value = row.stats[key] ?? 0;
    for (const level of row.levels) {
        if (level.lv > lv) break;
        value = level[key] ?? 0;
    }
    return value;
};

const cellText = (key: EquipmentStatKey, lv: number) => {
    const value = statAt(key, lv);
    if (value === null) return '??';
    if (key === 'c') return isWeapon.value ? `×${value}` : '-';
    return String(value + overRankValue(key));
};

const cellColor = (key: EquipmentStatKey, lv: number) => {
    const row = item.value;
    if (!row) return '';
    const value = statAt(key, lv);
    if (value === null) return 'text-gray-700';
    if (lv === 0) return zeroColor(row, key);
    const zero = row.stats[key] ?? 0;
    if (value > zero) return 'text-green-400';
    if (value < zero) return 'text-red-400';
    return zero === 0 ? 'text-gray-700' : '';
};

const bonusSlots = computed(() => {
    const bonus = item.value?.bonus ?? [];
    return bonus.map((rates) => {
        const rows = rates
            .map((value, index) => ({ name: BONUS_ATTRIBUTES[index] ?? `属性${index + 1}`, value }))
            .filter((row) => Math.abs(row.value) > 0.0001);
        if (orderType.value === 'probability') rows.sort((a, b) => b.value - a.value);
        return { rows };
    });
});

/**
 * 特性 -> 展示信息。数据里只有技能 identification（+ 引用等级），
 * 名字与说明都从技能数据里查；查不到（纯 lock config 特性）才用数据里带的名字。
 */
const skillRefs = computed(() => {
    const row = item.value;
    if (!row) return [];
    return [...row.skills, ...row.traits].map((ref) => {
        const skill = store.skillById.get(ref.id) ?? null;
        const level = ref.level ?? 0;
        // 技能本身有多级时才标等级：单级技能连 Lv1 都省掉，多级技能引用 1 级也要写。
        // 注意 levels 里可能有重复等级行或 Lv0，所以按「去重后的正等级数」判断。
        const levelCount = new Set((skill?.levels ?? []).map((item) => item.level).filter((n) => n > 0)).size;
        const multiLevel = levelCount > 1 || (skill?.max_level ?? 0) > 1;
        return {
            id: ref.id,
            name: skill?.name || ref.name || `#${ref.id}`,
            level,
            showLevel: level > 0 && multiLevel,
            // 技能说明优先；展示型 lock config 特性用手写说明
            desc: skill?.description || ref.desc || '',
            canOpen: !!skill,
        };
    });
});

const skillShow = ref(false);
const skillId = ref<number | null>(null);

const openSkill = (id: number) => {
    if (!store.skillById.has(id)) return;
    skillId.value = id;
    skillShow.value = true;
};

const renderDesc = (text: string | null | undefined) => {
    if (!text) return '';
    let html = DOMPurify.sanitize(text, { ALLOWED_TAGS: ['br'], ALLOWED_ATTR: [] });
    html = html.replace(/\n/g, '<br>');
    return html.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (_match, page, _pipe, label) => {
        const title = label || page;
        return `<a href="/wiki/${page}" target="_blank">${title}</a>`;
    });
};

const onShowUpdate = (value: boolean) => emit('update:show', value);
const close = () => emit('update:show', false);
</script>
