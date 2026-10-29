<template>
    <ThemeConfigProvider>
        <NModal :show="show" @update:show="onShowUpdate" @esc="close" @mask-click="close">
            <div class="w-[95vw] md:w-[720px] m-auto flex flex-col huiji-css-hook bg-transparent!">
                <div class="flex flex-col min-h-0 bg-[#312721]! border! border-[#463d38]! rounded">
                    <!-- 头部：图标 + 图鉴编号 / 名称 / 日文名；右侧 ID、英文类型、原始 JSON -->
                    <div class="shrink-0 bg-[#312721] px-4 pt-3 pb-2 border-b! border-[#463d38]!">
                        <div class="flex items-start gap-3">
                            <WikiImg
                                v-if="item?.icon"
                                :imageName="`${item.icon}.png`"
                                class="w-16 h-16 object-contain shrink-0 self-center"
                            />
                            <div class="flex-1 min-w-0">
                                <div class="text-sm text-light">
                                    <template v-if="item?.collection?.no != null">
                                        No. {{ formatCollectionNo(item.collection.no) }}
                                    </template>
                                    <template v-else>无图鉴</template>
                                </div>
                                <div class="text-2xl md:text-3xl text-light font-bold break-words flex items-baseline gap-3">
                                    <span>{{ item?.name ?? '物品详情' }}</span>
                                    <span v-if="starText" class="text-base text-yellow-300">{{ starText }}</span>
                                </div>
                                <div v-if="foreignName" class="text-sm text-gray-400 break-words">
                                    {{ foreignName }}
                                </div>
                            </div>
                            <div class="flex flex-col items-end gap-1 shrink-0">
                                <span v-if="item" class="text-xs text-gray-600">ID {{ item.id }}</span>
                                <span class="text-xs text-gray-500">{{ shortType }}</span>
                                <NButton v-if="canEdit" size="tiny" quaternary @click="showRaw = !showRaw">
                                    {{ showRaw ? '隐藏 JSON' : '原始 JSON' }}
                                </NButton>
                                <NButton size="tiny" quaternary @click="close">关闭</NButton>
                            </div>
                        </div>
                    </div>

                    <!-- 内容 -->
                    <div
                        v-if="item"
                        class="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-4 flex flex-col gap-4 max-h-[70vh]"
                    >
                        <!-- 价格 + 描述（沿用 V1 物品弹窗的版式） -->
                        <table class="wikitable w-full text-center m-0!">
                            <tbody>
                                <tr>
                                    <th colspan="4">物品信息</th>
                                </tr>
                                <tr>
                                    <th class="w-1/4">图鉴分类</th>
                                    <td class="w-1/4">
                                        <template v-if="item.collection_group">
                                            {{ item.collection_group }}
                                        </template>
                                        <span v-else class="opacity-40">—</span>
                                    </td>
                                    <th class="w-1/4">出售价格</th>
                                    <td class="w-1/4">
                                        <template v-if="(item.value ?? 0) > 0">{{ item.value }}</template>
                                        <span v-else class="opacity-40">—</span>
                                    </td>
                                </tr>
                                <tr>
                                    <th colspan="4">描述</th>
                                </tr>
                                <tr>
                                    <td colspan="4" class="text-left">
                                        <div class="min-h-[4.5rem] whitespace-pre-wrap">
                                            <template v-for="(segment, index) in descSegments" :key="index">
                                                <img
                                                    v-if="segment.type === 'image'"
                                                    :src="imageUrl(segment.name)"
                                                    alt=""
                                                    class="inline-block h-4 align-text-bottom"
                                                    @error="hideBrokenImage"
                                                />
                                                <!-- `<color=…>` 片段：只带一个经过白名单校验的 color -->
                                                <span
                                                    v-else-if="segment.color"
                                                    :style="{ color: segment.color }"
                                                >{{ segment.text }}</span>
                                                <template v-else>{{ segment.text }}</template>
                                            </template>
                                            <template v-if="!descSegments.length">—</template>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- 使用效果：技能关联 -->
                        <table v-if="hasUseSkill" class="wikitable w-full m-0!">
                            <tbody>
                                <tr>
                                    <th colspan="2">使用效果</th>
                                </tr>
                                <tr>
                                    <th class="w-[8em]">发动技能</th>
                                    <td class="text-left">
                                        <a
                                            class="cursor-pointer text-blue-400 hover:underline"
                                            @click="openSkill(item.use_skill?.id)"
                                        >
                                            {{ item.use_skill?.name ?? skillName(item.use_skill?.id) }}
                                        </a>
                                    </td>
                                </tr>
                                <tr v-if="skillDesc(item.use_skill?.id)">
                                    <th>技能说明</th>
                                    <td class="text-left whitespace-pre-wrap">
                                        {{ skillDesc(item.use_skill?.id) }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- 遗物效果：有值的字段才列出 -->
                        <table v-if="hasRelic" class="wikitable w-full m-0!">
                            <tbody>
                                <tr>
                                    <th colspan="2" class="text-left!">遗物效果</th>
                                </tr>
                                <tr v-if="starText">
                                    <th class="w-[8em] text-left!">等级</th>
                                    <td class="text-yellow-300 text-left!">{{ starText }}</td>
                                </tr>
                                <tr v-if="item.relic?.alignment != null">
                                    <th class="text-left!">属性</th>
                                    <td class="text-left!">{{ alignmentName }}</td>
                                </tr>
                                <tr v-if="item.relic?.skill_id">
                                    <th class="text-left!">技能</th>
                                    <td class="text-left!">
                                        <a
                                            class="cursor-pointer text-blue-400 hover:underline"
                                            @click="openSkill(item.relic?.skill_id)"
                                        >
                                            {{ skillName(item.relic?.skill_id) }}
                                        </a>
                                    </td>
                                </tr>
                                <tr v-if="skillDesc(item.relic?.skill_id)">
                                    <th class="text-left!">技能说明</th>
                                    <td class="text-left! whitespace-pre-wrap">
                                        {{ skillDesc(item.relic?.skill_id) }}
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- 钓鱼参数：只显示有值的项 -->
                        <table v-if="fishingRows.length" class="wikitable w-full text-center m-0!">
                            <tbody>
                                <tr>
                                    <th colspan="2">钓鱼数据</th>
                                </tr>
                                <tr v-for="row in fishingRows" :key="row.label">
                                    <th class="w-[8em]">{{ row.label }}</th>
                                    <td>{{ row.value }}</td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- 商店：只列商店页清洗后仍存在的商品 -->
                        <table v-if="shopRows.length" class="wikitable w-full text-center m-0!">
                            <thead>
                                <tr>
                                    <th>商店</th>
                                    <th>数量</th>
                                    <th>价格</th>
                                    <th>限购</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="(row, index) in shopRows" :key="index">
                                    <td class="text-left">{{ row.shop }}</td>
                                    <td>{{ row.quantity }}</td>
                                    <td class="whitespace-nowrap">{{ row.price }}</td>
                                    <td class="whitespace-nowrap">
                                        <template v-if="row.limit">{{ row.limit }}</template>
                                        <span v-else class="opacity-40">—</span>
                                    </td>
                                </tr>
                            </tbody>
                        </table>

                        <!-- 原始 JSON（仅可编辑用户，按钮在头部 ID 下方） -->
                        <pre
                            v-if="showRaw"
                            class="shrink-0 text-xs p-2 rounded bg-black/20 whitespace-pre-wrap break-all"
                        >{{ raw }}</pre>
                    </div>
                </div>
            </div>
        </NModal>

        <SkillModal v-model:show="skillShow" :identification="skillId" />
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton, NModal } from 'naive-ui';
import { computed, ref } from 'vue';
import WikiImg from '../../components/huiji/WikiImg.vue';
import { MwConfig } from '../../huiji/MwConfig';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import { getImageUrl } from '../../util/getImageUrl';
import { useDataV2Store } from './dataV2Store';
import SkillModal from './SkillModal.vue';
import {
    CURRENCY_LABELS,
    formatCollectionNo,
    LIMIT_LABELS,
    parseDescription,
    SHOP_KIND_LABELS,
    type ItemDoc,
    type ItemShopRow,
} from './itemTypes';

const props = defineProps<{ show: boolean; item: ItemDoc | null }>();
const emit = defineEmits<{ 'update:show': [value: boolean] }>();

const store = useDataV2Store();
const canEdit = MwConfig.getInstance().canEdit;

/** `Item::Expendable` -> `Expendable` */
const shortType = computed(() => (props.item?.type ?? '').replace('Item::', '') || '—');

/** 描述片段：纯文本 + 游戏内的阶级图标（`Grade_info_iconN.png`） */
const descSegments = computed(() => parseDescription(props.item?.desc));

const imageUrl = (name: string) => getImageUrl(name);

/** 图标资源缺失时不留破图 */
const hideBrokenImage = (event: Event) => {
    (event.target as HTMLImageElement).style.display = 'none';
};

/** 遗物星级：按 `RelicItem.rank`（等级）重复 ★ */
const starText = computed(() => {
    const rank = props.item?.relic?.rank;
    return rank && rank > 0 ? '★'.repeat(rank) : '';
});

/** 标题下方的外文名：日文名后接英文名 */
const foreignName = computed(() =>
    [props.item?.name_jp, props.item?.name_en].filter(Boolean).join(' · '),
);

const ALIGNMENT_LABELS: Record<number, string> = { 1: '善', 2: '中立', 3: '恶' };

const alignmentName = computed(() => {
    const value = props.item?.relic?.alignment;
    return value == null ? '—' : (ALIGNMENT_LABELS[value] ?? String(value));
});

/** 遗物效果区块：任一展示项有值就显示（没数据的不显示整块） */
const hasRelic = computed(() => {
    const relic = props.item?.relic;
    if (!relic) return false;
    return starText.value !== '' || relic.alignment != null || relic.skill_id != null;
});

/** 使用效果区块：有技能 id 才显示（不可使用的物品解出来是空对象） */
const hasUseSkill = computed(() => {
    const skill = props.item?.use_skill;
    if (!skill) return false;
    return skill.id != null || !!skill.name;
});

/** 钓鱼数据：只把有值的项列出来 */
const fishingRows = computed(() => {
    const fishing = props.item?.fishing;
    if (!fishing) return [];
    const rows: Array<{ label: string; value: string }> = [];
    if (fishing.volume != null) rows.push({ label: '水量', value: String(fishing.volume) });
    if (fishing.duration != null) rows.push({ label: '时长', value: String(fishing.duration) });
    if (fishing.min_meet != null || fishing.max_meet != null) {
        rows.push({ label: '咬钩', value: `${fishing.min_meet ?? '—'} ~ ${fishing.max_meet ?? '—'}` });
    }
    if (fishing.min_success != null || fishing.max_success != null) {
        rows.push({
            label: '成功',
            value: `${fishing.min_success ?? '—'} ~ ${fishing.max_success ?? '—'}`,
        });
    }
    return rows;
});

/** 价格：兑换点数的 `currency_name` 已是实际点数名（如「银鳞硬币」） */
const priceText = (row: ItemShopRow) => {
    const unit = row.currency_name || CURRENCY_LABELS[row.currency ?? 0] || '';
    return `${row.price ?? 0}${unit ? ` ${unit}` : ''}`;
};

/** 限购文案，与商店页同一套规则；空串 = 不限购（显示为暗色横线） */
const limitTextOf = (row: ItemShopRow) => {
    if (!row.limit_kind) return row.limit_num ? `共 ${row.limit_num} 次` : '';
    const period = row.limit_kind === 4 ? '限购' : (LIMIT_LABELS[row.limit_kind] ?? '');
    const times = row.limit_num ? `${row.limit_num} 次` : '';
    return [period, times].filter(Boolean).join(' ');
};

/** 商店行：直接铺开后端（shop.py）清洗好的 `item.shop`，不再加载商店模块 */
const shopRows = computed(() => {
    const rows: Array<{ shop: string; price: string; quantity: number; limit: string }> = [];
    for (const row of props.item?.shop ?? []) {
        rows.push({
            shop: row.shop_name || SHOP_KIND_LABELS[row.shop_kind ?? 0] || '特殊',
            price: priceText(row),
            quantity: row.quantity ?? 1,
            limit: limitTextOf(row),
        });
    }
    return rows;
});

const skillName = (id?: number) => {
    if (!id) return '—';
    return store.skillById.get(id)?.name ?? `#${id}`;
};

const skillDesc = (id?: number) => {
    if (!id) return '';
    const skill = store.skillById.get(id);
    return skill?.description ?? skill?.detail_description ?? '';
};

const skillShow = ref(false);
const skillId = ref<number | null>(null);

const openSkill = (id?: number) => {
    if (!id) return;
    skillId.value = id;
    skillShow.value = true;
};

const showRaw = ref(false);

const raw = computed(() => JSON.stringify(props.item, null, 1));

const close = () => emit('update:show', false);

const onShowUpdate = (value: boolean) => emit('update:show', value);
</script>
