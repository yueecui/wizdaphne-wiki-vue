<template>
    <ThemeConfigProvider>
        <NModal :show="show" @update:show="onShowUpdate" @esc="close" @mask-click="close">
            <div class="w-[95vw] md:w-[1180px] h-[88vh] m-auto flex flex-col huiji-css-hook bg-transparent!">
                <div class="flex-1 min-h-0 flex flex-col bg-[#312721]! border! border-[#463d38]! rounded">
                    <div class="shrink-0 bg-[#312721] px-4 pt-3 pb-2 border-b! border-[#463d38]!">
                        <div class="flex items-start gap-3">
                            <WikiImg
                                v-if="thumb"
                                :imageName="thumb"
                                class="w-[121px] h-[56px] md:w-[164px] md:h-[76px] object-contain shrink-0"
                                isLazy
                            />
                            <div class="flex-1 min-w-0">
                                <div class="text-sm text-light">
                                    {{ row ? (row.no ? `No. ${row.no}` : '无图鉴') : '—' }}
                                </div>
                                <div class="text-2xl md:text-3xl text-light font-bold break-words">
                                    {{ row?.name ?? '敌人详情' }}
                                </div>
                                <div v-if="subtitle" class="text-sm text-gray-400 break-words">
                                    {{ subtitle }}
                                </div>
                            </div>
                            <div class="flex items-center gap-3 shrink-0">
                                <span v-if="row" class="text-xs text-gray-600">ID {{ row.id }}</span>
                                <NButton
                                    v-if="canEdit"
                                    size="tiny"
                                    quaternary
                                    @click="showRaw = !showRaw"
                                >
                                    {{ showRaw ? '隐藏 JSON' : '原始 JSON' }}
                                </NButton>
                                <NButton size="tiny" quaternary @click="close">关闭</NButton>
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 min-h-0 flex flex-col">
                        <NEmpty v-if="!row" description="未选择敌人" class="p-4" />
                        <div v-else class="flex-1 min-h-0 flex flex-col">
                            <!-- 变体 / 等级：所有页共用，置顶，固定不随翻页滚动 -->
                            <div class="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2 bg-[#312721] border-b! border-[#463d38]!">
                                <span class="text-xs opacity-60">变体（{{ row.variants.length }}）</span>
                                <NSelect
                                    v-if="row.variants.length > 1"
                                    v-model:value="variantIndex"
                                    :options="variantOptions"
                                    size="small"
                                    class="w-[26rem]!"
                                />
                                <span v-else class="text-xs opacity-60">仅 1 种</span>
                                <span class="text-xs opacity-60 ml-2">等级</span>
                                <NSlider
                                    v-if="levelRange"
                                    v-model:value="level"
                                    :min="levelRange[0]"
                                    :max="levelRange[1]"
                                    :step="1"
                                    :tooltip="false"
                                    class="w-[12rem]!"
                                />
                                <NInputNumber
                                    v-else
                                    v-model:value="level"
                                    size="small"
                                    :min="1"
                                    :max="999"
                                    class="w-24!"
                                />
                                <span class="text-xs text-light">
                                    Lv {{ level }}
                                    <span v-if="levelRange" class="opacity-50">
                                        （{{ levelRange[0] }}-{{ levelRange[1] }}）
                                    </span>
                                </span>
                            </div>

                            <div class="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-4">
                                <NTabs v-model:value="activeTab" type="card" size="small">
                                    <NTabPane name="info" tab="基础情报">
                                        <div class="grid grid-cols-1 xl:grid-cols-2 gap-3 items-start">
                                            <!-- 左上：基础情报 -->
                                            <table class="wikitable w-full table-fixed! text-center text-sm border-collapse m-0!">
                                                <colgroup>
                                                    <col class="w-[6.5rem]!" />
                                                    <col />
                                                    <col class="w-[6.5rem]!" />
                                                    <col />
                                                </colgroup>
                                                <tbody>
                                                    <tr>
                                                        <th colspan="4" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">
                                                            基础情报
                                                        </th>
                                                    </tr>
                                                    <tr v-for="(pair, index) in basicPairs" :key="index">
                                                        <template v-for="cell in pair" :key="cell.label">
                                                            <th class="h-7 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!">
                                                                {{ cell.label }}
                                                            </th>
                                                            <td
                                                                class="h-7 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                                                                :colspan="pair.length === 1 ? 3 : 1"
                                                                :class="cell.cls"
                                                            >
                                                                <template v-if="cell.icons?.length">
                                                                    <ElementIcon
                                                                        v-for="(icon, i) in cell.icons"
                                                                        :key="i"
                                                                        :element="icon"
                                                                        class="mr-1 inline-block w-5 h-5 align-middle drop-shadow-1px"
                                                                    />
                                                                </template>
                                                                {{ cell.value }}
                                                            </td>
                                                        </template>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            <!-- 右上：基础情报（冻结 / 破冰） -->
                                            <table class="wikitable w-full table-fixed! text-center text-sm border-collapse m-0!">
                                                <colgroup>
                                                    <col class="w-[6.5rem]!" />
                                                    <col />
                                                    <col class="w-[6.5rem]!" />
                                                    <col />
                                                </colgroup>
                                                <tbody>
                                                    <tr>
                                                        <th colspan="4" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">
                                                            基础情报
                                                        </th>
                                                    </tr>
                                                    <tr v-for="(pair, index) in freezePairs" :key="index">
                                                        <template v-for="cell in pair" :key="cell.label">
                                                            <th class="h-7 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!">
                                                                {{ cell.label }}
                                                            </th>
                                                            <td
                                                                class="h-7 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                                                                :colspan="pair.length === 1 ? 3 : 1"
                                                                :class="cell.cls"
                                                            >
                                                                <span
                                                                    v-if="cell.skillId"
                                                                    class="cursor-pointer hover:text-light"
                                                                    @click="openSkill(cell.skillId)"
                                                                >
                                                                    {{ cell.value }}
                                                                </span>
                                                                <template v-else>{{ cell.value }}</template>
                                                            </td>
                                                        </template>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            <!-- 左下：能力值 -->
                                            <table class="wikitable w-full table-fixed! text-center text-sm border-collapse m-0!">
                                                <colgroup>
                                                    <col class="w-[6.5rem]!" />
                                                    <col />
                                                    <col class="w-[6.5rem]!" />
                                                    <col />
                                                </colgroup>
                                                <tbody>
                                                    <tr>
                                                        <th colspan="4" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">
                                                            能力值（Lv {{ level }}）
                                                        </th>
                                                    </tr>
                                                    <tr v-for="(pair, index) in statPairs" :key="index">
                                                        <template v-for="cell in pair" :key="cell.label">
                                                            <th
                                                                v-if="cell.label"
                                                                class="h-7 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!"
                                                            >
                                                                {{ cell.label }}
                                                            </th>
                                                            <td
                                                                class="h-7 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                                                                :colspan="!cell.label ? 2 : pair.length === 1 ? 3 : 1"
                                                                :class="cell.cls"
                                                            >
                                                                {{ cell.value }}
                                                            </td>
                                                        </template>
                                                    </tr>
                                                </tbody>
                                            </table>

                                            <!-- 右下：状态有效度 -->
                                            <table class="wikitable w-full table-fixed! text-center text-sm border-collapse m-0!">
                                                <colgroup>
                                                    <col class="w-[6.5rem]!" />
                                                    <col />
                                                    <col class="w-[6.5rem]!" />
                                                    <col />
                                                </colgroup>
                                                <tbody>
                                                    <tr>
                                                        <th colspan="4" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">
                                                            状态有效度
                                                        </th>
                                                    </tr>
                                                    <tr v-for="(pair, index) in resistPairs" :key="index">
                                                        <template v-for="cell in pair" :key="cell.label">
                                                            <th class="h-7 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!">
                                                                {{ cell.label }}
                                                            </th>
                                                            <td
                                                                class="h-7 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                                                                :colspan="pair.length === 1 ? 3 : 1"
                                                                :class="cell.cls"
                                                            >
                                                                {{ cell.value }}
                                                            </td>
                                                        </template>
                                                    </tr>
                                                </tbody>
                                            </table>
                                        </div>
                                    </NTabPane>

                                    <!-- 第二页：技能列表 -->
                                    <NTabPane name="skills" :tab="`技能（${skillRows.length}）`">
                            <table class="wikitable w-full text-center text-sm border-collapse mt-2!">
                                <colgroup>
                                    <col class="w-[3rem]!" />
                                    <col />
                                    <col class="w-[8rem]!" />
                                    <col class="w-[5rem]!" />
                                </colgroup>
                                <tbody>
                                    <tr>
                                        <th class="px-2 py-1 border! border-[#463d38]!">#</th>
                                        <th class="px-2 py-1 border! border-[#463d38]!">技能</th>
                                        <th class="px-2 py-1 border! border-[#463d38]!">触发</th>
                                        <th class="px-2 py-1 border! border-[#463d38]!">类型</th>
                                    </tr>
                                    <tr v-if="!skillRows.length">
                                        <td colspan="4" class="px-2 py-1 border! border-[#463d38]! opacity-50">—</td>
                                    </tr>
                                    <tr v-for="(skill, index) in skillRows" :key="skill.id">
                                        <td class="px-2 py-1 border! border-[#463d38]!">{{ index + 1 }}</td>
                                        <td class="px-2 py-1 text-left border! border-[#463d38]!">
                                            <span
                                                class="cursor-pointer hover:text-light"
                                                @click="openSkill(skill.id)"
                                            >
                                                {{ skill.name }}
                                            </span>
                                            <span v-if="skill.level" class="ml-1 text-xs opacity-60">
                                                Lv{{ skill.level }}
                                            </span>
                                            <div v-if="skill.summons.length" class="text-xs opacity-60">
                                                召唤
                                                <span
                                                    v-for="(unit, unitIndex) in skill.summons"
                                                    :key="unit.category"
                                                >
                                                    <span
                                                        class="cursor-pointer text-sky-300 underline decoration-dotted decoration-1 underline-offset-2 hover:text-light"
                                                        @click="openEnemyRef(unit.category)"
                                                    >
                                                        {{ unit.name }}
                                                    </span>
                                                    ×{{ unit.count }}
                                                    <span v-if="unitIndex < skill.summons.length - 1">、</span>
                                                </span>
                                            </div>
                                        </td>
                                        <td class="px-2 py-1 border! border-[#463d38]! opacity-60">
                                            {{ skill.trigger }}
                                        </td>
                                        <td class="px-2 py-1 border! border-[#463d38]! opacity-60">
                                            {{ skill.kind }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                                    </NTabPane>

                                    <!-- 第三页：AI 规则 -->
                                    <NTabPane name="ai" :tab="`AI 规则（${aiPlan.length}）`">
                            <table class="wikitable w-full text-center text-sm border-collapse mt-2!">
                                <colgroup>
                                    <col class="w-[4rem]!" />
                                    <col class="w-[16rem]!" />
                                    <col />
                                </colgroup>
                                <thead class="sticky top-0 z-10">
                                    <tr>
                                        <th class="px-2 py-1 border! border-[#463d38]!">优先级</th>
                                        <th class="px-2 py-1 text-left border! border-[#463d38]!">条件</th>
                                        <th class="px-2 py-1 text-left border! border-[#463d38]!">技能</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr v-if="!aiPlan.length">
                                        <td colspan="3" class="px-2 py-1 border! border-[#463d38]! opacity-50">—</td>
                                    </tr>
                                        <tr
                                            v-for="(rule, index) in aiPlan"
                                            :key="index"
                                            :class="rule.priority == null ? 'bg-amber-400/10' : ''"
                                        >
                                            <td class="px-2 py-1 border! border-[#463d38]!">
                                                <template v-if="rule.priority == null">
                                                    <div class="text-[11px] font-bold tracking-wide text-amber-300">
                                                        插入
                                                    </div>
                                                    <div v-if="rule.once" class="text-[10px] opacity-60">仅一次</div>
                                                </template>
                                                <span v-else class="opacity-60">{{ rule.priority }}</span>
                                            </td>
                                            <td class="px-2 py-1 text-left border! border-[#463d38]!">
                                                <span v-if="!rule.conditions.length" class="opacity-50">—</span>
                                                <div
                                                    v-for="(condition, conditionIndex) in rule.conditions"
                                                    :key="conditionIndex"
                                                    class="flex items-baseline gap-1.5"
                                                >
                                                    <span
                                                        v-if="rule.conditions.length > 1"
                                                        class="shrink-0 w-[2.2rem] text-[10px] font-bold tracking-wide text-amber-400/90"
                                                    >
                                                        AND
                                                    </span>
                                                    <span class="min-w-0">
                                                        <template v-if="condition.ref && enemyLinkText(condition.ref)">
                                                            {{ condition.label }}
                                                            <span
                                                                class="cursor-pointer text-sky-300 underline decoration-dotted decoration-1 underline-offset-2 hover:text-light"
                                                                @click="openEnemyRef(condition.ref)"
                                                            >
                                                                {{ enemyLinkText(condition.ref) }}
                                                            </span>
                                                            {{ condition.suffix }}
                                                        </template>
                                                        <template v-else-if="condition.ref">
                                                            {{ condition.label }}#{{ condition.ref }}
                                                            {{ condition.suffix }}
                                                        </template>
                                                        <template v-else-if="condition.status">
                                                            {{ condition.label }}
                                                            <span class="text-amber-300">{{ statusLabel(condition.status) }}</span>
                                                            {{ condition.suffix }}
                                                        </template>
                                                        <template v-else-if="condition.unknown">
                                                            <span
                                                                class="inline-flex items-baseline gap-1 rounded bg-black/30 px-1.5 text-xs leading-5 border! border-dashed! border-amber-400/40!"
                                                            >
                                                                <span class="font-bold tracking-wide text-[11px] text-amber-300/90">
                                                                    {{ condition.unknown.name }}
                                                                </span>
                                                                <span
                                                                    v-if="condition.unknown.args"
                                                                    class="font-mono opacity-50"
                                                                >
                                                                    ({{ condition.unknown.args }})
                                                                </span>
                                                            </span>
                                                        </template>
                                                        <template v-else>
                                                            {{ condition.text }}
                                                        </template>
                                                    </span>
                                                </div>
                                            </td>
                                            <td class="px-2 py-1 text-left border! border-[#463d38]!">
                                                <span
                                                    v-for="(entry, skillIndex) in rule.skills"
                                                    :key="entry.skill.identification"
                                                >
                                                    <span
                                                        class="cursor-pointer hover:text-light"
                                                        @click="openSkill(entry.skill.identification)"
                                                    >
                                                        {{ entry.skill.name }}
                                                    </span>
                                                    <span v-if="entry.percent" class="opacity-40">({{ entry.percent }}%)</span>
                                                    <span v-if="entry.target" class="opacity-60">
                                                        （目标：{{ entry.target }}）
                                                    </span>
                                                    <span
                                                        v-if="skillIndex < rule.skills.length - 1"
                                                        class="opacity-40"
                                                    >
                                                        、
                                                    </span>
                                                </span>
                                            </td>
                                        </tr>
                                </tbody>
                            </table>

                                    </NTabPane>

                                    <!-- 第四页：出没地 -->
                                    <NTabPane name="spawn" :tab="`出没地（${spawnRows.length}）`">
                                        <table class="wikitable w-full table-fixed! text-center text-sm border-collapse mt-2!">
                                            <colgroup>
                                                <col />
                                                <col class="w-[10rem]!" />
                                            </colgroup>
                                            <tbody>
                                                <tr>
                                                    <th class="px-2 py-1 border! border-[#463d38]!">地图 / 层</th>
                                                    <th class="px-2 py-1 border! border-[#463d38]!">遗物</th>
                                                </tr>
                                                <tr v-if="!spawnRows.length">
                                                    <td colspan="2" class="px-2 py-1 border! border-[#463d38]! opacity-50">
                                                        —
                                                    </td>
                                                </tr>
                                                <tr v-for="floor in spawnRows" :key="floor.id">
                                                    <td
                                                        class="px-2 py-1 text-left border! border-[#463d38]!"
                                                        :class="floor.name ? 'cursor-pointer hover:bg-[#3a312a]!' : ''"
                                                        @click="floor.name && openMapFloor(floor.id)"
                                                    >
                                                        <div>{{ floor.name || '（未命名）' }}</div>
                                                        <div class="text-xs opacity-60">
                                                            {{ floor.map_name ? `${floor.map_name} · ` : '' }}ID {{ floor.id }}
                                                        </div>
                                                    </td>
                                                    <td class="px-2 py-1 border! border-[#463d38]!">
                                                        <span v-if="floor.relic" class="text-green-400">有</span>
                                                        <span v-else class="opacity-40">无</span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </NTabPane>

                                    <!-- 第五页：所属敌群 -->
                                    <NTabPane name="pools" :tab="`所属敌群（${poolRows.length}）`">
                                        <NEmpty
                                            v-if="!poolRows.length"
                                            description="未出现在任何敌群"
                                            class="mt-2"
                                        />
                                        <div v-else class="flex flex-col gap-2 mt-2">
                                            <div
                                                v-for="pool in poolRows"
                                                :key="pool.id"
                                                class="flex items-center justify-between gap-3 rounded border! border-[#463d38]! px-3 py-2 cursor-pointer hover:bg-[#3a312a]!"
                                                @click="openPool(pool.id)"
                                            >
                                                <div class="min-w-0">
                                                    <div class="text-light">
                                                        敌群 {{ pool.id }}
                                                        <span
                                                            v-if="pool.notorious"
                                                            class="ml-1 text-xs text-red-400"
                                                        >
                                                            强敌
                                                        </span>
                                                    </div>
                                                    <div class="text-xs opacity-60 truncate">
                                                        <template v-if="pool.floors.length">
                                                            <template
                                                                v-for="(floor, index) in pool.floors"
                                                                :key="floor.id"
                                                            >
                                                                <span
                                                                    v-if="index"
                                                                    class="mx-1 opacity-60"
                                                                >
                                                                    /
                                                                </span>
                                                                {{ floor.map_name }} · {{ floor.name }}
                                                            </template>
                                                        </template>
                                                        <template v-else>无关联地图</template>
                                                    </div>
                                                </div>
                                                <span class="shrink-0 text-xs opacity-50">查看 ›</span>
                                            </div>
                                        </div>
                                    </NTabPane>
                                </NTabs>

                                <pre
                                    v-if="showRaw"
                                    class="mt-3 text-xs p-2 rounded bg-black/20 whitespace-pre-wrap break-all"
                                >{{ raw }}</pre>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </NModal>

        <SkillModal v-model:show="skillShow" :identification="skillId" />
        <!--
            必须 v-if：MapFloorModal 里也会渲染 EnemyModal（互相引用），
            无条件渲染会形成 EnemyModal → MapFloorModal → EnemyModal 的无限递归。
        -->
        <MapFloorModal v-if="mapFloorShow" v-model:show="mapFloorShow" :floor-id="mapFloorId" />

        <!--
            AI 条件里引用的单位（冰柱 / 召唤物）点开后叠一个详情。
            注意必须 v-if：这是组件自引用，写在 NModal 外面会随父组件一起创建，
            不加条件就会无限递归（Maximum call stack size exceeded）。
        -->
        <EnemyModal v-if="refShow" v-model:show="refShow" :enemy-id="refEnemyId" />

        <!--
            所属敌群点开后叠一个敌群详情；同理必须 v-if：敌群 modal 里又会渲染
            EnemyModal（互相引用），不加条件会无限递归。
        -->
        <EnemyPoolModal v-if="poolShow" v-model:show="poolShow" :pool-id="poolId" />
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton, NEmpty, NInputNumber, NModal, NSelect, NSlider, NTabPane, NTabs } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import ElementIcon from '../../components/ElementIcon.vue';
import WikiImg from '../../components/huiji/WikiImg.vue';
import { MwConfig } from '../../huiji/MwConfig';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import { useWikiDataStore } from '../../stores/wikiData';
import { ELEMENT_TYPE } from '../DataSearcher/data/enum';
import SkillModal from './SkillModal.vue';
import MapFloorModal from './MapFloorModal.vue';
import EnemyPoolModal from './EnemyPoolModal.vue';
import { useDataV2Store } from './dataV2Store';
import type { EnemyAiCondition, EnemyInterrupt, EnemyStat, Ref, SkillRef } from './types';

defineOptions({ name: '敌人详情ModalV2' });

const props = defineProps<{ show: boolean; enemyId: number | null; enemyVariantId?: number | null }>();
const emit = defineEmits<{ 'update:show': [value: boolean] }>();

const store = useDataV2Store();
const wiki = useWikiDataStore();
const canEdit = MwConfig.getInstance().canEdit;

const close = () => emit('update:show', false);
const onShowUpdate = (value: boolean) => emit('update:show', value);

const showRaw = ref(false);

/** 原始文档（IndexedDB 里存的那份，长键） */
const raw = computed(() => {
    const id = props.enemyId;
    if (id == null) return '';
    const doc = wiki.enemies.find((row) => row.id === id);
    return doc ? JSON.stringify(doc, null, 1) : '';
});

const row = computed(() =>
    props.enemyId == null ? null : (store.enemyById.get(props.enemyId) ?? null),
);

const subtitle = computed(() =>
    [row.value?.name_jp, row.value?.name_en].filter(Boolean).join(' · '),
);

/** wiki 上的缩略图文件名：`tmb_enemy_090_005_00` + `_s.png` */
const thumb = computed(() => (row.value?.thumbnail ? `${row.value.thumbnail}_s.png` : null));

// ---------- 技能详情 ----------
const skillShow = ref(false);
const skillId = ref<number | null>(null);
const openSkill = (id: number) => {
    skillId.value = id;
    skillShow.value = true;
};

// 出没地里点层名，叠一个地图层详情
const mapFloorShow = ref(false);
const mapFloorId = ref<number | null>(null);
const openMapFloor = (id: number) => {
    mapFloorId.value = id;
    mapFloorShow.value = true;
};

// 所属敌群里点敌群，叠一个敌群详情
const poolShow = ref(false);
const poolId = ref<number | null>(null);
const openPool = (id: number) => {
    poolId.value = id;
    poolShow.value = true;
};

// ---------- 变体 / 等级 / 翻页 ----------
const variantIndex = ref(0);
const level = ref(1);

/** 根据传入的实例 id（变体 id）定位要选中的变体下标；找不到或没传则默认第 0 个 */
const variantIndexOf = (id: number | null | undefined): number => {
    if (id == null) return 0;
    const variants = row.value?.variants ?? [];
    const idx = variants.findIndex((variant) => variant.id === id);
    return idx >= 0 ? idx : 0;
};
/** 翻页：基础情报 / 技能列表 / AI 规则 / 出没地 / 所属敌群 */
const activeTab = ref<'info' | 'skills' | 'ai' | 'spawn' | 'pools'>('info');

/** 百分比：保留一位小数，整数不带 ``.0`` */
const percentText = (value: number) => String(Math.round(value * 10) / 10);

/**
 * 还没解析出含义的条件类型：清洗时兜底成了 ``type 7(1,3,1)`` 这种文案，
 * 这里拆成「类型号 + 原始参数」两段，模板里渲染成一枚虚线徽章。
 */
const unknownType = (text: string | null) => {
    const match = text ? /^type (\d+)(?:\((.*)\))?$/.exec(text) : null;
    return match ? { name: `TYPE ${match[1]}`, args: match[2] ?? '' } : null;
};

/** 条件展示用：额外带上未解析类型的徽章数据 */
const conditionView = (condition: EnemyAiCondition) => ({
    ...condition,
    unknown: unknownType(condition.text),
});

/**
 * 插入（割り込み）：满足条件立刻施放、不参与抽选，优先于普通行动规则，
 * 所以排在表格最前面，且没有优先级数字 / 抽选概率，只有「插入」「仅一次」标记。
 */
const interruptRows = computed(() =>
    (variant.value?.interrupts ?? []).map((hit) => ({
        priority: null,
        once: hit.once,
        conditions: hit.conditions.map(conditionView),
        skills: [{ skill: hit.skill, target: null, percent: '' }],
    })),
);

/**
 * 技能池展示用：权重 0 的行是脚本 / 特殊机制触发、AI 不会随机选的技能，直接隐藏；
 * 剩下的把权重换算成「本池内的抽选概率」（``105`` / ``99`` 这类合计不为 100 的也一样）。
 */
const aiPlan = computed(() => [
    ...interruptRows.value,
    ...(variant.value?.ai_plan ?? []).map((rule) => {
        const skills = rule.skills.filter((entry) => entry.weight > 0);
        const total = skills.reduce((sum, entry) => sum + entry.weight, 0);
        return {
            priority: rule.priority,
            once: false,
            conditions: rule.conditions.map(conditionView),
            skills: skills.map((entry) => ({
                skill: entry.skill,
                target: entry.target,
                percent: percentText(total ? (entry.weight / total) * 100 : 0),
            })),
        };
    }),
]);

// ---------- AI 条件里引用的单位（冰柱 / 召唤物）----------
/** 条件里的 ref 是 EnemyCategory.id，能查到名字就显示成链接 */
const enemyLinkText = (ref: number): string | null => {
    const enemy = store.enemyById.get(ref);
    if (!enemy) return null;
    return enemy.name || enemy.name_jp || `#${ref}`;
};

/** 条件里的 status 是子效果种类 id（``SkillSubEffectKind``），名字走效果种类名表 */
const statusLabel = (status: number) => store.effectKinds[String(status)]?.name ?? `#${status}`;

const refShow = ref(false);
const refEnemyId = ref<number | null>(null);
const openEnemyRef = (ref: number) => {
    if (!store.enemyById.has(ref)) return;
    refEnemyId.value = ref;
    refShow.value = true;
};

watch(
    () => props.enemyId,
    () => {
        variantIndex.value = variantIndexOf(props.enemyVariantId);
        activeTab.value = 'info';
    },
);

// 同一分类下点了不同实例（变体）时 enemyId 不变，单独按实例 id 重新定位
watch(
    () => props.enemyVariantId,
    () => {
        if (props.enemyId != null) variantIndex.value = variantIndexOf(props.enemyVariantId);
    },
);

/** 等级区间文案：只有上下限不同才写成区间，否则就是一个等级 */
function levelLabel(item: { level_min: number; level_max: number }): string {
    const low = item.level_min || item.level_max || 0;
    const high = item.level_max || low;
    if (!low) return 'Lv?';
    return high > low ? `Lv${low}-${high}` : `Lv${low}`;
}

const variantOptions = computed(() =>
    (row.value?.variants ?? []).map((item, index) => ({
        value: index,
        label: `${item.id} ${item.kind_name ?? ''} ${levelLabel(item)}（${item.skills.length} 技能）`.trim(),
    })),
);

const variant = computed(() => row.value?.variants[variantIndex.value] ?? null);

watch(
    variant,
    (value) => {
        level.value = value?.level_min || 1;
    },
    { immediate: true },
);

/** 等级区间（``EnemyLayout`` 里的出现楼层）；没区间时退化成一个数字输入框 */
const levelRange = computed<[number, number] | null>(() => {
    const item = variant.value;
    if (!item) return null;
    const low = item.level_min || 1;
    const high = item.level_max || low;
    return high > low ? [low, high] : null;
});

// ---------- 数值计算 ----------
/**
 * 敌人属性：`(base + growth * lv / 100) * correction / 100`，向上取整。
 * 用参考站的哥布林 Lv2 校验过（攻击 27 / 防御 33 / 隐蔽 -7）。
 */
const statValue = (key: string): number | null => {
    const stat: EnemyStat | undefined = variant.value?.stats?.[key];
    if (!stat) return null;
    const correction = (stat.correction || 100) / 100;
    const raw = (stat.base + (stat.growth * level.value) / 100) * correction;
    return Math.ceil(raw);
};

/** HP 浮动只作用于 base 部分：`base * fluctuation% + growth * lv / 100` */
const hpRange = computed<[number, number] | null>(() => {
    const stat: EnemyStat | undefined = variant.value?.stats?.hp;
    if (!stat) return null;
    const correction = (stat.correction || 100) / 100;
    const growth = (stat.growth * level.value) / 100;
    const low = (stat.base * ((stat.min || 100) / 100) + growth) * correction;
    const high = (stat.base * ((stat.max || 100) / 100) + growth) * correction;
    return [Math.floor(low), Math.ceil(high)];
});

const STAT_ROWS: Array<[string, string]> = [
    ['hp', 'HP'],
    ['mp', 'MP'],
    ['sp', 'SP'],
    ['attack', '攻击力'],
    ['magic', '魔力'],
    ['divine', '神力'],
    ['defence', '防御力'],
    ['magic_defence', '法术防御力'],
    ['hit', '命中'],
    ['avoid', '回避'],
    ['resist', '抵抗'],
    ['critical', '会心'],
    ['avoid_critical', '会心回避'],
    ['initiative', '行动速度'],
    ['covert', '隐蔽'],
];

const RESIST_ROWS: Array<[string, string]> = [
    ['poison', '毒'],
    ['sleep', '睡眠'],
    ['stun', '气绝'],
    ['paralys', '麻痹'],
    ['curse', '诅咒'],
    ['fear', '恐惧'],
    ['seal', '封印'],
    ['charm', '魅惑'],
    ['instant_death', '即死'],
    ['wt_change', '行动延迟'],
    ['confuse', '混乱'],
    ['stone', '石化'],
    ['critical', '暴击'],
    ['freeze', '冻结'],
    ['extinction', '消灭'],
    ['parameter_down', '能力下降'],
];

/** 基础情报里的一格；带 ``skillId`` 的值渲染成可点的技能链接（遗物之力） */
type PairCell = {
    label: string;
    value: string;
    cls?: string;
    icons?: ELEMENT_TYPE[];
    skillId?: number | null;
};

/** 两列并排：把 [{label, value}] 按顺序两两分组（先左后右、再换行） */
const pairs = (cells: PairCell[]) => {
    const out: Array<PairCell[]> = [];
    for (let i = 0; i < cells.length; i += 2) out.push(cells.slice(i, i + 2));
    return out;
};

/** 两列并排：先自上而下填满左列，再填右列（先上下、再左右）；奇数项补一个空项，避免末项独占整行 */
const pairsByColumn = (cells: PairCell[]) => {
    const list = cells.length % 2 ? [...cells, { label: '', value: '' }] : cells;
    const rows = Math.ceil(list.length / 2);
    const out: Array<PairCell[]> = [];
    for (let i = 0; i < rows; i++) out.push([list[i], list[i + rows]]);
    return out;
};

const namesText = (rows: Array<{ name?: string | null }>) =>
    rows.length ? rows.map((item) => item.name ?? '').join(' / ') : '无';

/** 值为空 / 无 / 没有时降低亮度 */
const DIM = 'opacity-50';

const ELEMENT_NAMES = new Set<string>(Object.values(ELEMENT_TYPE));

/** 属性图标：跳过「无(7) / 没有(999) / 0」这些占位属性 */
const elementIcons = (refs: Ref[] | undefined): ELEMENT_TYPE[] =>
    (refs ?? [])
        .filter((item) => item.id && item.id !== 7 && item.id !== 999)
        .map((item) => item.name)
        .filter((name): name is ELEMENT_TYPE => Boolean(name) && ELEMENT_NAMES.has(name as string));

/** 属性类单元格：有真实属性时带图标，否则显示「无」并降亮度 */
const attributeCell = (refs: Ref[] | undefined) => {
    const icons = elementIcons(refs);
    return {
        value: refs?.length ? namesText(refs) : '无',
        cls: icons.length ? undefined : DIM,
        icons,
    };
};

/**
 * 基础情报：种族来自 ``EnemyCategory``（全实例共享），属性 / 弱点 / 特性 /
 * 攻击属性 / 飞行挂在当前 ``Enemy`` 变体上，混在一张表里。
 */
const basicPairs = computed(() => {
    const cat = row.value;
    const item = variant.value;
    if (!cat || !item) return [];
    const list = (refs: Array<{ name?: string | null }> | undefined) =>
        refs?.length ? namesText(refs) : '无';
    return pairs([
        { label: '种族', value: cat.race.name ?? '—' },
        {
            label: '特性',
            value: list(item.characteristics),
            cls: item.characteristics?.length ? undefined : DIM,
        },
        { label: '属性', ...attributeCell(item.attribute) },
        { label: '弱点', ...attributeCell(item.weak) },
        { label: '攻击属性', ...attributeCell(item.attack_attribute) },
        { label: '飞行', value: item.fly ? '是' : '否', cls: item.fly ? undefined : DIM },
    ]);
});

/**
 * 出没地：反查地图层。``RawMapFloor`` 的 ``normal_enemies`` / ``notorious_enemies``
 * 里记的 ``enemy_id`` 是敌人**实例（变体）id**，不是图鉴分类 id，所以按当前变体的
 * ``id`` 比对。
 *
 * 遗物：只有该层某个敌群里，本变体站在第一排（``pos_y = 1``）时才会掉；
 * 怪物本身的图鉴编号（``no``）对不上遗物数据时整列都是「—」。
 */
const spawnRows = computed(() => {
    const item = variant.value;
    if (item == null || !wiki.mapFloors?.length) return [];
    const relic = row.value?.no ? store.relicByMonsterNo.get(row.value.no) : undefined;
    return wiki.mapFloors
        .filter(
            (floor) =>
                floor.normal_enemies.some((e) => e.enemy_id === item.id) ||
                floor.notorious_enemies.some((e) => e.enemy_id === item.id),
        )
        .map((floor) => ({
            id: floor.id,
            map_name: floor.map_name,
            name: floor.name,
            relic: !!relic && store.inFrontRow(floor.formations, item.id),
        }));
});

/**
 * 所属敌群：反查包含当前变体的敌群（敌群里的 ``enemy_id`` 是出现变体 id，
 * 与出没地同口径，按 ``variant.id`` 比对）。强敌 / 普通敌分别记在
 * ``notorious_enemies`` / ``normal_enemies`` 里。
 */
const poolRows = computed(() => {
    const item = variant.value;
    if (item == null || !store.enemyPools?.length) return [];
    const id = item.id;
    return store.enemyPools
        .filter((pool) =>
            (pool.normal_enemies ?? []).some((e) => e.enemy_id === id) ||
            (pool.notorious_enemies ?? []).some((e) => e.enemy_id === id),
        )
        .map((pool) => ({
            id: pool.id,
            notorious: (pool.notorious_enemies ?? []).some((e) => e.enemy_id === id),
            floors: pool.floors ?? [],
        }));
});

const freezePairs = computed(() => {
    const freeze = variant.value?.freeze ?? row.value?.freeze;
    if (!freeze && !row.value) return [];
    const relic = row.value?.no ? store.relicByMonsterNo.get(row.value.no) : undefined;
    return pairs([
        { label: '半冻结', value: freeze?.half ? `${freeze.half} 层` : '—' },
        { label: '完全冻结', value: freeze?.full ? `${freeze.full} 层` : '—' },
        { label: '破冰', value: freeze?.break ? `${freeze.break} 层` : '—' },
        { label: '自然回复', value: freeze?.recovery ? `${freeze.recovery}%` : '—' },
        { label: '智力', value: String(freeze?.intelligence ?? 0) },
        {
            label: '遗物',
            value: relic ? (relic.name ?? `#${relic.id}`) : '—',
            cls: relic ? undefined : DIM,
            skillId: relic?.skill_id ?? null,
        },
    ]);
});

const statPairs = computed(() =>
    pairsByColumn(
        STAT_ROWS.map(([key, label]) => {
            if (key === 'hp' && hpRange.value) {
                const [low, high] = hpRange.value;
                return { label, value: low === high ? String(low) : `${low}～${high}` };
            }
            const value = statValue(key);
            return { label, value: value == null ? '0' : String(value) };
        }),
    ),
);

const resistOf = (key: string) =>
    variant.value?.resist?.[key] ?? row.value?.resist?.[key] ?? null;

const resistPairs = computed(() =>
    pairsByColumn(
        RESIST_ROWS.map(([key, label]) => {
            const value = resistOf(key);
            // 没有记录按 0% 处理：100% 为基准（稍暗），<100 更易中（红），>100 更抗（绿）
            const num = value == null ? 0 : value;
            let cls = 'opacity-60';
            // 0% 单独用更暗的红，和 1~99% 区分开
            if (num === 0) cls = 'text-red-600';
            else if (num < 100) cls = 'text-red-400';
            else if (num > 100) cls = 'text-green-400';
            return { label, value: `${num}%`, cls };
        }),
    ),
);

/**
 * 插入技能按技能合并成一行（技能表用）：同一个技能会挂多档触发
 * （例如「HP 60% 以下」「HP 30% 以下」各一条），这里取最低那一档，
 * 全部触发方式都「一次」才算「插入·一次」。
 */
const interruptBySkill = (list: EnemyInterrupt[]) => {
    const out = new Map<number, { skill: SkillRef; once: boolean; hp: number | null }>();
    for (const hit of list) {
        const key = hit.skill.identification;
        const prev = out.get(key);
        if (!prev) {
            out.set(key, { skill: hit.skill, once: hit.once, hp: hit.hp });
            continue;
        }
        prev.once = prev.once && hit.once;
        if (hit.hp && (!prev.hp || hit.hp < prev.hp)) prev.hp = hit.hp;
    }
    return [...out.values()];
};

/**
 * 技能：清洗时已把 identification 分好栏（行动 / 插入 / 被动 / 挣扎），
 * 名字与类型从技能数据里查。旧数据没有分栏时退回 ``skills`` 平铺。
 */
const skillRows = computed(() => {
    const item = variant.value;
    const seen = new Set<number>();
    const rows: Array<{
        id: number;
        name: string;
        /** 多级技能里实际使用的等级（0 = 不显示） */
        level: number;
        kind: string;
        trigger: string;
        summons: Array<{ category: number; count: number; name: string }>;
    }> = [];

    const push = (ref: SkillRef | null | undefined, trigger: string) => {
        if (!ref || seen.has(ref.identification)) return;
        seen.add(ref.identification);
        const skill = store.skillById.get(ref.identification);
        // 该等级自己的名字（多级技能名字不同时才有），没有就用技能本名
        const levelRow =
            ref.level && skill ? skill.levels.find((item) => item.level === ref.level) : undefined;
        // 召唤出来的单位（EnemyFriendLayout）；四个冰柱是四个分类，名字相同就合并计数
        const summons = new Map<string, { category: number; count: number; name: string }>();
        for (const unit of skill?.summons ?? []) {
            const name = enemyLinkText(unit.category) ?? `#${unit.category}`;
            const merged = summons.get(name);
            if (merged) merged.count += unit.count;
            else summons.set(name, { category: unit.category, count: unit.count, name });
        }
        rows.push({
            id: ref.identification,
            name: levelRow?.name || ref.name || skill?.name || `#${ref.identification}`,
            // 等级名本身已经带了等级时不再重复标；其余多级技能才标 Lv
            level: levelRow?.name
                ? 0
                : (skill?.levels?.length ?? 0) > 1
                  ? (ref.level ?? 0)
                  : 0,
            kind: skill?.kind_name ?? '—',
            trigger,
            summons: [...summons.values()],
        });
    };

    const action = item?.action_skills ?? [];
    const interrupt = interruptBySkill(item?.interrupts ?? []);
    const passive = item?.passive_skills ?? [];
    if (action.length || interrupt.length || passive.length) {
        action.forEach((ref) => push(ref, '行动'));
        // 触发条件（HP 档位等）在 AI 行动规则表里已经列了，这列只标「插入 / 一次」
        for (const hit of interrupt) {
            push(hit.skill, hit.once ? '插入·一次' : '插入');
        }
        passive.forEach((ref) => push(ref, '被动'));
        push(item?.struggle_skill, '挣扎');
        return rows;
    }

    const ids = item?.skills?.length ? item.skills : (row.value?.skills ?? []);
    ids.forEach((ref) => push(ref, '—'));
    return rows;
});
</script>
