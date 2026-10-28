<template>
    <div class="flex flex-col gap-4">
        <div class="text-sm">
            妖精专用的装备只有妖精可以装备，其中带套装技能的装备凑齐 3 件即可生效。更多信息请参考
            <a href="/wiki/妖精" target="_blank">妖精</a>
            条目。
        </div>

        <table v-if="blocks.length" class="wikitable text-sm text-center">
            <thead>
                <tr>
                    <th class="2xl:w-30">技能</th>
                    <th class="2xl:w-24">装备组</th>
                    <th class="w-20">武器</th>
                    <th class="w-16">头部</th>
                    <th class="w-16">手部</th>
                    <th class="w-16">身体</th>
                    <th class="w-16">盾</th>
                    <th class="w-16">脚部</th>
                    <th class="w-16">饰品</th>
                    <th class="hidden 2xl:table-cell!">描述</th>
                </tr>
            </thead>
            <tbody>
                <template v-for="block in blocks" :key="block.name">
                    <tr v-for="(group, index) in block.groups" :key="group.key">
                        <td
                            v-if="index === 0"
                            class="text-light whitespace-nowrap"
                            :rowspan="block.groups.length"
                        >
                            <span class="cursor-pointer hover:underline" @click="openSkill(block.skillId)">
                                {{ block.name }}
                            </span>
                        </td>
                        <td class="whitespace-nowrap">{{ group.label }}</td>
                        <td v-for="part in PART_ORDER" :key="part" class="align-middle text-center">
                            <span
                                v-for="entry in group.cells[part]"
                                :key="entry.id"
                                class="block text-center cursor-pointer hover:underline"
                                :class="entry.cls"
                                @click="open(entry.id)"
                            >
                                {{ entry.label }}
                            </span>
                        </td>
                        <td
                            v-if="index === 0"
                            class="text-left text-sm whitespace-pre-line hidden 2xl:table-cell!"
                            :rowspan="block.groups.length"
                        >
                            {{ block.desc }}
                        </td>
                    </tr>
                </template>
            </tbody>
        </table>
        <NEmpty v-else-if="store.state.equipments !== 'loading'" description="没有妖精专用装备" />

        <EquipmentModal v-model:show="showModal" :identification="selectedId" />
        <SkillModal v-model:show="skillShow" :identification="skillId" />
    </div>
</template>

<script setup lang="ts">
import { NEmpty } from 'naive-ui';
import { computed, ref } from 'vue';
import EquipmentModal from './EquipmentModal.vue';
import SkillModal from './SkillModal.vue';
import { useDataV2Store } from './dataV2Store';
import type { EquipmentListItem } from './types';

defineOptions({ name: '妖精面板V2' });

const store = useDataV2Store();

/** V1 的列顺序：武器 / 头部 / 手部 / 身体 / 盾 / 脚部 / 饰品 */
const PART_ORDER = ['武器', '头部', '手部', '身体', '盾', '脚部', '饰品'] as const;
type PartKey = (typeof PART_ORDER)[number];

/** 装备名去掉「优质」与部位后缀后剩下的主题词（嫩叶 / 青叶 / 风切羽 …） */
const NAME_SUFFIX = [
    '之盾',
    '小圆盾',
    '纱罗盾',
    '长袍',
    '小法杖',
    '法杖',
    '魔杖',
    '衣服',
    '手套',
    '手环',
    '帽子',
    '帽',
    '衣',
    '鞋',
    '盾',
];

const stripName = (name: string) => {
    let value = name.startsWith('优质') ? name.slice(2) : name;
    for (const suffix of NAME_SUFFIX) {
        if (value.endsWith(suffix) && value.length > suffix.length) {
            return value.slice(0, -suffix.length);
        }
    }
    return value;
};

interface FairyEntry {
    id: number;
    label: '普通' | '优质' | '特殊';
    cls: string;
}

interface FairyGroup {
    key: string;
    label: string;
    cells: Record<PartKey, FairyEntry[]>;
}

interface FairyBlock {
    name: string;
    /** 套装技能的 identification，用来点开技能详情 */
    skillId: number | null;
    desc: string;
    groups: FairyGroup[];
}

const emptyCells = () =>
    Object.fromEntries(PART_ORDER.map((part) => [part, [] as FairyEntry[]])) as Record<
        PartKey,
        FairyEntry[]
    >;

const partOf = (item: EquipmentListItem): PartKey | null => {
    const category = item.category as PartKey;
    return PART_ORDER.includes(category) ? category : null;
};

/** 妖精专用装备（fa_can = 2）按套装技能分组；每组内再按阶级分「装备组」 */
const blocks = computed<FairyBlock[]>(() => {
    const bySkill = new Map<string, EquipmentListItem[]>();
    const skillIdOf = new Map<string, number>();
    for (const item of store.equipments) {
        if (item.fa_can !== 2) continue;
        for (const row of item.set_skills) {
            const name = row.skill_name;
            if (!name) continue;
            if (row.skill_id && !skillIdOf.has(name)) skillIdOf.set(name, row.skill_id);
            const bucket = bySkill.get(name);
            if (bucket) {
                if (!bucket.includes(item)) bucket.push(item);
            } else {
                bySkill.set(name, [item]);
            }
        }
    }

    const out: FairyBlock[] = [];
    for (const [name, items] of bySkill) {
        const byRank = new Map<number, EquipmentListItem[]>();
        for (const item of items) {
            const bucket = byRank.get(item.rank);
            if (bucket) bucket.push(item);
            else byRank.set(item.rank, [item]);
        }

        const groups: FairyGroup[] = [];
        for (const [rank, rows] of [...byRank].sort((a, b) => a[0] - b[0])) {
            // 一组＝同一阶级的一套装备，主题词取出现最多的那个
            const counter = new Map<string, number>();
            for (const row of rows) {
                const theme = stripName(row.name ?? '');
                counter.set(theme, (counter.get(theme) ?? 0) + 1);
            }
            const theme = [...counter].sort((a, b) => b[1] - a[1])[0]?.[0] ?? `Lv${rank}`;

            const cells = emptyCells();
            for (const row of rows) {
                const part = partOf(row);
                if (!part) continue;
                const name = row.name ?? '';
                const label = name.startsWith('优质')
                    ? '优质'
                    : stripName(name) === theme
                      ? '普通'
                      : '特殊';
                cells[part].push({
                    id: row.id,
                    label,
                    cls:
                        label === '优质'
                            ? 'text-blue-400'
                            : label === '特殊'
                              ? 'text-purple-400'
                              : 'text-green-400',
                });
            }
            for (const part of PART_ORDER) {
                cells[part].sort((a, b) => a.label.localeCompare(b.label));
            }
            groups.push({ key: `${name}-${rank}`, label: theme, cells });
        }

        const desc = items.find((item) => item.fa_sk_desc)?.fa_sk_desc ?? '';
        out.push({ name, skillId: skillIdOf.get(name) ?? null, desc, groups });
    }
    return out.sort((a, b) => a.name.localeCompare(b.name, 'zh'));
});

const showModal = ref(false);
const selectedId = ref<number | null>(null);

const open = (id: number) => {
    selectedId.value = id;
    showModal.value = true;
};

const skillShow = ref(false);
const skillId = ref<number | null>(null);

/** 点技能名打开技能详情（技能数据里没有这条时不做反应） */
const openSkill = (id: number | null) => {
    if (id == null || !store.skillById.has(id)) return;
    skillId.value = id;
    skillShow.value = true;
};
</script>
