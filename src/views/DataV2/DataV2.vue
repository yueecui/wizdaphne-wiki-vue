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
                        技能 {{ manifest.counts.skills }}（可获得 {{ manifest.counts.player_skills }}） ·
                        装备 {{ manifest.counts.equipments }}
                    </template>
                    <template v-else>加载中…</template>
                </div>
                <div class="flex-1"></div>
                <NButton
                    size="tiny"
                    quaternary
                    :loading="enumLoading"
                    title="只重拉 Api/GetV2Enum（字典 + 效果种类名），调 sub effect kind 名字时用"
                    @click="reloadEnums"
                >
                    只重载 Enum
                </NButton>
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
                <SkillPanel v-else-if="activeKey === 'skill'" />
                <EquipmentPanel
                    v-else-if="activeKey === 'weapon' || activeKey === 'armor'"
                    :group="activeKey"
                />
                <FairyPanel v-else-if="activeKey === 'fairy'" />
                <JunkPanel v-else-if="activeKey === 'junk'" />
                <ItemPanel v-else-if="activeKey === 'item'" />
                <ShopPanel v-else-if="activeKey === 'shop'" />
                <RelicPanel v-else-if="activeKey === 'relic'" />
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
import EquipmentPanel from './EquipmentPanel.vue';
import FairyPanel from './FairyPanel.vue';
import ItemPanel from './ItemPanel.vue';
import ShopPanel from './ShopPanel.vue';
import RelicPanel from './RelicPanel.vue';
import JunkPanel from './JunkPanel.vue';
import SkillPanel from './SkillPanel.vue';
import { useDataV2Store } from './dataV2Store';
import { DATA_V2_TAB_KEY, DATA_V2_TAB_PARAM } from './dataV2Settings';

defineOptions({ name: '数据查询V2' });

const store = useDataV2Store();
const { manifest, state, error, fromCache } = storeToRefs(store);

const tabs = [
    { key: 'character', label: '角色' },
    { key: 'skill', label: '技能' },
    { key: 'weapon', label: '武器' },
    { key: 'armor', label: '防具' },
    { key: 'fairy', label: '妖精' },
    { key: 'junk', label: '杂物' },
    { key: 'item', label: '物品' },
    { key: 'shop', label: '商店' },
    { key: 'relic', label: '遗物' },
] as const;

type TabKey = (typeof tabs)[number]['key'];

// 页签参数和 V1 一样用 `tab`；`v2tab` 只做旧链接兼容（v2tab=equipment 归到武器页）
const searchParams = new URLSearchParams(window.location.search);
const rawTab = searchParams.get(DATA_V2_TAB_PARAM) ?? searchParams.get('v2tab');
const urlTab = (rawTab === 'equipment' ? 'weapon' : rawTab) as TabKey | null;
const storedTab = localStorage.getItem(DATA_V2_TAB_KEY) as TabKey | null;
const initialTab = urlTab ?? storedTab;
const activeKey = ref<TabKey>(
    initialTab && tabs.some((t) => t.key === initialTab) ? initialTab : 'character',
);

const selectTab = (key: TabKey) => {
    activeKey.value = key;
    localStorage.setItem(DATA_V2_TAB_KEY, key);
    const params = new URLSearchParams(window.location.search);
    params.delete('v2tab');
    params.set(DATA_V2_TAB_PARAM, key);
    window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
};

const busy = computed(() => {
    const s = state.value;
    if (activeKey.value === 'character') return s.characters === 'loading';
    if (activeKey.value === 'weapon' || activeKey.value === 'armor' || activeKey.value === 'fairy') {
        return s.equipments === 'loading';
    }
    // 杂物走自己的库；物品 / 商店 / 遗物和角色等在同一批全量下载里就绪
    if (activeKey.value === 'junk') return false;
    if (
        activeKey.value === 'item' ||
        activeKey.value === 'shop' ||
        activeKey.value === 'relic'
    ) {
        return s.characters === 'loading';
    }
    return s.skills === 'loading';
});

const load = () => {
    void store.ensureManifest();
    void store.ensureCharacters();
    void store.ensureJobs();
    void store.ensureSkills();
    void store.ensureEquipments();
};

const reload = async () => {
    await store.refresh();
};

/** 只重拉 Enum：改完 `Data:EffectKind.json` 的名字后点一下就生效，不用清整库 */
const enumLoading = ref(false);
const reloadEnums = async () => {
    if (enumLoading.value) return;
    enumLoading.value = true;
    error.value = null;
    try {
        await store.refreshEnums();
        const kinds = Object.keys(store.effectKinds).length;
        window.wiz.$message.success(`Enum 已重载（效果种类 ${kinds} 条）`);
    } catch (e) {
        error.value = `Enum 重载失败：${e instanceof Error ? e.message : String(e)}`;
    } finally {
        enumLoading.value = false;
    }
};

onMounted(() => {
    load();
    const heading = document.getElementById('firstHeading');
    if (heading) heading.style.display = 'none';
});
</script>
