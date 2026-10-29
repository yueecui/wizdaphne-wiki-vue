<template>
    <ThemeConfigProvider>
        <NModal :show="show" @update:show="onShowUpdate" @esc="close" @mask-click="close">
            <div class="w-[95vw] md:w-[880px] max-h-[88vh] m-auto flex flex-col huiji-css-hook bg-transparent!">
                <div class="flex flex-col min-h-0 bg-[#312721]! border! border-[#463d38]! rounded">
                    <!-- 头部与技能 modal 同款：No. + 名称（稀有度着色）+ 日/英名 -->
                    <div class="shrink-0 bg-[#312721] px-4 pt-3 pb-2 border-b! border-[#463d38]!">
                        <div class="flex items-start gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="text-sm text-light">加护 No. {{ blessing?.id ?? '—' }}</div>
                                <div
                                    class="text-2xl md:text-3xl font-bold break-words"
                                    :class="blessing ? rarityTextClass(blessing.rarity) : 'text-light'"
                                >
                                    {{ blessing?.name ?? '加护详情' }}
                                </div>
                                <div v-if="subtitle" class="text-sm text-gray-400 break-words">{{ subtitle }}</div>
                            </div>
                            <NButton size="tiny" quaternary @click="close">关闭</NButton>
                        </div>
                    </div>

                    <div class="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-4">
                        <NEmpty v-if="!blessing" description="未选择加护" />
                        <div v-else class="flex flex-col gap-4 text-sm">
                            <table class="wikitable w-full table-fixed! text-center text-sm border-collapse m-0!">
                                <colgroup>
                                    <col class="w-[4.5rem]!" />
                                    <col />
                                    <col class="w-[4.5rem]!" />
                                    <col />
                                </colgroup>
                                <tbody>
                                    <tr>
                                        <th colspan="4" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">
                                            基本信息
                                        </th>
                                    </tr>
                                    <tr>
                                        <th class="h-9 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!">
                                            稀有度
                                        </th>
                                        <td
                                            class="h-9 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                                        >
                                            <span :class="rarityTextClass(blessing.rarity)">
                                                {{ rarityName(blessing.rarity) }}
                                            </span>
                                        </td>
                                        <th class="h-9 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!">
                                            权重
                                        </th>
                                        <td
                                            class="h-9 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                                        >
                                            {{ blessing.weight }}
                                        </td>
                                    </tr>
                                    <tr>
                                        <th class="h-9 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!">
                                            加护池
                                        </th>
                                        <td
                                            class="h-9 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                                        >
                                            {{ poolName(blessing.pool) }}
                                        </td>
                                        <th class="h-9 px-2 py-1 align-middle whitespace-nowrap border! border-[#463d38]!">
                                            加护组
                                        </th>
                                        <td
                                            class="h-9 px-2 py-1 align-middle whitespace-normal break-words border! border-[#463d38]!"
                                        >
                                            {{ layerText || '—' }}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <table
                                v-if="blessing.description"
                                class="wikitable w-full table-fixed! text-center text-sm border-collapse m-0!"
                            >
                                <colgroup>
                                    <col class="w-[4.5rem]!" />
                                    <col />
                                </colgroup>
                                <tbody>
                                    <tr>
                                        <th colspan="2" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">
                                            描述
                                        </th>
                                    </tr>
                                    <tr>
                                        <td
                                            colspan="2"
                                            class="text-left px-2 py-2 align-top border! border-[#463d38]!"
                                        >
                                            <div class="whitespace-pre-line">{{ blessing.description }}</div>
                                            <div v-if="blessing.description_lang" class="text-xs opacity-60 mt-1">
                                                （暂无中文说明，显示语言：{{ blessing.description_lang }}）
                                            </div>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>

                            <!-- 效果：与技能详情的 sub effect 表同款式（kind 标签 + 效果名 · 参数名 | 值） -->
                            <div class="overflow-x-auto thin-scrollbar">
                                <table class="wikitable w-full min-w-[420px] text-center text-sm border-collapse m-0!">
                                    <tbody>
                                        <tr>
                                            <th colspan="2" class="bg-black/50 px-2 py-1 border! border-[#463d38]!">
                                                效果
                                            </th>
                                        </tr>
                                        <tr>
                                            <th class="w-[60%] text-left px-2 py-1 whitespace-nowrap border! border-[#463d38]!">
                                                项目
                                            </th>
                                            <th class="px-2 py-1 whitespace-nowrap border! border-[#463d38]!">值</th>
                                        </tr>
                                        <tr v-if="!rows.length">
                                            <td colspan="2" class="px-2 py-1 border! border-[#463d38]! opacity-50">无</td>
                                        </tr>
                                        <tr v-for="(row, index) in rows" :key="index">
                                            <td
                                                class="text-left px-2 py-1 whitespace-nowrap border! border-[#463d38]!"
                                                :style="row.previous ? { paddingLeft: '1.4rem' } : undefined"
                                            >
                                                <template v-if="row.previous">
                                                    <span>{{ row.name }}</span>
                                                </template>
                                                <template v-else>
                                                    <!-- 标出 kind id，方便对照 EffectKind 表（与技能详情一致） -->
                                                    <NTag
                                                        size="tiny"
                                                        :bordered="false"
                                                        type="warning"
                                                        class="mr-1! align-middle"
                                                    >
                                                        {{ row.kind }}
                                                    </NTag>
                                                    <span>{{ row.group }}</span>
                                                    <span class="mx-1 opacity-50">·</span>
                                                    <span class="opacity-60">{{ row.name }}</span>
                                                </template>
                                            </td>
                                            <td class="px-2 py-1 border! border-[#463d38]! whitespace-nowrap">
                                                <span v-if="!row.value" class="text-[0.75rem] leading-none opacity-30">
                                                    —
                                                </span>
                                                <template v-else>{{ row.value }}</template>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </NModal>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton, NEmpty, NModal, NTag } from 'naive-ui';
import { computed } from 'vue';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import {
    effectRows,
    poolName,
    rarityName,
    rarityTextClass,
    type BlessingEffectRow,
} from './blessingEffects';
import type { BlessingDoc, BlessingFile } from './blessingTypes';
import { useDataV2Store } from './dataV2Store';

defineOptions({ name: '加护详情Modal' });

const props = defineProps<{
    show: boolean;
    blessing: BlessingDoc | null;
    /** 整个数据文件（字典 + 楼层名都在里面） */
    file: BlessingFile | null;
}>();

const emit = defineEmits<{ 'update:show': [value: boolean] }>();

const store = useDataV2Store();
/** 效果种类名：wiki 上维护的中文名优先（`Data:EffectKind.json`） */
const kindLabel = (kind: number) => store.effectKinds[String(kind)]?.name;

/** 标题下的日文 / 英文名 */
const subtitle = computed(() => {
    const row = props.blessing;
    if (!row) return '';
    return [row.name_jp, row.name_en].filter((name) => name && name !== row.name).join(' · ');
});

/** 组挂的楼层名（一个组可能对应多层） */
const layerText = computed(() => {
    const groupId = props.blessing?.group;
    if (groupId == null) return '';
    return (props.file?.groups?.[String(groupId)]?.layers ?? []).join(' / ');
});

/** 展平成一行行；同一效果的后续参数行缩进，避免重复 kind 标签 */
const rows = computed<Array<BlessingEffectRow & { previous: boolean }>>(() => {
    const dict = props.file;
    const blessing = props.blessing;
    if (!dict || !blessing) return [];
    const out: Array<BlessingEffectRow & { previous: boolean }> = [];
    for (const effect of blessing.effects) {
        let first = true;
        for (const row of effectRows(effect, dict, kindLabel)) {
            out.push({ ...row, previous: !first });
            first = false;
        }
    }
    return out;
});

const close = () => emit('update:show', false);
const onShowUpdate = (value: boolean) => emit('update:show', value);
</script>
