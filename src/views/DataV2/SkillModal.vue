<template>
    <ThemeConfigProvider>
        <NModal :show="show" @update:show="onShowUpdate" @esc="close" @mask-click="close">
            <div class="w-[95vw] md:w-[880px] max-h-[88vh] m-auto flex flex-col huiji-css-hook bg-transparent!">
                <div class="flex flex-col min-h-0 bg-[#312721]! border! border-[#463d38]! rounded">
                    <div class="shrink-0 bg-[#312721] px-4 pt-3 pb-2 border-b! border-[#463d38]!">
                        <div class="flex items-start gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="text-sm text-light">
                                    技能 No. {{ currentId ?? '—' }}
                                </div>
                                <div class="text-2xl md:text-3xl text-light font-bold break-words">
                                    {{ title }}
                                </div>
                                <div v-if="subtitle" class="text-sm text-gray-400 break-words">
                                    {{ subtitle }}
                                </div>
                            </div>
                            <div class="flex items-center gap-3 shrink-0">
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

                    <!-- 同名技能：角色专用 / 给其他角色继承用的版本可以互相切换 -->
                    <div
                        v-if="sameOptions.length > 1"
                        class="shrink-0 bg-[#312721] px-4 py-2 border-b! border-[#463d38]! flex items-center gap-2"
                    >
                        <span class="text-xs opacity-60 shrink-0">同名技能</span>
                        <NSelect
                            v-model:value="currentId"
                            :options="sameOptions"
                            size="small"
                            filterable
                            class="w-full max-w-[420px]!"
                        />
                    </div>

                    <div class="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-4">
                        <SkillDetail
                            v-if="currentId != null"
                            :identification="currentId"
                            @open-skill="currentId = $event"
                        />
                        <NEmpty v-else description="未选择技能" />

                        <pre
                            v-if="showRaw"
                            class="shrink-0 mt-4 text-xs p-2 rounded bg-black/20 whitespace-pre-wrap break-all"
                        >{{ raw }}</pre>
                    </div>
                </div>
            </div>
        </NModal>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton, NEmpty, NModal, NSelect } from 'naive-ui';
import { computed, ref, watch } from 'vue';
import { MwConfig } from '../../huiji/MwConfig';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import { useWikiDataStore } from '../../stores/wikiData';
import SkillDetail from './SkillDetail.vue';
import { useDataV2Store } from './dataV2Store';
import type { JobDetail, SkillListItem } from './types';

defineOptions({ name: '技能详情ModalV2' });

const props = defineProps<{ show: boolean; identification: number | null }>();
const emit = defineEmits<{ 'update:show': [value: boolean] }>();

const store = useDataV2Store();
const wiki = useWikiDataStore();
const canEdit = MwConfig.getInstance().canEdit;

const currentId = ref<number | null>(props.identification ?? null);

const showRaw = ref(false);

/** 原始文档（IndexedDB 里存的那份，长键） */
const raw = computed(() => {
    const id = currentId.value;
    if (id == null) return '';
    const doc = wiki.skills.find((row) => row.id === id);
    return doc ? JSON.stringify(doc, null, 1) : '';
});

watch(
    () => props.identification,
    (value) => {
        currentId.value = value ?? null;
    },
);
watch(
    () => props.show,
    (value) => {
        if (value) currentId.value = props.identification ?? null;
    },
);

const row = computed(() =>
    currentId.value == null ? null : (store.skillById.get(currentId.value) ?? null),
);

const title = computed(() => row.value?.name ?? '技能详情');

const subtitle = computed(() => [row.value?.name_jp, row.value?.name_en].filter(Boolean).join(' · '));

/** identification -> 拥有该角色专用技能的角色名（同一角色不同 style 名字相同） */
const uniqueOwners = computed(() => {
    const map = new Map<number, string>();
    for (const character of store.characterById.values()) {
        for (const skill of character.skills.unique) {
            if (!map.has(skill.identification) && character.name) {
                map.set(skill.identification, character.name);
            }
        }
    }
    return map;
});

/** identification -> 可以学会该技能的职业（普通职业优先于联动职业） */
const JOB_PRIORITY: Record<string, number> = { standard: 0, other: 1, character: 2, collab: 3 };

const jobOwners = computed(() => {
    const map = new Map<number, JobDetail[]>();
    for (const job of store.jobs) {
        for (const skill of job.skills) {
            const list = map.get(skill.identification);
            if (list) list.push(job);
            else map.set(skill.identification, [job]);
        }
    }
    return map;
});

const jobLabel = (identification: number) => {
    const jobs = jobOwners.value.get(identification) ?? [];
    const sorted = jobs
        .slice()
        .sort((a, b) => (JOB_PRIORITY[a.category] ?? 9) - (JOB_PRIORITY[b.category] ?? 9));
    return sorted[0]?.name ?? '';
};

const sourceLabel = (s: SkillListItem) => {
    if (s.sources.includes('inherit')) return '继承版本';
    if (s.sources.includes('equipment')) return '装备';
    if (s.sources.includes('relic')) return '遗物';
    if (s.sources.includes('discipline')) return '克己';
    if (s.sources.includes('potential')) return '潜在';
    if (s.sources.includes('fate')) return '才能';
    if (s.sources.includes('bond')) return '羁绊';
    if (s.sources.includes('equip_set')) return '套装技能';
    return '';
};

/** 同名技能：全部列出，方便在各版本之间切换 */
const sameSkills = computed<SkillListItem[]>(() => {
    const name = row.value?.name;
    if (!name) return [];
    return store.skills.filter((s) => s.name === name).sort((a, b) => a.identification - b.identification);
});

/** 角色专用的写角色名，职业可学的写职业名，其余写来源 */
const sameOptions = computed(() =>
    sameSkills.value.map((s) => {
        const tail =
            uniqueOwners.value.get(s.identification) || jobLabel(s.identification) || sourceLabel(s);
        return {
            label: tail ? `No.${s.identification} · ${tail}` : `No.${s.identification}`,
            value: s.identification,
        };
    }),
);

const onShowUpdate = (value: boolean) => emit('update:show', value);
const close = () => emit('update:show', false);
</script>
