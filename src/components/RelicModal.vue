<template>
    <ThemeConfigProvider>
        <NModal v-model:show="showRelicModal" @esc="closeRelicModal" @mask-click="closeRelicModal">
            <template v-if="currentRelic">
                <div class="w-[90%] md:h-auto md:w-[800px] m-auto huiji-css-hook bg-transparent!">
                    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
                        <div class="sticky top-0 bg-[#312721] z-10 py-2">
                            <div class="text-sm text-light">No. {{ currentRelic?.id }}</div>
                            <div class="text-3xl text-light font-bold">
                                {{ currentRelic?.name }}
                            </div>
                        </div>

                        <!-- 遗物基本信息 -->
                        <div class="flex flex-col md:flex-row gap-4">
                            <!-- 第一个表格：性格，提升属性，降低属性 -->
                            <div class="md:w-1/2">
                                <table class="wikitable w-full m-0!">
                                    <tbody>
                                        <tr>
                                            <th class="w-20 text-left">性格</th>
                                            <td>{{ currentRelic?.align }}</td>
                                        </tr>
                                        <tr>
                                            <th class="text-left">提升属性</th>
                                            <td>{{ currentRelic?.inc.join(' / ') || '-' }}</td>
                                        </tr>
                                        <tr>
                                            <th class="text-left">降低属性</th>
                                            <td>{{ currentRelic?.dec.join(' / ') || '-' }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- 第二个表格：遗物酒名，遗物之力名 -->
                            <div class="md:w-1/2">
                                <table class="wikitable w-full m-0!">
                                    <tbody>
                                        <tr>
                                            <th class="w-24 text-left">遗物酒名</th>
                                            <td>{{ currentRelic?.brew }}</td>
                                        </tr>
                                        <tr>
                                            <th class="text-left">遗物之力</th>
                                            <td>{{ currentRelic?.power }}</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 备注表格（全宽，上下2行形式） -->
                        <div v-if="currentRelic?.comment">
                            <table class="wikitable w-full m-0!">
                                <tbody>
                                    <tr>
                                        <th class="text-left">备注</th>
                                    </tr>
                                    <tr>
                                        <td v-html="formatComment(currentRelic.comment)"></td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        <!-- 分页组件 -->
                        <NTabs type="card" size="small" v-model:value="activeTab">
                            <!-- 第一页：敌人 -->
                            <NTabPane name="monsters" :tab="`敌人 (${relicMonsters.length})`">
                                <div class="mt-2">
                                    <table class="wikitable w-full text-center m-0!">
                                        <thead>
                                            <tr>
                                                <th class="xl:w-12">ID</th>
                                                <th class="xl:w-48">名称</th>
                                                <th class="xl:w-20">种族</th>
                                                <th class="xl:w-20">属性</th>
                                                <th class="xl:w-20">弱点</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-if="relicMonsters.length === 0">
                                                <td colspan="5" class="text-gray-400">暂无掉落敌人</td>
                                            </tr>
                                            <tr
                                                v-for="monster in relicMonsters"
                                                :key="monster.name"
                                                class="hover:bg-[#3a312a]! cursor-pointer"
                                                @click="openMonsterModal(monster.monster)"
                                            >
                                                <td>{{ monster.idText }}</td>
                                                <td>{{ monster.name }}</td>
                                                <td>{{ monster.race }}</td>
                                                <td>{{ monster.element || '-' }}</td>
                                                <td>{{ monster.weakness.join(' / ') || '-' }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </NTabPane>

                            <!-- 第二页：地图 -->
                            <NTabPane name="maps" :tab="`地图 (${relicMaps.length})`">
                                <div class="mt-2">
                                    <table class="wikitable w-full text-center m-0!">
                                        <thead>
                                            <tr>
                                                <th>地图名称</th>
                                                <th class="w-20">等级</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr v-if="relicMaps.length === 0">
                                                <td class="text-gray-400">暂无地图数据</td>
                                            </tr>
                                            <tr
                                                v-for="map in relicMaps"
                                                :key="map.name"
                                                class="hover:bg-[#3a312a]! cursor-pointer"
                                                @click="openMapModal(map.map)"
                                            >
                                                <td>{{ map.name }}</td>
                                                <td>{{ map.level }}</td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </NTabPane>
                        </NTabs>

                        <div class="flex justify-center gap-4 mt-4">
                            <NButton size="small" type="error" @click="openEditorModal" v-if="canEdit">
                                编辑备注
                            </NButton>
                            <!-- 有历史记录时显示返回和全部关闭 -->
                            <template v-if="hasHistory">
                                <NButton size="small" type="primary" @click="closeRelicModal">返回上一页</NButton>
                                <NButton size="small" type="warning" @click="closeAll">全部关闭</NButton>
                            </template>
                            <!-- 无历史记录时只显示关闭 -->
                            <template v-else>
                                <NButton size="small" type="warning" @click="closeRelicModal">关闭</NButton>
                            </template>
                        </div>

                        <NModal v-model:show="editorModalVisible">
                            <div class="w-[90%] md:h-auto md:w-[400px] m-auto huiji-css-hook bg-transparent!">
                                <RelicEditor
                                    :relicIndex="currentRelic.index.toString()"
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
import { NButton, NModal, NTabPane, NTabs } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, ref, toRefs } from 'vue';
import { MwConfig } from '../huiji/MwConfig';
import ThemeConfigProvider from '../layout/ThemeConfigProvider.vue';
import { useMonsterModalStore } from '../stores/monsterModalStore';
import type { Monster } from '../views/DataSearcher/Monster/Monster';
import { useMonsterStore } from '../views/DataSearcher/Monster/monsterStore';
import { convertDescription } from '../views/DataSearcher/utils/convertDescription';
import RelicEditor from './RelicEditor.vue';

const store = useMonsterModalStore();
const { openMonsterModal, openMapModal, closeRelicModal, clearHistory } = store;
const { showRelicModal, currentRelic, modalHistory } = toRefs(store);

const monsterStore = useMonsterStore();
const { monsters, maps } = storeToRefs(monsterStore);

const mwConfig = MwConfig.getInstance();
const canEdit = computed(() => {
    return mwConfig.canEdit;
});

const editorModalVisible = ref(false);
const activeTab = ref('monsters');

// 计算是否有历史记录
const hasHistory = computed(() => modalHistory.value.length > 0);

// 全部关闭（关闭当前并清空历史）
const closeAll = () => {
    clearHistory();
    closeRelicModal();
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

// 掉落该遗物的敌人列表
const relicMonsters = computed(() => {
    if (!currentRelic.value) return [];

    return monsters.value
        .filter((monster) => monster.relic === currentRelic.value!.name)
        .map((monster) => ({
            monster: monster,
            name: monster.name,
            idText: monster.idText,
            id: monster.id,
            race: monster.race,
            element: monster.element,
            weakness: monster.weakness,
        }))
        .sort((a, b) => a.id - b.id);
});

// 该遗物出现的地图列表
const relicMaps = computed(() => {
    if (!currentRelic.value) return [];

    return maps.value
        .filter((map) => {
            // 检查地图中是否有敌人掉落该遗物
            return map.enemies.some((enemyIdentifier) => {
                // 尝试通过ID或名称查找敌人
                let monster: Monster | undefined;
                if (!isNaN(Number(enemyIdentifier))) {
                    // 如果是数字，尝试通过ID查找
                    const enemyId = Number(enemyIdentifier);
                    monster = monsters.value.find((m) => m.id === enemyId);
                } else {
                    // 否则通过名称查找
                    monster = monsters.value.find((m) => m.name === enemyIdentifier);
                }
                return monster?.relic === currentRelic.value!.name;
            });
        })
        .map((map) => ({
            map: map,
            name: map.name,
            level: map.level,
        }))
        .sort((a, b) => a.name.localeCompare(b.name));
});

const formatComment = (comment: string) => convertDescription(comment);
</script>

<style scoped></style>
