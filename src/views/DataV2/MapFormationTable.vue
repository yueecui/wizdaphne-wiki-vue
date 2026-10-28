<template>
    <div class="flex flex-col gap-2">
        <table v-if="visibleRows.length" class="wikitable w-full m-0! text-center text-sm">
            <thead>
                <tr>
                    <th class="w-[5em]">权重</th>
                    <th class="w-[4em]">逃跑</th>
                    <th class="w-[4em]">先制</th>
                    <th class="w-[4em]">偷袭</th>
                    <th class="w-[5em]">经验‰</th>
                    <th>成员</th>
                </tr>
            </thead>
            <tbody>
                <tr v-for="row in visibleRows" :key="row.row_id">
                    <td>{{ percentText(row) }}</td>
                    <td>{{ row.escape }}</td>
                    <td>{{ row.preemption }}</td>
                    <td>{{ row.surprise }}</td>
                    <td>{{ row.exp_rate }}</td>
                    <td class="text-left">
                        <div class="flex flex-col gap-1 py-1">
                            <div
                                v-for="line in memberLines(row)"
                                :key="line.row"
                                class="flex flex-wrap items-center gap-1"
                            >
                                <span
                                    class="inline-flex items-center justify-center min-w-[1.4rem] h-5 px-1 rounded bg-[#4a3f37] text-xs text-light/80 shrink-0"
                                >
                                    {{ line.row }}
                                </span>
                                <NTag
                                    v-for="member in line.members"
                                    :key="`${member.enemy_id}-${member.pos_x}`"
                                    size="small"
                                    :bordered="false"
                                    class="cursor-pointer!"
                                    @click="openEnemy(member.enemy_id)"
                                >
                                    {{ enemyName(member.enemy_id) }} Lv{{ levelText(member.lv_min, member.lv_max) }}
                                </NTag>
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>
        <div v-else class="text-xs opacity-60">—</div>
        <EnemyModal v-model:show="enemyModal" :enemy-id="enemyId" />
    </div>
</template>

<script setup lang="ts">
import { NTag } from 'naive-ui';
import { computed, ref } from 'vue';
import EnemyModal from './EnemyModal.vue';
import { useDataV2Store } from './dataV2Store';
import type { RawMapFormation, RawMapMember } from '../../stores/wikiData';

defineOptions({ name: '地图敌群表' });

const props = defineProps<{ formations: RawMapFormation[] }>();

const store = useDataV2Store();

const enemyModal = ref(false);
const enemyId = ref<number | null>(null);

/** enemy_id 是出现变体 id，敌人 modal 需要图鉴分类 id */
const openEnemy = (id: number) => {
    const categoryId = store.enemyCategoryIdOf(id);
    if (categoryId == null) return;
    enemyId.value = categoryId;
    enemyModal.value = true;
};

/** 敌人名称 / 属性一律查敌人模块，地图数据里只有 enemy_id */
const enemyName = (id: number) => store.enemyNameOf(id);
const levelText = (min: number, max: number) => (min === max ? String(min) : `${min}-${max}`);

/** 权重为 0 的行不显示 */
const visibleRows = computed(() => props.formations.filter((row) => row.weight > 0));

/** 同一个敌群内的权重总和，用来把权重换算成百分比 */
const groupTotals = computed(() => {
    const totals = new Map<number, number>();
    for (const row of props.formations) {
        totals.set(row.formation_id, (totals.get(row.formation_id) ?? 0) + row.weight);
    }
    return totals;
});

const percentText = (row: RawMapFormation) => {
    const total = groupTotals.value.get(row.formation_id) ?? 0;
    if (!total) return '—';
    return `${Math.round((row.weight / total) * 1000) / 10}%`;
};

/** 成员按站位分行：第一排（pos_y = 1）在最上面，行内从左到右（pos_x 升序） */
const memberLines = (row: RawMapFormation) => {
    const lines = new Map<number, RawMapMember[]>();
    for (const member of row.members) {
        const list = lines.get(member.pos_y) ?? [];
        list.push(member);
        lines.set(member.pos_y, list);
    }
    return [...lines.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([rowNo, members]) => ({
            row: rowNo,
            members: [...members].sort((a, b) => a.pos_x - b.pos_x),
        }));
};
</script>
