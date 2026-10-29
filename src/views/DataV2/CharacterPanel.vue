<template>
    <div class="flex flex-col gap-4">
        <!-- 筛选 -->
        <div class="flex flex-row flex-wrap gap-2">
            <div class="flex flex-col w-full md:w-auto md:grow md:basis-[240px]">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">搜索词</label>
                </div>
                <div class="flex items-center h-12">
                    <NInput v-model:value="keyword" clearable placeholder="支持三语角色名 / 风格 / 技能名" />
                </div>
            </div>
            <div class="flex flex-col shrink-0 basis-[160px]">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">稀有度</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <NSelect
                        v-model:value="rarity"
                        :options="rarityOptions"
                        clearable
                        placeholder="全部"
                        class="w-full!"
                    />
                </div>
            </div>
            <div class="flex flex-col shrink-0 basis-[96px]">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">组别</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <NSelect
                        v-model:value="poolGroup"
                        :options="poolGroupOptions"
                        clearable
                        placeholder="全部"
                        class="w-full!"
                    />
                </div>
            </div>
            <div class="flex flex-col shrink-0 basis-[96px]">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">SP</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <NSelect v-model:value="spFilter" :options="spFilterOptions" class="w-full!" />
                </div>
            </div>
            <div class="flex flex-col shrink-0 basis-[160px]">
                <div class="flex justify-between items-center h-6 gap-2">
                    <label class="text-sm">职业</label>
                    <NCheckbox v-model:checked="onlyPrimary" size="small">仅初始职业</NCheckbox>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <NSelect
                        v-if="onlyPrimary"
                        :options="jobOptions"
                        :value="jobFilter[0] ?? null"
                        clearable
                        placeholder="全部"
                        class="w-full!"
                        @update:value="(v: number | null) => (jobFilter = v == null ? [] : [v])"
                    />
                    <NSelect
                        v-else
                        :options="jobOptions"
                        v-model:value="jobFilter"
                        multiple
                        clearable
                        :max-tag-count="1"
                        placeholder="最多两个职业"
                        class="w-full!"
                    />
                </div>
            </div>
            <div class="flex flex-col shrink-0 basis-[112px]">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">种族</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <NSelect v-model:value="race" :options="raceOptions" clearable placeholder="全部" class="w-full!" />
                </div>
            </div>
            <div class="flex flex-col shrink-0 basis-[80px]">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">性别</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <NSelect
                        v-model:value="gender"
                        :options="genderOptions"
                        clearable
                        placeholder="全部"
                        class="w-full!"
                    />
                </div>
            </div>
            <div class="flex flex-col shrink-0 basis-[96px]">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">性格</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <NSelect
                        v-model:value="alignment"
                        :options="alignmentOptions"
                        clearable
                        placeholder="全部"
                        class="w-full!"
                    />
                </div>
            </div>
            <div class="flex flex-col shrink-0 basis-[112px]">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">缘</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <NSelect
                        v-model:value="fateType"
                        :options="fateTypeOptions"
                        clearable
                        placeholder="才能类型"
                        class="w-full!"
                    />
                </div>
            </div>
            <!-- 克己不参与伸展：多选控件拉全宽会太宽，保持 176px -->
            <div class="flex flex-col shrink-0 basis-[176px]">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">克己</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <NSelect
                        v-model:value="disciplineTags"
                        :options="disciplineOptions"
                        multiple
                        clearable
                        filterable
                        :max-tag-count="1"
                        :menu-props="{ style: 'max-height: 15rem' }"
                        placeholder="额外提升"
                        class="w-full!"
                    />
                </div>
            </div>
            <div class="flex flex-col">
                <div class="flex justify-between items-center h-6">
                    <label class="text-sm">属性</label>
                </div>
                <div class="flex flex-row gap-2 items-center h-12">
                    <div
                        v-for="a in attributeOptions"
                        :key="a.id"
                        class="w-8 h-8 relative group cursor-pointer"
                        @click="toggleAttribute(a.id)"
                    >
                        <ElementIcon
                            :element="elementOf(a.name)"
                            class="w-8 h-8 transition-opacity"
                            :class="attribute !== null && attribute !== a.id ? 'opacity-30' : ''"
                        />
                        <div
                            class="hidden group-hover:!block absolute z-30 -bottom-8 left-1/2 -translate-x-1/2 w-max px-2 bg-black/70 rounded text-center drop-shadow-inline"
                        >
                            {{ a.name }}
                        </div>
                    </div>
                </div>
            </div>
            <div class="flex flex-col justify-end">
                <div class="flex items-center h-12">
                    <NButton size="small" type="error" @click="resetFilter">重置</NButton>
                </div>
            </div>
        </div>

        <div class="text-sm">共有 {{ filtered.length }} 个符合条件的角色</div>

        <!-- 角色卡片 -->
        <div v-if="filtered.length" class="flex flex-wrap -mx-2">
                <div
                    v-for="c in filtered"
                    :key="c.id"
                    class="relative p-2 cursor-pointer select-none group w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 3xl:w-1/6"
                    @click="open(c.id)"
                >
                    <CharacterCard :character="c" />
                </div>
            </div>
            <NEmpty v-else description="没有符合条件的角色" class="py-10" />

        <NModal v-model:show="drawer">
            <div
                class="w-[90%] md:w-[min(960px,94vw)] m-auto huiji-css-hook bg-transparent! max-h-[88vh] overflow-y-auto thin-scrollbar md:max-h-none md:overflow-visible"
            >
                <CharacterDetail
                    v-if="currentId"
                    :id="currentId"
                    :onClose="closeDetail"
                    @select="selectVersion"
                />
            </div>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NEmpty, NInput, NModal, NSelect } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import ElementIcon from '../../components/ElementIcon.vue';
import { ELEMENT_TYPE } from '../DataSearcher/data/enum';
import CharacterCard from './CharacterCard.vue';
import CharacterDetail from './CharacterDetail.vue';
import { useDataV2Store } from './dataV2Store';
import { usePersistentRef } from './dataV2Settings';
import type { CharacterDetail as CharacterDetailData, CharacterListItem } from './types';

const store = useDataV2Store();

// 过滤器全部持久化（对齐 V1 的 characterFilter）
const keyword = usePersistentRef('character.keyword', '');
const rarity = usePersistentRef<number | null>('character.rarity', null);
const poolGroup = usePersistentRef<number | null>('character.group', null);
const spFilter = usePersistentRef<'all' | 'show' | 'hide'>('character.spFilter', 'all');
const onlyPrimary = usePersistentRef('character.onlyPrimary', true);
const jobFilter = usePersistentRef<number[]>('character.jobFilter', []);
const race = usePersistentRef<number | null>('character.race', null);
const gender = usePersistentRef<number | null>('character.gender', null);
const alignment = usePersistentRef<number | null>('character.alignment', null);
const attribute = usePersistentRef<number | null>('character.attribute', null);
/** 缘的才能类型，如「智慧」 */
const fateType = usePersistentRef<string | null>('character.fateType', null);
/** 克己额外提升的属性标签，如「回避」 */
const disciplineTags = usePersistentRef<string[]>('character.disciplineTags', []);

const drawer = ref(false);
const currentId = ref<number | null>(null);

const open = (id: number) => {
    currentId.value = id;
    drawer.value = true;
};

const closeDetail = () => {
    drawer.value = false;
};

/** modal 里切换风格 / 觉醒版本：把父级的 id 一起换掉，便于关闭后再打开仍是同一版本 */
const selectVersion = (id: number) => {
    currentId.value = id;
};

const elementOf = (name?: string | null) => (name ?? '') as ELEMENT_TYPE;

const optionsOf = (values: Array<{ id: number; name: string }>) => values.map((v) => ({ label: v.name, value: v.id }));

const uniq = (list: CharacterListItem[], pick: (c: CharacterListItem) => { id: number; name?: string | null }) => {
    const map = new Map<number, string>();
    for (const c of list) {
        const v = pick(c);
        if (v?.id != null && v.name) map.set(v.id, v.name);
    }
    return [...map.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.id - b.id);
};

const rarityOptions = computed(() =>
    optionsOf(uniq(store.characters, (c) => c.rarity)).sort((a, b) => b.value - a.value),
);
const raceOptions = computed(() => optionsOf(uniq(store.characters, (c) => c.race)));
const genderOptions = computed(() => optionsOf(uniq(store.characters, (c) => c.gender)));
const alignmentOptions = computed(() => optionsOf(uniq(store.characters, (c) => c.alignment)));
const attributeOptions = computed(() => uniq(store.characters, (c) => c.attribute).sort((a, b) => a.id - b.id));

/** 缘的才能类型，顺序沿用 V1 的 FATE_TYPE */
const FATE_TYPES = ['力量', '智慧', '信仰心', '生命力', '灵巧', '敏捷'];

/** 克己标签，顺序沿用 V1 的 DISCIPLINE_TAGS_LIST */
const DISCIPLINE_TAGS = [
    'HP',
    'MP',
    'SP',
    '攻击力',
    '魔力',
    '神力',
    '信仰心',
    '防御力',
    '法术防御力',
    '抵抗',
    '会心',
    '探知',
    '陷阱解除',
    '陷阱回避',
    '行动速度',
    '命中',
    '回避',
    '毒耐性',
    '麻痹耐性',
    '气绝耐性',
    '睡眠耐性',
    '封印耐性',
    '混乱耐性',
    '魅惑耐性',
    '石化耐性',
    '即死耐性',
    '恐惧耐性',
    '暴击耐性',
    '诅咒耐性',
];

/** 固定顺序打底，数据里新出现的项追加到末尾 */
const orderedOptions = (order: string[], values: Iterable<string>) => {
    const extra = [...new Set(values)].filter((v) => !order.includes(v));
    return [...order, ...extra].map((value) => ({ label: value, value }));
};

const fateTypeOptions = computed(() => {
    const types: string[] = [];
    for (const c of store.characters) if (c.fate?.type) types.push(c.fate.type);
    return orderedOptions(FATE_TYPES, types);
});

const disciplineOptions = computed(() => {
    const tags: string[] = [];
    for (const c of store.characters) for (const t of c.self_restraint?.extra_tags ?? []) tags.push(t);
    return orderedOptions(DISCIPLINE_TAGS, tags);
});
const jobOptions = computed(() => {
    const map = new Map<number, string>();
    for (const c of store.characters) for (const j of c.jobs) map.set(j.id, j.name ?? '');
    return [...map.entries()].sort((a, b) => a[0] - b[0]).map(([value, label]) => ({ value, label }));
});

const poolGroupOptions = [
    { label: '限定', value: -1 },
    { label: 'Ⅱ组', value: 2 },
    { label: 'Ⅰ组', value: 1 },
    { label: '联动', value: -2 },
    { label: '共用', value: 0 },
];

const spFilterOptions = [
    { label: '全部', value: 'all' },
    { label: 'SP', value: 'show' },
    { label: '非SP', value: 'hide' },
];

// 仅初始职业时最多保留一个已选职业
watch(onlyPrimary, (value) => {
    if (value && jobFilter.value.length > 1) jobFilter.value = jobFilter.value.slice(0, 1);
});

const toggleAttribute = (id: number) => {
    attribute.value = attribute.value === id ? null : id;
};

/** 搜索文本：三语名 + 风格 + 技能名（V1 支持按继承技能名搜索） */
const haystack = (c: CharacterListItem) => {
    const detail = c as CharacterDetailData;
    const skills = detail.skills
        ? [
              ...detail.skills.unique,
              ...detail.skills.inherit,
              ...detail.skills.potential_inherit,
              ...detail.skills.discipline,
          ].map((s) => s.name ?? '')
        : [];
    return [c.name, c.name_jp, c.name_en, c.style, `${c.style}${c.name}`, ...skills]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
};

const filtered = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    return store.characters
        .filter((c) => {
            if (spFilter.value === 'show' && c.is_default_style) return false;
            if (spFilter.value === 'hide' && !c.is_default_style) return false;
            if (rarity.value != null && c.rarity.id !== rarity.value) return false;
            if (poolGroup.value != null && c.pool_group !== poolGroup.value) return false;
            if (race.value != null && c.race.id !== race.value) return false;
            if (gender.value != null && c.gender.id !== gender.value) return false;
            if (alignment.value != null && c.alignment.id !== alignment.value) return false;
            if (attribute.value != null && c.attribute.id !== attribute.value) return false;
            if (fateType.value != null && (c.fate?.type ?? null) !== fateType.value) return false;
            if (disciplineTags.value.length) {
                const own = c.self_restraint?.extra_tags ?? [];
                // 与 V1 一致：选中的加成必须全部命中
                if (!disciplineTags.value.every((tag) => own.includes(tag))) return false;
            }
            if (jobFilter.value.length) {
                const pool = onlyPrimary.value
                    ? c.jobs.filter((j) => j.primary).map((j) => j.id)
                    : c.jobs.map((j) => j.id);
                if (!jobFilter.value.every((id) => pool.includes(id))) return false;
            }
            if (!kw) return true;
            return haystack(c).includes(kw);
        })
        .sort((a, b) => {
            const ta = a.release_date?.milliseconds ?? 0;
            const tb = b.release_date?.milliseconds ?? 0;
            if (ta !== tb) return tb - ta;
            if (a.rarity.id !== b.rarity.id) return b.rarity.id - a.rarity.id;
            return String(a.name ?? '').localeCompare(String(b.name ?? ''));
        });
});

const resetFilter = () => {
    keyword.value = '';
    rarity.value = null;
    poolGroup.value = null;
    spFilter.value = 'all';
    onlyPrimary.value = true;
    jobFilter.value = [];
    race.value = null;
    gender.value = null;
    alignment.value = null;
    attribute.value = null;
    fateType.value = null;
    disciplineTags.value = [];
};
</script>
