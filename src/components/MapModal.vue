<template>
    <ThemeConfigProvider>
        <NModal v-model:show="showMapModal" @esc="closeMapModal" @mask-click="closeMapModal">
            <template v-if="currentMap">
                <div class="w-[90%] md:h-auto md:w-[800px] m-auto huiji-css-hook bg-transparent!">
                    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
                        <div class="sticky top-0 bg-[#312721] z-10 py-2">
                            <div class="text-sm text-light">
                                {{ currentMap?.category }}
                            </div>
                            <div class="text-3xl text-light font-bold">
                                {{ currentMap?.name }}
                            </div>
                        </div>

                        <!-- 左右两列表格 -->
                        <div class="flex flex-col md:flex-row gap-4">
                            <!-- 左侧表格：特殊掉落和特色杂物 -->
                            <div class="md:w-1/2">
                                <table class="wikitable w-full m-0!">
                                    <tbody>
                                        <tr>
                                            <th colspan="2">基础情报</th>
                                        </tr>
                                        <tr>
                                            <th class="w-24">敌人等级</th>
                                            <td :class="currentMap?.minLv <= 0 ? 'text-gray-500 text-sm' : ''">
                                                {{ currentMap?.levelText }}
                                            </td>
                                        </tr>
                                        <tr v-if="currentMap?.minLv !== -1">
                                            <th class="w-24">遗物星级</th>
                                            <td :class="currentMap?.rlv <= 0 ? 'text-gray-500 text-sm' : ''">
                                                {{ currentMap?.rlvText }}
                                            </td>
                                        </tr>
                                        <tr v-if="currentMap?.drops?.length">
                                            <th>特殊掉落</th>
                                            <td>
                                                <div class="flex flex-col">
                                                    <EquipmentInline
                                                        v-for="(drop, index) in currentMap.drops"
                                                        :key="index"
                                                        :equipmentName="drop"
                                                    />
                                                </div>
                                            </td>
                                        </tr>
                                        <tr v-if="currentMap?.minLv !== -1">
                                            <th>掉落杂物</th>
                                            <td>
                                                <div class="flex flex-col">
                                                    <template v-if="currentMap?.junk?.length">
                                                        <JunkInline
                                                            v-for="(junkName, index) in currentMap.junk"
                                                            :key="index"
                                                            :junkName="junkName"
                                                            :junkHash="currentMap.junkCodes[index] || ''"
                                                        />
                                                    </template>
                                                    <template v-else>
                                                        <span class="text-sm text-gray-500">无</span>
                                                    </template>
                                                </div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>

                            <!-- 右侧表格：备注 -->
                            <div v-if="currentMap?.comment" class="md:w-1/2">
                                <table class="wikitable w-full m-0!">
                                    <tbody>
                                        <tr>
                                            <th class="text-left">备注</th>
                                        </tr>
                                        <tr>
                                            <td v-html="formatComment(currentMap.comment)"></td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <!-- 分页组件 -->
                        <NTabs type="card" size="small" v-model:value="activeTab">
                            <!-- 第一页：地图 -->
                            <NTabPane name="map" tab="地图">
                                <div class="mt-2">
                                    <!-- 暂无地图 -->
                                    <div
                                        v-if="!currentMap?.images || currentMap.images.length === 0"
                                        class="text-center text-gray-400 py-4"
                                    >
                                        暂无地图
                                    </div>
                                    <!-- 单张地图图片 -->
                                    <div v-else-if="currentMap.images.length === 1" class="flex flex-col items-center">
                                        <a :href="`/wiki/File:${currentMap.images[0]}`" target="_blank">
                                            <WikiImg
                                                :imageName="currentMap.images[0]"
                                                class="h-auto max-w-[480px] rounded border border-[#463d38]"
                                            />
                                        </a>
                                    </div>
                                    <!-- 多张地图图片 -->
                                    <div v-else class="flex flex-col gap-4">
                                        <div class="flex justify-center gap-2 flex-wrap">
                                            <NButton
                                                v-for="(image, index) in currentMap.images"
                                                :key="index"
                                                size="small"
                                                :type="index === currentImageIndex ? 'primary' : 'default'"
                                                @click="currentImageIndex = index"
                                            >
                                                {{ getImageLabel(index) }}
                                            </NButton>
                                        </div>
                                        <div class="flex flex-col items-center">
                                            <a
                                                :href="`/wiki/File:${currentMap.images[currentImageIndex]}`"
                                                target="_blank"
                                            >
                                                <WikiImg
                                                    :imageName="currentMap.images[currentImageIndex]"
                                                    class="h-auto max-w-[480px] rounded border border-[#463d38]"
                                                />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            </NTabPane>

                            <!-- 第二页：敌人 -->
                            <NTabPane name="enemies" :tab="`敌人 (${sortedEnemies.length})`">
                                <div class="mt-2">
                                    <!-- 敌人列表 -->
                                    <div v-if="currentMap?.enemies && currentMap.enemies.length > 0">
                                        <table class="wikitable w-full text-center">
                                            <thead>
                                                <tr>
                                                    <th class="xl:w-12">ID</th>
                                                    <th class="xl:w-48">名称</th>
                                                    <th class="xl:w-20">种族</th>
                                                    <th class="xl:w-20">属性</th>
                                                    <th class="xl:w-20">弱点</th>
                                                    <th class="">遗物</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr
                                                    v-for="enemy in sortedEnemies"
                                                    :key="enemy.name"
                                                    class="hover:bg-[#3a312a]! cursor-pointer"
                                                    @click="openMonsterModal(enemy.monster)"
                                                >
                                                    <td>{{ enemy.idText }}</td>
                                                    <td>
                                                        {{ enemy.name }}
                                                        <span v-if="enemy.isBoss" class="text-gray-500 text-xs">
                                                            (定点)
                                                        </span>
                                                    </td>
                                                    <td>{{ enemy.race }}</td>
                                                    <td>
                                                        {{ enemy.element || '-' }}
                                                    </td>
                                                    <td>{{ enemy.weakness.join(' / ') || '-' }}</td>
                                                    <td>
                                                        <span v-if="!enemy.relic" class="text-gray-500 text-sm">
                                                            （无遗物）
                                                        </span>
                                                        <span v-else-if="enemy.isBack" class="text-gray-500 text-sm">
                                                            （不出现在前排）
                                                        </span>
                                                        <span v-else>
                                                            {{ enemy.relic }}
                                                            <span
                                                                v-if="enemy.isRLvPlus1"
                                                                class="text-xs ml-1 text-blue-300"
                                                            >
                                                                ★{{ currentMap.rlv === 0 ? '+1' : currentMap.rlv + 1 }}
                                                            </span>
                                                            <span
                                                                v-if="enemy.isRLvPlus2"
                                                                class="text-xs ml-1 text-purple-300"
                                                            >
                                                                ★{{ currentMap.rlv === 0 ? '+2' : currentMap.rlv + 2 }}
                                                            </span>
                                                        </span>
                                                    </td>
                                                </tr>
                                            </tbody>
                                        </table>
                                        <div class="text-sm text-gray-400">
                                            <span>
                                                ※ 「定点」是指仅在特定位置才会出现的敌人，如灯怪、守口的固定敌人等
                                            </span>
                                        </div>
                                    </div>

                                    <!-- 无敌人数据提示 -->
                                    <div
                                        v-if="!currentMap?.enemies || currentMap.enemies.length === 0"
                                        class="text-center text-gray-400 py-4"
                                    >
                                        暂无敌人数据
                                    </div>
                                </div>
                            </NTabPane>

                            <!-- 第三页：遗物 -->
                            <NTabPane name="relics" :tab="`遗物 (${mapRelics.length})`">
                                <div class="mt-2">
                                    <!-- 遗物列表 -->
                                    <div v-if="mapRelics.length > 0">
                                        <table class="wikitable w-full text-center">
                                            <thead>
                                                <tr>
                                                    <th class="xl:w-48">遗物名称</th>
                                                    <th class="xl:w-16">性格</th>
                                                    <th class="xl:w-32">提升属性</th>
                                                    <th class="xl:w-20">降低属性</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                <tr
                                                    v-for="relic in mapRelics"
                                                    :key="relic.name"
                                                    class="hover:bg-[#3a312a]! cursor-pointer"
                                                    @click="openRelicModal(relic.relic)"
                                                >
                                                    <td>{{ relic.name }}</td>
                                                    <td>{{ relic.align }}</td>
                                                    <td>{{ relic.inc.join(' / ') }}</td>
                                                    <td>{{ relic.dec.join(' / ') }}</td>
                                                </tr>
                                            </tbody>
                                        </table>
                                    </div>

                                    <!-- 无遗物数据提示 -->
                                    <div v-if="mapRelics.length === 0" class="text-center text-gray-400 py-4">
                                        暂无遗物数据
                                    </div>
                                </div>
                            </NTabPane>
                        </NTabs>

                        <div class="flex justify-center gap-4 mt-4">
                            <NButton size="small" type="error" @click="openEditorModal" v-if="canEdit">
                                编辑地图
                            </NButton>
                            <!-- 有历史记录时显示返回和全部关闭 -->
                            <template v-if="hasHistory">
                                <NButton size="small" type="primary" @click="closeMapModal">返回上一页</NButton>
                                <NButton size="small" type="warning" @click="closeAll">全部关闭</NButton>
                            </template>
                            <!-- 无历史记录时只显示关闭 -->
                            <template v-else>
                                <NButton size="small" type="warning" @click="closeMapModal">关闭</NButton>
                            </template>
                        </div>

                        <NModal v-model:show="editorModalVisible">
                            <div class="w-[90%] md:h-auto md:w-[800px] m-auto huiji-css-hook bg-transparent!">
                                <MapEditor
                                    :mapIndex="currentMap.index.toString()"
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
import type { RelicBrew } from '../views/DataSearcher/RelicBrew/RelicBrew';
import { convertDescription } from '../views/DataSearcher/utils/convertDescription';
import EquipmentInline from './EquipmentInline.vue';
import WikiImg from './huiji/WikiImg.vue';
import JunkInline from './JunkInline.vue';
import MapEditor from './MapEditor.vue';

const store = useMonsterModalStore();
const { openMonsterModal, openRelicModal, closeMapModal, clearHistory } = store;
const { showMapModal, currentMap, modalHistory } = toRefs(store);

const monsterStore = useMonsterStore();
const { monsters, relicBrews } = storeToRefs(monsterStore);

const mwConfig = MwConfig.getInstance();
const isSystemAdmin = computed(() => mwConfig.isSystemAdmin);
const canEdit = computed(() => {
    return mwConfig.canEdit;
});

const activeTab = ref('enemies');
const currentImageIndex = ref(0);
const editorModalVisible = ref(false);

// 计算是否有历史记录
const hasHistory = computed(() => modalHistory.value.length > 0);

// 全部关闭（关闭当前并清空历史）
const closeAll = () => {
    clearHistory();
    closeMapModal();
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

const getImageLabel = (index: number) => {
    if (currentMap.value?.imageLabels && currentMap.value.imageLabels[index]) {
        return currentMap.value.imageLabels[index];
    }
    return `图片${index + 1}`;
};

const sortedEnemies = computed(() => {
    if (!currentMap.value?.enemies) return [];

    const invalidEnemies: string[] = [];

    const result = currentMap.value.enemies
        .map((enemyIdentifier) => {
            // 尝试通过ID或名称查找敌人
            let monster: Monster | undefined;
            if (!isNaN(Number(enemyIdentifier))) {
                // 如果是数字，尝试通过ID查找
                monster = monsters.value.find((m) => {
                    return m.id === Number(enemyIdentifier);
                });
            } else {
                // 否则通过名称查找
                monster = monsters.value.find((m) => m.name === enemyIdentifier);
            }

            if (!monster) {
                invalidEnemies.push(enemyIdentifier);
                return null;
            }

            return {
                monster: monster,
                name: monster.name,
                idText: monster.idText,
                id: monster.id,
                race: monster.race,
                element: monster.element,
                weakness: monster.weakness,
                relic: monster.relic,
                isBack: currentMap.value?.backEnemies?.includes(enemyIdentifier) || false,
                isRLvPlus1: currentMap.value?.rLvPlus1Enemies?.includes(enemyIdentifier) || false,
                isRLvPlus2: currentMap.value?.rLvPlus2Enemies?.includes(enemyIdentifier) || false,
                isBoss: currentMap.value?.bossEnemies?.includes(enemyIdentifier) || false,
            };
        })
        .filter((enemy): enemy is NonNullable<typeof enemy> => enemy !== null)
        .sort((a, b) => a.id - b.id);

    if (invalidEnemies.length > 0 && isSystemAdmin.value) {
        window.wiz.$message.warning(`地图"${currentMap.value.name}"中存在无效的敌人数据：${invalidEnemies.join(', ')}`);
    }

    return result;
});

const mapRelics = computed(() => {
    if (!currentMap.value?.enemies) return [];

    // 获取地图中所有敌人
    const mapEnemyIdentifiers = currentMap.value.enemies;
    const backEnemies = currentMap.value.backEnemies || [];

    // 过滤出这些敌人掉落的遗物（排除不会掉落遗物的敌人）
    const enemyRelics = mapEnemyIdentifiers
        .filter((enemyIdentifier) => !backEnemies.includes(enemyIdentifier))
        .map((enemyIdentifier) => {
            // 尝试通过ID或名称查找敌人
            let monster;
            if (!isNaN(Number(enemyIdentifier))) {
                // 如果是数字，尝试通过ID查找
                const enemyId = Number(enemyIdentifier);
                monster = monsters.value.find((m) => m.id === enemyId);
            } else {
                // 否则通过名称查找
                monster = monsters.value.find((m) => m.name === enemyIdentifier);
            }
            return monster?.relic || null;
        })
        .filter((relic): relic is string => relic !== null && relic !== undefined);

    // 从遗物酒数据中找到对应的遗物
    const relicSet = new Set(enemyRelics);

    return relicBrews.value
        .filter((relic) => relicSet.has(relic.name))
        .map((relic) => ({
            relic: relic as RelicBrew,
            name: relic.name,
            align: relic.align,
            inc: relic.inc,
            dec: relic.dec,
        }))
        .sort((a, b) => a.relic.index - b.relic.index);
});

const formatComment = (comment: string) => convertDescription(comment);
</script>

<style scoped></style>
