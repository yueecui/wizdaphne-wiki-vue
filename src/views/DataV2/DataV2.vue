<template>
    <ThemeConfigProvider>
        <div class="mt-6 flex flex-col gap-4">
            <div class="flex flex-wrap items-end gap-3">
                <div class="text-xl font-bold">数据查询</div>
                <div class="text-xs opacity-60">
                    <template v-if="manifest">
                        版本 {{ manifest.version ?? '—' }} ·
                        角色 {{ manifest.counts.characters }} ·
                        职业 {{ manifest.counts.jobs }} ·
                        技能 {{ manifest.counts.skills }}（可获得 {{ manifest.counts.player_skills }}）
                    </template>
                    <template v-else>加载中…</template>
                </div>
                <div class="flex-1"></div>
                <NButton size="tiny" quaternary :loading="state.manifest === 'loading'" @click="reload">重新加载</NButton>
            </div>

            <NAlert v-if="error" type="error" :bordered="false" closable @close="error = null">
                {{ error }}
            </NAlert>

            <div class="flex flex-wrap gap-2">
                <NButton
                    v-for="tab in tabs"
                    :key="tab.key"
                    :type="activeKey === tab.key ? 'primary' : 'default'"
                    @click="selectTab(tab.key)"
                >
                    {{ tab.label }}
                </NButton>
            </div>

            <NSpin :show="busy">
                <CharacterPanel v-if="activeKey === 'character'" />
                <JobPanel v-else-if="activeKey === 'job'" />
                <SkillPanel v-else-if="activeKey === 'skill'" />
            </NSpin>

        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NAlert, NButton, NSpin } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import CharacterPanel from './CharacterPanel.vue';
import JobPanel from './JobPanel.vue';
import SkillPanel from './SkillPanel.vue';
import { useDataV2Store } from './dataV2Store';

defineOptions({ name: '数据查询V2' });

const store = useDataV2Store();
const { manifest, state, error, fromCache } = storeToRefs(store);

const tabs = [
    { key: 'character', label: '角色' },
    { key: 'job', label: '职业' },
    { key: 'skill', label: '技能' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

const urlTab = new URLSearchParams(window.location.search).get('v2tab') as TabKey | null;
const activeKey = ref<TabKey>(urlTab && tabs.some((t) => t.key === urlTab) ? urlTab : 'character');

const selectTab = (key: TabKey) => {
    activeKey.value = key;
    const params = new URLSearchParams(window.location.search);
    params.set('v2tab', key);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
};

const busy = computed(() => {
    const s = state.value;
    if (activeKey.value === 'character') return s.characters === 'loading';
    if (activeKey.value === 'job') return s.jobs === 'loading';
    return s.skills === 'loading';
});

const load = () => {
    void store.ensureManifest();
    void store.ensureCharacters();
    void store.ensureJobs();
    void store.ensureSkills();
};

const reload = async () => {
    await store.refresh();
};

onMounted(() => {
    load();
    const heading = document.getElementById('firstHeading');
    if (heading) heading.style.display = 'none';
});
</script>
