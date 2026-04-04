<template>
    <ThemeConfigProvider>
        <NModal v-model:show="showMonsterModal" @esc="closeMonsterModal" @mask-click="closeMonsterModal">
            <template v-if="currentMonster">
                <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
                        <div class="sticky top-0 bg-[#312721] z-10 py-2">
                            <div class="text-sm text-light">No. {{ currentMonster?.idText }}</div>
                            <div class="text-3xl text-light font-bold">
                                {{ currentMonster?.name }}
                            </div>
                        </div>

                        <!-- 第一部分：敌人的种族、属性和弱点 -->
                        <div class="flex flex-col md:flex-row gap-4">
                            <div class="md:w-1/2">
                                <table class="wikitable w-full m-0!">
                                    <tbody>
                                        <tr>
                                            <th class="w-20 text-left">种族</th>
                                            <td>{{ currentMonster?.race }}</td>
                                        </tr>
                                        <tr>
                                            <th class="text-left">属性</th>
                                            <td>{{ currentMonster?.element || '-' }}</td>
                                        </tr>
                                        <tr>
                                            <th class="text-left">弱点</th>
                                            <td>{{ currentMonster?.weakness.join(' / ') || '-' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- 第二部分：遗物信息 -->
                            <div v-if="monsterRelic" class="flex-1">
                                <table class="wikitable w-full m-0!">
                                    <tbody>
                                        <tr>
                                            <th class="w-20 text-left">遗物名称</th>
                                            <td
                                                class="cursor-pointer hover:bg-[#3a312a]!"
                                                @click="openRelicModal(monsterRelic)"
                                            >
                                                {{ monsterRelic.name }}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th class="text-left">性格</th>
                                            <td>{{ monsterRelic.align }}</td>
                                        </tr>
                                        <tr>
                                            <th class="text-left">提升属性</th>
                                            <td>{{ monsterRelic.inc.join(' / ') }}</td>
                                        </tr>
                                        <tr>
                                            <th class="text-left">降低属性</th>
                                            <td>{{ monsterRelic.dec.join(' / ') }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <!-- 备注表格（全宽，上下2行形式） -->
                        <div v-if="currentMonster.comment">
                            <table class="wikitable w-full m-0!">
                                <tbody>
                                    <tr>
                                        <th class="text-left">备注</th>
                                    </tr>
                                    <tr>
                                        <td v-html="formatComment(currentMonster.comment)"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        <!-- 第三部分：地图列表 -->
                        <div>
                            <table class="wikitable w-full text-center m-0!">
                                <tbody>
                                    <tr>
                                        <th colspan="3">出没地图</th>
                                    </tr>
                                    <tr>
                                        <th class="">地图名称</th>
                                        <th class="w-24">等级</th>
                                        <th class="w-24">遗物掉落</th>
                                    </tr>
                                    <tr v-if="monsterMaps.length === 0">
                                        <td colspan="2" class="text-gray-400">暂无出没地图</td>
                                    </tr>
                                    <tr
                                        v-for="map in monsterMaps"
                                        :key="map.name"
                                        class="hover:bg-[#3a312a]! cursor-pointer"
                                        @click="openMapModal(map.map)"
                                    >
                                        <td>{{ map.name }}</td>
                                        <td>{{ map.level }}</td>
                                        <td>
                                            <span v-if="!monsterRelic" class="text-gray-400">无</span>
                                            <span
                                                v-else
                                                :class="
                                                    map.relicText === '是'
                                                        ? 'text-green-400'
                                                        : map.relicText === '否'
                                                          ? 'text-red-400'
                                                          : ''
                                                "
                                            >
                                                {{ map.relicText }}
                                            </span>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <div class="flex justify-center gap-4 mt-4">
                            <NButton size="small" type="error" @click="openEditorModal" v-if="canEdit">
                                编辑备注
                            </NButton>
                            <!-- 有历史记录时显示返回和全部关闭 -->
                            <template v-if="hasHistory">
                                <NButton size="small" type="primary" @click="closeMonsterModal">返回上一页</NButton>
                                <NButton size="small" type="warning" @click="closeAll">全部关闭</NButton>
                            </template>
                            <!-- 无历史记录时只显示关闭 -->
                            <template v-else>
                                <NButton size="small" type="warning" @click="closeMonsterModal">关闭</NButton>
                            </template>
                        </div>

                        <NModal v-model:show="editorModalVisible">
                            <div class="w-[90%] md:h-auto md:w-[400px] m-auto huiji-css-hook bg-transparent!">
                                <MonsterEditor
                                    :monsterId="currentMonster.id.toString()"
                                    @cancel="closeEditorModal"
                                    @submit="onEditorSubmit"
                                />
                            </div>
                        </NModal>
                    </div>
                </div>
            </template>
            <template v-else>
                <div class="flex justify-center items-center">
                    <span class="text-gray-400">暂无数据</span>
                </div>
            </template>
        </NModal>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton, NModal } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, ref, toRefs } from 'vue';
import { MwConfig } from '../huiji/MwConfig';
import ThemeConfigProvider from '../layout/ThemeConfigProvider.vue';
import { useMonsterModalStore } from '../stores/monsterModalStore';
import { useMonsterStore } from '../views/DataSearcher/Monster/monsterStore';
import type { RelicBrew } from '../views/DataSearcher/RelicBrew/RelicBrew';
import { convertDescription } from '../views/DataSearcher/utils/convertDescription';
import MonsterEditor from './MonsterEditor.vue';

const store = useMonsterModalStore();
const { openMapModal, openRelicModal, closeMonsterModal, clearHistory } = store;
const { showMonsterModal, currentMonster, modalHistory } = toRefs(store);

const monsterStore = useMonsterStore();
const { maps, relicBrews } = storeToRefs(monsterStore);

const mwConfig = MwConfig.getInstance();
const canEdit = computed(() => {
    return mwConfig.canEdit;
});

const editorModalVisible = ref(false);

// 计算是否有历史记录
const hasHistory = computed(() => modalHistory.value.length > 0);

// 全部关闭（关闭当前并清空历史）
const closeAll = () => {
    clearHistory();
    closeMonsterModal();
};

const openEditorModal = () => {
    editorModalVisible.value = true;
};

const closeEditorModal = () => {
    editorModalVisible.value = false;
};

const onEditorSubmit = () => {
    closeEditorModal();
};

const monsterRelic = computed(() => {
    if (!currentMonster.value?.relic) return null;
    const relic = relicBrews.value.find((r) => r.name === currentMonster.value?.relic);
    if (!relic) return null;
    return relic as RelicBrew;
});

const monsterMaps = computed(() => {
    if (!currentMonster.value) return [];

    const monsterName = currentMonster.value.name;
    const monsterId = currentMonster.value.id;

    return maps.value
        .filter((map) => {
            // 检查地图的敌人列表是否包含当前怪物（支持ID或名称）
            return map.enemies.some((enemyIdentifier) => {
                if (!isNaN(Number(enemyIdentifier))) {
                    // 如果是数字，比较ID
                    return Number(enemyIdentifier) === monsterId;
                } else {
                    // 否则比较名称
                    return enemyIdentifier === monsterName;
                }
            });
        })
        .map((map) => {
            const isInBackEnemies = map.backEnemies.some((enemyIdentifier) => {
                if (!isNaN(Number(enemyIdentifier))) {
                    return Number(enemyIdentifier) === monsterId;
                } else {
                    return enemyIdentifier === monsterName;
                }
            });

            const isInRLvPlus1Enemies = map.rLvPlus1Enemies.some((enemyIdentifier) => {
                if (!isNaN(Number(enemyIdentifier))) {
                    return Number(enemyIdentifier) === monsterId;
                } else {
                    return enemyIdentifier === monsterName;
                }
            });

            const isInRLvPlus2Enemies = map.rLvPlus2Enemies.some((enemyIdentifier) => {
                if (!isNaN(Number(enemyIdentifier))) {
                    return Number(enemyIdentifier) === monsterId;
                } else {
                    return enemyIdentifier === monsterName;
                }
            });

            let displayRlv = map.rlv;
            if (isInRLvPlus2Enemies) {
                displayRlv = map.rlv + 2;
            } else if (isInRLvPlus1Enemies) {
                displayRlv = map.rlv + 1;
            }

            return {
                index: map.index,
                map: map,
                name: map.name,
                level: map.levelText,
                rlv: map.rlv,
                relicText: map.rlv === 0 ? '是' : isInBackEnemies ? '否' : `★${displayRlv}`,
            };
        })
        .sort((a, b) => a.index - b.index);
});

const formatComment = (comment: string) => convertDescription(comment);
</script>

<style scoped></style>
