<template>
    <ThemeConfigProvider>
        <NModal :show="show" @update:show="onShowUpdate" @esc="close" @mask-click="close">
            <div class="w-[95vw] md:w-[1080px] max-h-[88vh] m-auto flex flex-col huiji-css-hook bg-transparent!">
                <div class="flex flex-col min-h-0 bg-[#312721]! border! border-[#463d38]! rounded">
                    <div class="shrink-0 bg-[#312721] px-4 pt-3 pb-2 border-b! border-[#463d38]!">
                        <div class="flex items-start gap-3">
                            <div class="flex-1 min-w-0">
                                <div class="text-2xl md:text-3xl text-light font-bold break-words">
                                    敌群 {{ poolId ?? '—' }}
                                </div>
                                <div v-if="pool" class="text-sm text-gray-400">
                                    <template v-if="pool.floors.length">
                                        <template v-for="(floor, index) in pool.floors" :key="floor.id">
                                            <span v-if="index" class="mx-1 opacity-60">/</span>
                                            <a
                                                class="cursor-pointer text-blue-400 hover:underline"
                                                @click="openFloor(floor.id)"
                                            >
                                                {{ floor.map_name }} · {{ floor.name }}
                                            </a>
                                        </template>
                                    </template>
                                    <template v-else>无关联地图</template>
                                </div>
                            </div>
                            <div class="flex items-center gap-3 shrink-0">
                                <NButton size="tiny" quaternary @click="close">关闭</NButton>
                            </div>
                        </div>
                    </div>

                    <div class="flex-1 min-h-0 overflow-y-auto thin-scrollbar p-4">
                        <NEmpty v-if="!pool" description="未选择敌群" />
                        <div v-else class="flex flex-col text-sm">
                            <NTabs v-model:value="activeTab" type="card" size="small">
                                <NTabPane name="enemies" :tab="`敌人（${rows.length + pool.notorious_enemies.length}）`">
                                    <div class="flex flex-col gap-4">
                                        <div class="flex flex-col gap-2">
                                            <table v-if="rows.length" class="wikitable w-full m-0! text-center">
                                                <thead>
                                                    <tr>
                                                        <th class="w-[5em]">图鉴ID</th>
                                                        <th class="w-[12em]">名字</th>
                                                        <th class="w-[8em]">种族</th>
                                                        <th class="w-[8em]">属性</th>
                                                        <th class="w-[8em]">弱点</th>
                                                        <th>遗物</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    <tr v-for="row in rows" :key="row.id">
                                                        <td class="whitespace-nowrap">
                                                            <template v-if="row.no != null">{{ row.no }}</template>
                                                            <span v-else class="opacity-40">—</span>
                                                        </td>
                                                        <td class="text-left">
                                                            <a
                                                                class="cursor-pointer text-blue-400 hover:underline"
                                                                @click="openEnemy(row.categoryId, row.id)"
                                                            >
                                                                {{ row.name }}
                                                            </a>
                                                        </td>
                                                        <td class="whitespace-nowrap">{{ row.race }}</td>
                                                        <td class="whitespace-nowrap" :class="row.attrs === '—' ? 'opacity-40' : undefined">
                                                            {{ row.attrs }}
                                                        </td>
                                                        <td class="whitespace-nowrap" :class="row.weaks === '—' ? 'opacity-40' : undefined">
                                                            {{ row.weaks }}
                                                        </td>
                                                        <td class="text-left">
                                                            <template v-if="!pool.floors.length">
                                                                <span class="text-xs opacity-60">（未关联地图）</span>
                                                            </template>
                                                            <template v-else-if="!row.relic">
                                                                <span class="text-xs opacity-60">（无遗物）</span>
                                                            </template>
                                                            <template v-else-if="!row.front">
                                                                <span class="text-xs opacity-60">（不会出现在第一排）</span>
                                                            </template>
                                                            <template v-else>
                                                                <a
                                                                    class="cursor-pointer hover:text-light"
                                                                    @click="openSkill(row.relic)"
                                                                >
                                                                    {{ row.relic.name ?? '—' }}
                                                                </a>
                                                            </template>
                                                        </td>
                                                    </tr>
                                                </tbody>
                                            </table>
                                            <div v-else class="text-xs opacity-60">无</div>
                                        </div>

                                        <div v-if="pool.notorious_enemies.length" class="flex flex-col gap-2">
                                            <div class="flex items-center gap-2">
                                                <span class="text-light font-bold">强敌</span>
                                                <span class="text-xs opacity-60">{{ pool.notorious_enemies.length }} 种</span>
                                            </div>
                                            <div class="flex flex-wrap gap-1">
                                                <NTag
                                                    v-for="enemy in pool.notorious_enemies"
                                                    :key="enemy.enemy_id"
                                                    size="small"
                                                    type="error"
                                                    :bordered="false"
                                                    class="cursor-pointer!"
                                                    @click="openEnemyByVariant(enemy.enemy_id)"
                                                >
                                                    {{ enemyName(enemy.enemy_id) }} Lv{{ levelText(enemy) }}
                                                </NTag>
                                            </div>
                                        </div>
                                    </div>
                                </NTabPane>

                                <NTabPane name="formations" :tab="`敌群（${pool.formations.length}）`">
                                    <div class="flex flex-col gap-2">
                                        <MapFormationTable :formations="pool.formations" />
                                    </div>
                                </NTabPane>
                            </NTabs>
                        </div>
                    </div>
                </div>
            </div>
        </NModal>

        <EnemyModal v-model:show="enemyModal" :enemy-id="enemyId" :enemy-variant-id="enemyVariantId" />
        <MapFloorModal v-model:show="floorModal" :floor-id="floorId" />
        <SkillModal v-model:show="skillModal" :identification="skillIdentification" />
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton, NEmpty, NModal, NTabPane, NTabs, NTag } from 'naive-ui';
import { computed, ref } from 'vue';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import type { RawMapEnemyRef } from '../../stores/wikiData';
import EnemyModal from './EnemyModal.vue';
import MapFloorModal from './MapFloorModal.vue';
import MapFormationTable from './MapFormationTable.vue';
import SkillModal from './SkillModal.vue';
import { useDataV2Store } from './dataV2Store';
import type { RelicDoc } from './relicTypes';

defineOptions({ name: '敌群详情Modal' });

const props = defineProps<{ show: boolean; poolId: number | null }>();
const emit = defineEmits<{ 'update:show': [value: boolean] }>();

const store = useDataV2Store();

const pool = computed(() => (props.poolId == null ? null : (store.enemyPoolById.get(props.poolId) ?? null)));

/** 卡片页签：敌人 / 敌群（样式对齐敌人 modal） */
const activeTab = ref('enemies');

const rows = computed(() => {
    const poolRow = pool.value;
    if (!poolRow) return [];
    return poolRow.normal_enemies.map((ref) => {
        const hit = store.enemyVariantById.get(ref.enemy_id);
        const enemy = hit?.enemy;
        const no = enemy?.no ?? null;
        return {
            id: ref.enemy_id,
            categoryId: enemy?.id ?? null,
            no,
            name: enemyName(ref.enemy_id),
            race: enemy?.race.name ?? '—',
            attrs: (enemy?.attribute ?? []).map((item) => item.name).filter(Boolean).join(' / ') || '—',
            weaks: (enemy?.weak ?? []).map((item) => item.name).filter(Boolean).join(' / ') || '—',
            relic: no == null ? null : (store.relicByMonsterNo.get(no) ?? null),
            front: store.inFrontRow(poolRow.formations, ref.enemy_id),
        };
    });
});

const levelText = (enemy: RawMapEnemyRef) =>
    enemy.lv_min === enemy.lv_max ? String(enemy.lv_min) : `${enemy.lv_min}-${enemy.lv_max}`;

const enemyName = (id: number) => store.enemyNameOf(id);

const enemyModal = ref(false);
const enemyId = ref<number | null>(null);
/** 从敌群点开时带上实例（变体）id，让敌人 modal 自动定位到该变体 */
const enemyVariantId = ref<number | null>(null);

const openEnemy = (categoryId: number | null, variantId: number | null = null) => {
    if (categoryId == null) return;
    enemyId.value = categoryId;
    enemyVariantId.value = variantId;
    enemyModal.value = true;
};

/** 列表里的 enemy_id 是变体 id，modal 要传图鉴分类 id + 实例 id */
const openEnemyByVariant = (id: number) => openEnemy(store.enemyCategoryIdOf(id), id);

const floorModal = ref(false);
const floorId = ref<number | null>(null);
const openFloor = (id: number) => {
    floorId.value = id;
    floorModal.value = true;
};

const skillModal = ref(false);
const skillIdentification = ref<number | null>(null);
const openSkill = (relic: RelicDoc | null) => {
    if (relic?.skill_id == null) return;
    skillIdentification.value = relic.skill_id;
    skillModal.value = true;
};

const close = () => emit('update:show', false);
const onShowUpdate = (value: boolean) => emit('update:show', value);
</script>
