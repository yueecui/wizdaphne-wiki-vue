<template>
    <div class="flex flex-col gap-4 px-2 -mx-2">
        <div class="flex flex-col gap-2">
            <div class="flex flex-wrap flex-row gap-2 items-center">
                <NButton
                    size="small"
                    :type="filter.category === '' ? 'primary' : 'default'"
                    @click="filter.category = ''"
                >
                    全部
                </NButton>
                <NButton
                    v-for="name in typeOrder"
                    :key="name"
                    size="small"
                    :type="filter.category === name ? 'primary' : 'default'"
                    @click="filter.category = name"
                >
                    {{ name }}
                </NButton>
            </div>

            <div class="flex flex-row flex-wrap gap-2 md:gap-6">
                <div class="flex flex-col w-60">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">搜索词</label>
                    </div>
                    <div class="flex items-center h-12">
                        <NInput v-model:value="filter.searchText" placeholder="支持中日名字、ID" />
                    </div>
                </div>
                <div class="flex flex-col">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">特性</label>
                    </div>
                    <div class="flex flex-row gap-2 items-center h-12">
                        <NSelect
                            v-model:value="filter.skill"
                            clearable
                            filterable
                            :options="skillOptions"
                            class="w-40!"
                        />
                    </div>
                </div>
                <div class="flex flex-col">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">特典</label>
                    </div>
                    <div class="flex flex-row gap-2 items-center h-12">
                        <NSelect
                            v-model:value="filter.soucateFilter"
                            :options="[
                                { label: '全部显示', value: 'all' },
                                { label: '只显示特典', value: 'show' },
                                { label: '不显示特典', value: 'hide' },
                            ]"
                            class="w-40!"
                        />
                    </div>
                </div>
                <div v-if="!isWeaponGroup" class="flex flex-col">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">妖精</label>
                    </div>
                    <div class="flex flex-row gap-2 items-center h-12">
                        <NSelect
                            v-model:value="filter.fairyFilter"
                            :options="[
                                { label: '全部', value: '' },
                                { label: '不适用', value: '0' },
                                { label: '可用', value: '1' },
                                { label: '专用', value: '2' },
                            ]"
                            class="w-40!"
                        />
                    </div>
                </div>
                <div v-if="!isWeaponGroup" class="flex flex-col">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">妖精技能</label>
                    </div>
                    <div class="flex flex-row gap-2 items-center h-12">
                        <NSelect
                            v-model:value="filter.fairySkill"
                            :options="fairySkillOptions"
                            clearable
                            filterable
                            placeholder="全部"
                            class="w-40!"
                        />
                    </div>
                </div>
                <div class="flex flex-col">
                    <div class="flex justify-between items-center h-6">
                        <label class="text-sm">&nbsp;</label>
                    </div>
                    <div class="flex flex-row gap-3 items-center h-12">
                        <NCheckbox v-model:checked="filter.showMaxLv">显示满强化</NCheckbox>
                        <NCheckbox v-model:checked="filter.showMaxOverRank">
                            显示满材质补强
                        </NCheckbox>
                    </div>
                </div>
            </div>

            <div>
                <NButton size="small" type="error" @click="resetFilter">重置</NButton>
            </div>
        </div>

        <div>共有 {{ filteredList.length }} 个符合条件的装备</div>

        <template v-if="filteredList.length > 0">
            <NPagination v-model:page="pageIndex" :page-count="pageCount" />

            <table class="wikitable text-sm text-center">
                <thead>
                    <tr>
                        <th class="md:w-[13em]">装备</th>
                        <th class="md:w-[6em]">类型</th>
                        <th class="md:w-[2em]">阶级</th>
                        <th v-for="key in statColumns" :key="key" :class="thClass(key)">
                            {{ STAT_LABEL[key] }}
                        </th>
                        <th class="hidden md:table-cell! md:w-[2em]">探知</th>
                        <th class="hidden md:table-cell! md:w-[2em]">陷解</th>
                        <th class="hidden md:table-cell! md:w-[2em]">陷回</th>
                        <th class="hidden md:table-cell!">特性</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in currentPageList"
                        :key="item.id"
                        class="hover:bg-black/30 cursor-pointer"
                        @click="openDetail(item)"
                        @contextmenu.prevent="showMenu($event, item)"
                    >
                        <td :class="isWeaponGroup ? '' : 'text-left'">
                            <div class="flex items-center gap-1.5">
                                <WikiImg
                                    v-if="item.list_icon"
                                    :imageName="`${item.list_icon}.png`"
                                    :isLazy="true"
                                    class="w-6 h-6 object-contain shrink-0"
                                />
                                <span
                                    :class="{ 'text-blue-300': item.soucate === 9 }"
                                    class="truncate"
                                >
                                    {{ item.name }}
                                </span>
                            </div>
                        </td>
                        <td>{{ item.type }}</td>
                        <td>{{ item.rank }}</td>
                        <td
                            v-for="key in statColumns"
                            :key="key"
                            :class="[tdClass(key), statColor(item, key)]"
                        >
                            {{ statText(item, key) }}
                        </td>
                        <td v-for="key in SCOUT_KEYS" :key="key" :class="scoutClass(item, key)">
                            {{ statValue(item, key) }}
                        </td>
                        <td class="hidden md:table-cell! text-left">{{ traitText(item) }}</td>
                    </tr>
                </tbody>
            </table>

            <NPagination v-model:page="pageIndex" :page-count="pageCount" />
        </template>

        <div class="text-sm text-gray-400">
            <div v-if="filter.showMaxOverRank">
                ※ 淡蓝色表示该属性已叠加满材质补强；没有补强数据的装备不变。
            </div>
            <div>
                <template v-if="filter.showMaxLv">
                    ※ 表中绿色表示升级时有数值提升的属性。
                </template>
                <template v-else>
                    ※ 表中红色表示比同类型装备的基准值低，绿色表示比同类型装备的基准值高。部分装备主要属性不参与该比较。
                </template>
            </div>
        </div>

        <CopyTemplateMenu
            :show="menu.show"
            :x="menu.x"
            :y="menu.y"
            template="装备"
            @copy="copyTemplate"
        />

        <EquipmentModal v-model:show="showModal" :identification="selectedId" />
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NInput, NPagination, NSelect } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import WikiImg from '../../components/huiji/WikiImg.vue';
import { useDataV2Store } from './dataV2Store';
import { usePersistentFilter } from './dataV2Settings';
import CopyTemplateMenu from './CopyTemplateMenu.vue';
import EquipmentModal from './EquipmentModal.vue';
import { templateBody, useCopyMenu } from './useCopyMenu';
import type { EquipmentListItem, EquipmentRef, EquipmentStatKey } from './types';

defineOptions({ name: '装备面板V2' });

const store = useDataV2Store();

/** 特性 -> 名字：数据里只有技能 identification，名字从技能数据里查 */
const refName = (ref: EquipmentRef) => store.skillById.get(ref.id)?.name || ref.name || '';

/** 列表小图前缀：wiki 上的 ``img_wiki/list_icon/<资源名>.png`` */
const groups = [
    { key: 'weapon', label: '武器' },
    { key: 'armor', label: '防具' },
] as const;

type GroupKey = (typeof groups)[number]['key'];

// 武器 / 防具由一级导航决定，组件内不再提供二级切换
const props = withDefaults(defineProps<{ group?: GroupKey }>(), { group: 'weapon' });
const group = computed<GroupKey>(() => props.group);
const isWeaponGroup = computed(() => group.value === 'weapon');

// 一级导航切换时重置类型与页码
watch(
    () => props.group,
    () => {
        filter.category = '';
        pageIndex.value = 1;
    },
);

const STAT_LABEL: Record<EquipmentStatKey, string> = {
    atk: '攻击',
    c: '次数',
    mag: '魔力',
    div: '神力',
    def: '防御',
    mdef: '魔防',
    spe: '速度',
    acc: '命中',
    sur: '会心',
    eva: '回避',
    res: '抵抗',
    det: '探知',
    dtrap: '陷解',
    etrap: '陷回',
};

// 过滤器持久化（对齐 V1 的 weaponFilter / armorFilter，这里武器防具共用一份）
const filter = usePersistentFilter('equipment.filter', {
    category: '',
    searchText: '',
    skill: null as string | null,
    soucateFilter: 'all' as 'all' | 'show' | 'hide',
    fairyFilter: '' as '' | '0' | '1' | '2',
    /** 妖精技能（= 套装技能名）；空 = 不过滤 */
    fairySkill: null as string | null,
    showMaxLv: false,
    showMaxOverRank: false,
});

/** V1 的「武器」包含工具；其余部位（盾 / 头 / 身 / 手 / 脚 / 饰品）都算防具 */
const isWeapon = (item: EquipmentListItem) => item.category === '武器' || item.category === '工具';

/** 类型按钮：按 baseStat 的 i 排序（< 100 武器，>= 100 防具），R 变体不进按钮 */
const typeOrder = computed(() =>
    Object.entries(store.equipmentBaseStat)
        .filter(([name, entry]) => !name.includes('R') && (isWeaponGroup.value ? entry.i < 100 : entry.i >= 100))
        .sort((a, b) => a[1].i - b[1].i)
        .map(([name]) => name),
);

// 分类按钮只在本分组内有效：本地存的分类不属于当前分组时清掉，避免进来就是空列表
watch(
    typeOrder,
    (list) => {
        if (list.length && filter.category && !list.includes(filter.category)) filter.category = '';
    },
    { immediate: true },
);

const skillOptions = computed(() => {
    const names = new Set<string>();
    for (const item of store.equipments) {
        if (isWeaponGroup.value !== isWeapon(item)) continue;
        for (const ref of [...item.skills, ...item.traits]) {
            const name = refName(ref);
            if (name) names.add(name);
        }
    }
    return [
        { label: '全部', value: '' },
        ...[...names].sort((a, b) => a.localeCompare(b, 'zh')).map((name) => ({ label: name, value: name })),
    ];
});

/** 妖精技能下拉：防具里出现过的套装技能名（只在妖精专用装备上有） */
const fairySkillOptions = computed(() => {
    const names = new Set<string>();
    for (const item of store.equipments) {
        if (isWeapon(item)) continue;
        for (const row of item.set_skills) if (row.skill_name) names.add(row.skill_name);
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'zh')).map((name) => ({ label: name, value: name }));
});

const isMatch = (item: EquipmentListItem) => {
    if (filter.searchText) {
        const keyword = filter.searchText.trim();
        let found = (item.name ?? '').includes(keyword) || (item.name_jp ?? '').includes(keyword);
        // 纯数字：精确匹配数据 ID 或图鉴编号（不做模糊包含）
        if (!found && /^\d+$/.test(keyword)) {
            found = String(item.id) === keyword || String(item.collection_id ?? '') === keyword;
        }
        if (!found) return false;
    }
    if (filter.category && item.type !== filter.category) return false;
    if (filter.skill) {
        const names = [...item.skills, ...item.traits].map(refName);
        if (!names.some((name) => name && name.includes(filter.skill!))) return false;
    }
    if (filter.soucateFilter === 'show' && item.soucate !== 9) return false;
    if (filter.soucateFilter === 'hide' && item.soucate === 9) return false;
    // 妖精相关的两个过滤器只在防具页生效（武器页没有这两个控件，但会自动持久化）
    if (!isWeaponGroup.value) {
        if (filter.fairyFilter) {
            const can = item.fa_can ?? 0;
            if (filter.fairyFilter === '0' && can !== 0) return false;
            if (filter.fairyFilter === '1' && can !== 1 && can !== 2) return false;
            if (filter.fairyFilter === '2' && can !== 2) return false;
        }
        if (filter.fairySkill) {
            if (!item.set_skills.some((row) => row.skill_name === filter.fairySkill)) return false;
        }
    }
    return true;
};

const filteredList = computed(() => {
    const rows = store.equipments.filter(
        (item) => isWeaponGroup.value === isWeapon(item) && isMatch(item),
    );
    return rows.sort((a, b) => {
        // 1. 阶级越高越靠前
        if (a.rank !== b.rank) return b.rank - a.rank;
        // 2. 特典（soucate）越大越靠前
        if (a.soucate !== b.soucate) return b.soucate - a.soucate;
        // 3. id 倒序
        return b.id - a.id;
    });
});

const pageSize = 20;
const pageIndex = ref(1);
const pageCount = computed(() => Math.ceil(filteredList.value.length / pageSize));
const currentPageList = computed(() =>
    filteredList.value.slice((pageIndex.value - 1) * pageSize, pageIndex.value * pageSize),
);

watch(
    () => filter,
    () => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const resetFilter = () => {
    filter.category = '';
    filter.searchText = '';
    filter.skill = null;
    // V1 重置时保留特典过滤
    filter.fairyFilter = '';
    filter.fairySkill = null;
    filter.showMaxLv = false;
    filter.showMaxOverRank = false;
    pageIndex.value = 1;
};

/** 武器列表有「次数」列；防具没有 */
const statColumns = computed<EquipmentStatKey[]>(() =>
    isWeaponGroup.value
        ? ['atk', 'c', 'mag', 'div', 'def', 'mdef', 'spe', 'acc', 'sur', 'eva', 'res']
        : ['atk', 'mag', 'div', 'def', 'mdef', 'spe', 'acc', 'sur', 'eva', 'res'],
);

/** 与 V1 一致：武器只常显「攻击」，防具只常显「防御 / 魔防」 */
const visibleOnMobile = (key: EquipmentStatKey) =>
    isWeaponGroup.value ? key === 'atk' : key === 'def' || key === 'mdef';

const thClass = (key: EquipmentStatKey) =>
    `${visibleOnMobile(key) ? '' : 'hidden md:table-cell! '}md:w-[2em]`;

const tdClass = (key: EquipmentStatKey) => (visibleOnMobile(key) ? '' : 'hidden md:table-cell!');

const baseStatOf = (item: EquipmentListItem) =>
    store.equipmentBaseStat[`${item.type}R${item.rank}`] ?? store.equipmentBaseStat[item.type ?? ''] ?? {};

/** 材质补强会改动的五项属性（与 ``EquipmentOverRank`` 一致） */
const OVER_RANK_KEYS = ['atk', 'mag', 'div', 'def', 'mdef'] as const;

/** 勾选「显示满材质补强」时叠加最后一级的累计加成；没有补强数据则为 0 */
const overRankBonus = (item: EquipmentListItem, key: EquipmentStatKey) => {
    if (!filter.showMaxOverRank) return 0;
    const last = item.over_rank[item.over_rank.length - 1];
    if (!last) return 0;
    return (OVER_RANK_KEYS as readonly string[]).includes(key)
        ? last[key as (typeof OVER_RANK_KEYS)[number]] ?? 0
        : 0;
};

/** 0 级数值与「同类型同阶级基准」比较（V1 的 getLvZeroStatColorClass） */
const zeroStatColor = (item: EquipmentListItem, key: EquipmentStatKey) => {
    if (item.type === '工具') return '';
    const value = (item.stats[key] ?? 0) + overRankBonus(item, key);
    const base = baseStatOf(item)[key] ?? 0;
    if (base === -1) return '';
    if (isWeapon(item)) {
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

/** 满强化与 0 级的差（V1 的 getLvStatColorClass） */
const lvStatColor = (item: EquipmentListItem, key: EquipmentStatKey) => {
    const value = (item.max_stats[key] ?? 0) + overRankBonus(item, key);
    const zero = (item.stats[key] ?? 0) + overRankBonus(item, key);
    const diff = value - zero;
    if (key === 'c' && diff === 1) return '';
    if (diff > 0) return 'text-green-400';
    if (diff < 0) return 'text-red-400';
    return zero === 0 ? 'text-gray-700' : '';
};

const statColor = (item: EquipmentListItem, key: EquipmentStatKey) => {
    // 满材质补强的属性优先显示淡蓝色，盖过满强化的红绿
    if (filter.showMaxOverRank && overRankBonus(item, key) > 0) return 'text-blue-300';
    return filter.showMaxLv ? lvStatColor(item, key) : zeroStatColor(item, key);
};

const statValue = (item: EquipmentListItem, key: EquipmentStatKey) =>
    ((filter.showMaxLv ? item.max_stats : item.stats)[key] ?? 0) + overRankBonus(item, key);

const statText = (item: EquipmentListItem, key: EquipmentStatKey) => {
    if (key === 'c') return isWeapon(item) ? `×${statValue(item, key)}` : '-';
    return String(statValue(item, key));
};

/** 探索三项（探知 / 陷解 / 陷回）单独成列，宽度与其它属性列一致 */
const SCOUT_KEYS = ['det', 'dtrap', 'etrap'] as const;

/** 探索三项有值即绿字（基准值恒为 0，不参与红字比较）；没有数值时显示暗色的 0 */
const scoutClass = (item: EquipmentListItem, key: EquipmentStatKey) =>
    `hidden md:table-cell!${statValue(item, key) > 0 ? ' text-green-400' : ' text-gray-700'}`;

/** 列表「特性」列不显示的固有特性：同类装备都一样，没有区分度 */
const HIDDEN_TRAITS = new Set(['力量适应+']);

/** 技能是否有多级（单级技能不标 Lv） */
const isMultiLevel = (id: number) => {
    const skill = store.skillById.get(id);
    if (!skill) return false;
    const count = new Set((skill.levels ?? []).map((lv) => lv.level).filter((n) => n > 0)).size;
    return count > 1 || (skill.max_level ?? 0) > 1;
};

/** 列表里的特性文本：名字（多级技能补 LvN） */
const refLabel = (ref: EquipmentRef) => {
    const name = refName(ref);
    const level = ref.level ?? 0;
    return level > 0 && isMultiLevel(ref.id) ? `${name} Lv${level}` : name;
};

const traitText = (item: EquipmentListItem) =>
    [...item.traits, ...item.skills]
        .filter((ref) => !HIDDEN_TRAITS.has(refName(ref)))
        .map(refLabel)
        .filter(Boolean)
        .join(' / ');

// 详情弹窗
const selectedId = ref<number | null>(null);
const showModal = ref(false);

const openDetail = (item: EquipmentListItem) => {
    selectedId.value = item.id;
    showModal.value = true;
};

// 右击行 → 复制 {{装备|名字|ID}}
const { menu, showMenu, copyTemplate } = useCopyMenu<EquipmentListItem>('装备', (row) =>
    templateBody(row.name, row.id),
);
</script>
