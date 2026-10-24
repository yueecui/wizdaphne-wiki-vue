<template>
    <div class="flex flex-col md:flex-row gap-3">
        <div class="md:w-56 shrink-0 flex flex-wrap md:flex-col gap-1">
            <div v-for="group in groups" :key="group.key" class="w-full">
                <div class="text-xs opacity-50 px-1 mt-2 mb-1">{{ group.label }}</div>
                <div
                    v-for="j in group.jobs"
                    :key="j.id"
                    class="px-2 py-1.5 rounded cursor-pointer text-sm flex items-center justify-between"
                    :class="selected === j.id ? 'bg-white/15' : 'hover:bg-white/8'"
                    @click="selected = j.id"
                >
                    <span>{{ j.name }}</span>
                    <span class="text-xs opacity-50">{{ j.skill_count }}</span>
                </div>
            </div>
        </div>

        <div class="flex-1 min-w-0">
            <NSpin :show="store.state.jobs === 'loading'">
                <div v-if="job" class="flex flex-col gap-3 text-sm">
                    <div class="flex flex-wrap items-center gap-2">
                        <span class="text-lg font-bold">{{ job.name }}</span>
                        <span class="text-xs opacity-50">{{ job.name_jp }} · {{ job.name_en }}</span>
                        <NTag size="tiny" :bordered="false">{{ CATEGORY[job.category] }}</NTag>
                        <span class="text-xs opacity-50">排序 {{ job.display_order }}</span>
                    </div>

                    <div>
                        <div class="text-xs opacity-60 mb-1">战斗倍率（% → 倍率）</div>
                        <div class="grid grid-cols-4 sm:grid-cols-6 gap-1.5">
                            <div v-for="key in MULTIPLIER_KEYS" :key="key" class="rounded border border-white/10 px-2 py-1">
                                <div class="text-[11px] opacity-50">{{ MULTIPLIER_LABEL[key] }}</div>
                                <div>{{ ((job.multipliers[key] ?? 0) / 100).toFixed(2) }}</div>
                            </div>
                        </div>
                    </div>

                    <div class="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        <div>
                            <div class="text-xs opacity-60 mb-1">基础值 / 成长率</div>
                            <table class="w-full text-xs border-collapse">
                                <thead>
                                    <tr class="opacity-60">
                                        <th class="text-left font-normal py-1">项目</th>
                                        <th v-for="k in STAT_KEYS" :key="k" class="text-right font-normal py-1">{{ STAT_LABEL[k] }}</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr class="border-t border-white/10">
                                        <td class="py-1 opacity-70">基础</td>
                                        <td v-for="k in STAT_KEYS" :key="k" class="text-right">{{ job.base[k] ?? '—' }}</td>
                                    </tr>
                                    <tr class="border-t border-white/10">
                                        <td class="py-1 opacity-70">成长</td>
                                        <td v-for="k in STAT_KEYS" :key="k" class="text-right">{{ ((job.growth[k] ?? 0) / 100).toFixed(2) }}</td>
                                    </tr>
                                </tbody>
                            </table>
                            <div class="mt-1 text-xs opacity-50">
                                HP {{ job.base.hp }} / MP {{ job.base.mp }} / SP {{ job.base.sp }}
                            </div>
                        </div>
                        <div class="text-xs opacity-60 leading-relaxed">
                            <div>主职业角色：{{ job.characters.primary.length }}</div>
                            <div>可转职角色组：{{ job.characters.changeable.length }}</div>
                            <div v-if="jobChangeItems.length" class="mt-1">
                                转职道具：
                                <span v-for="(item, i) in jobChangeItems.slice(0, 4)" :key="item.id">
                                    {{ i ? ' / ' : '' }}#{{ item.id }} ×{{ item.quantity }}
                                </span>
                                <span v-if="jobChangeItems.length > 4"> 等 {{ jobChangeItems.length }} 种</span>
                            </div>
                            <div class="mt-1">技能 {{ job.skill_count }} 个（含属性变体 {{ Object.keys(job.skill_variants).length }} 组）</div>
                        </div>
                    </div>

                    <div>
                        <div class="text-xs opacity-60 mb-1">技能表（按解锁等级）</div>
                        <table class="w-full text-xs border-collapse">
                            <thead>
                                <tr class="opacity-60">
                                    <th class="text-left font-normal py-1 w-16">Lv</th>
                                    <th class="text-left font-normal py-1">技能</th>
                                    <th class="text-left font-normal py-1 w-24">属性变体</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr v-for="s in job.skills" :key="s.identification" class="border-t border-white/10">
                                    <td class="py-1">{{ s.get_lv }}</td>
                                    <td class="py-1">
                                        <span class="cursor-pointer hover:underline" @click="openSkill(s.identification)">
                                            {{ s.name }}
                                        </span>
                                        <span class="opacity-40 ml-1">{{ s.name_jp }}</span>
                                    </td>
                                    <td class="py-1 opacity-60">{{ variantCount(s.identification) || '—' }}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
                <NEmpty v-else description="加载中…" />
            </NSpin>
        </div>

        <SkillModal v-model:show="modal" :identification="skillId" />
    </div>
</template>

<script setup lang="ts">
import { NEmpty, NSpin, NTag } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import SkillModal from './SkillModal.vue';
import { useDataV2Store } from './dataV2Store';

defineOptions({ name: '职业面板V2' });

const store = useDataV2Store();
const selected = ref<number | null>(null);

const modal = ref(false);
const skillId = ref<number | null>(null);
const openSkill = (identification: number) => {
    skillId.value = identification;
    modal.value = true;
};

const CATEGORY: Record<string, string> = {
    standard: '常规职业',
    collab: '联动职业',
    character: '角色专用',
    other: '其他',
};

const STAT_KEYS = ['str', 'int', 'pie', 'vit', 'agi', 'dex', 'luk'] as const;
const STAT_LABEL: Record<string, string> = {
    str: '力', int: '智', pie: '信', vit: '体', agi: '敏', dex: '巧', luk: '运',
};

const MULTIPLIER_KEYS = ['atk', 'mag', 'div', 'def', 'mdef', 'acc', 'eva', 'res', 'speed', 'det', 'dtrap', 'etrap'];
const MULTIPLIER_LABEL: Record<string, string> = {
    atk: '攻击', mag: '魔力', div: '神力', def: '防御', mdef: '魔防', acc: '命中',
    eva: '回避', res: '抵抗', speed: '速度', det: '探知', dtrap: '解陷阱', etrap: '避陷阱',
};

const groups = computed(() => {
    const order = ['standard', 'collab', 'character', 'other'];
    return order
        .map((key) => ({
            key,
            label: CATEGORY[key],
            jobs: store.jobs.filter((j) => j.category === key),
        }))
        .filter((g) => g.jobs.length);
});

const job = computed(() => (selected.value == null ? null : store.jobById.get(selected.value) ?? null));

/** 转职道具：同一职业按角色组会有多条，按道具去重（道具名暂缺，先显示 id） */
const jobChangeItems = computed(() => {
    const map = new Map<number, number>();
    for (const item of job.value?.change_items ?? []) {
        if (item.item == null) continue;
        map.set(item.item, item.quantity ?? 1);
    }
    return [...map.entries()].map(([id, quantity]) => ({ id, quantity }));
});

const variantCount = (identification: number) => {
    if (!job.value) return 0;
    return Object.values(job.value.skill_variants).filter((list) =>
        list.some((s) => s.identification === identification),
    ).length;
};

watch(
    () => store.jobs,
    (list) => {
        if (!selected.value && list.length) {
            const first = list.find((j) => j.category === 'standard') ?? list[0];
            selected.value = first.id;
        }
    },
    { immediate: true },
);
</script>
