<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
        <div v-if="map">
            <div class="text-lg text-light font-bold mb-4">编辑地图信息</div>

            <!-- 等级编辑 -->
            <div class="flex gap-4 mb-4">
                <div class="flex flex-col w-32">
                    <div class="text-sm text-gray-400 mb-2">最低等级</div>
                    <NInputNumber v-model:value="minLevel" :min="0" placeholder="最低等级" />
                </div>
                <div class="flex flex-col w-32">
                    <div class="text-sm text-gray-400 mb-2">最高等级</div>
                    <NInputNumber v-model:value="maxLevel" :min="0" placeholder="最高等级" />
                </div>
                <div class="flex flex-col w-32">
                    <div class="text-sm text-gray-400 mb-2">遗物等级</div>
                    <NInputNumber v-model:value="rlv" :min="0" placeholder="遗物等级" />
                </div>
            </div>

            <!-- 备注编辑 -->
            <div class="mb-4">
                <div class="text-sm text-gray-400 mb-2">备注</div>
                <NInput
                    v-model:value="comment"
                    type="textarea"
                    placeholder="输入备注"
                    :autosize="{ minRows: 5, maxRows: 5 }"
                />
            </div>

            <!-- 敌人列表编辑 -->
            <div class="mb-4">
                <div class="text-sm text-gray-400 mb-2">敌人列表</div>

                <!-- 添加敌人的下拉框 -->
                <div class="flex gap-2 mb-4">
                    <NSelect
                        v-model:value="selectedMonster"
                        :options="filteredMonsters"
                        :filterable="true"
                        placeholder="搜索敌人"
                        class="flex-1"
                    />
                    <NButton type="primary" @click="addEnemy" :disabled="!selectedMonster">添加</NButton>
                </div>

                <!-- 敌人列表 -->
                <div class="border border-[#463d38] rounded">
                    <div v-if="enemies.length === 0" class="p-4 text-center text-gray-400">暂无敌人，请添加</div>
                    <div v-else class="max-h-[300px] overflow-y-auto">
                        <div
                            v-for="(enemy, index) in enemies"
                            :key="enemy.id"
                            class="flex items-center justify-between p-2 hover:bg-[#3a312a] border-b border-[#463d38]"
                        >
                            <div class="flex items-center gap-2">
                                <span>{{ enemy.id }}: {{ enemy.name }}</span>
                            </div>
                            <div class="flex items-center gap-2">
                                <NCheckbox v-model:checked="enemy.back">后排</NCheckbox>
                                <NCheckbox v-model:checked="enemy.rLvPlus1">遗+1</NCheckbox>
                                <NCheckbox v-model:checked="enemy.rLvPlus2">遗+2</NCheckbox>
                                <NCheckbox v-model:checked="enemy.boss">定点</NCheckbox>
                                <NButton size="small" type="error" @click="removeEnemy(index)">删除</NButton>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 特殊掉落编辑 -->
            <div class="mb-4">
                <div class="text-sm text-gray-400 mb-2">特殊掉落</div>

                <!-- 添加装备的下拉框 -->
                <div class="flex gap-2 mb-4">
                    <NSelect
                        v-model:value="selectedSpecialDrop"
                        :options="filteredEquipments"
                        :filterable="true"
                        placeholder="搜索装备"
                        class="flex-1"
                    />
                    <NButton type="primary" @click="addSpecialDrop" :disabled="!selectedSpecialDrop">添加</NButton>
                </div>

                <!-- 特殊掉落列表 -->
                <div class="border border-[#463d38] rounded">
                    <div v-if="specialDrops.length === 0" class="p-4 text-center text-gray-400">
                        暂无特殊掉落，请添加
                    </div>
                    <div v-else class="max-h-[200px] overflow-y-auto">
                        <div
                            v-for="(drop, index) in specialDrops"
                            :key="index"
                            class="flex items-center justify-between p-2 hover:bg-[#3a312a] border-b border-[#463d38]"
                        >
                            <div class="flex items-center gap-2">
                                <NButton size="small" :disabled="index === 0" @click="moveSpecialDrop(index, -1)">
                                    ↑
                                </NButton>
                                <NButton
                                    size="small"
                                    :disabled="index === specialDrops.length - 1"
                                    @click="moveSpecialDrop(index, 1)"
                                >
                                    ↓
                                </NButton>
                                <span>{{ drop }}</span>
                            </div>
                            <NButton size="small" type="error" @click="removeSpecialDrop(index)">删除</NButton>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 特色杂物编辑 -->
            <div class="mb-4">
                <div class="text-sm text-gray-400 mb-2">特色杂物</div>

                <!-- 添加杂物的下拉框 -->
                <div class="flex gap-2 mb-4">
                    <NSelect
                        v-model:value="selectedJunk"
                        :options="filteredJunks"
                        :filterable="true"
                        placeholder="搜索杂物"
                        class="flex-1"
                    />
                    <NButton type="primary" @click="addFeaturedJunk" :disabled="!selectedJunk">添加</NButton>
                </div>

                <!-- 特色杂物列表 -->
                <div class="border border-[#463d38] rounded">
                    <div v-if="featuredJunks.length === 0" class="p-4 text-center text-gray-400">
                        暂无特色杂物，请添加
                    </div>
                    <div v-else class="max-h-[200px] overflow-y-auto">
                        <div
                            v-for="(junk, index) in featuredJunks"
                            :key="index"
                            class="flex items-center justify-between p-2 hover:bg-[#3a312a] border-b border-[#463d38]"
                        >
                            <div class="flex items-center gap-2">
                                <NButton size="small" :disabled="index === 0" @click="moveFeaturedJunk(index, -1)">
                                    ↑
                                </NButton>
                                <NButton
                                    size="small"
                                    :disabled="index === featuredJunks.length - 1"
                                    @click="moveFeaturedJunk(index, 1)"
                                >
                                    ↓
                                </NButton>
                                <span>{{ junk.name }} [{{ junk.uniqueCode }}]</span>
                            </div>
                            <NButton size="small" type="error" @click="removeFeaturedJunk(index)">删除</NButton>
                        </div>
                    </div>
                </div>
            </div>

            <div class="flex justify-end gap-2 mt-4">
                <NButton size="small" type="default" @click="handleCancel">取消</NButton>
                <NButton size="small" type="primary" @click="handleSave" :loading="isSubmitting">保存</NButton>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { NButton, NCheckbox, NInput, NInputNumber, NSelect } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { edit } from '../api/editPage';
import { getPageRawByTitle } from '../api/getPageRaw';
import { IS_DEV } from '../util/index';
import { getFieldIndex, type TabxSchema } from '../util/tabxUtils';
import { useEquipmentStore } from '../views/DataSearcher/Equipment/equipmentStore';
import { useJunkStore } from '../views/DataSearcher/Junk/junkStore';
import type { GameMap } from '../views/DataSearcher/Map/Map';
import type { Monster } from '../views/DataSearcher/Monster/Monster';
import { useMonsterStore } from '../views/DataSearcher/Monster/monsterStore';

const emit = defineEmits<{
    cancel: [];
    submit: [];
}>();

const props = defineProps<{
    mapIndex: string;
}>();

const monsterStore = useMonsterStore();
const { monsters } = storeToRefs(monsterStore);

const equipmentStore = useEquipmentStore();
const junkStore = useJunkStore();

const map = ref<GameMap | null>(null);
const minLevel = ref<number>(0);
const maxLevel = ref<number>(0);
const rlv = ref<number>(0);
const comment = ref('');
const enemies = ref<
    Array<{ id: string; name: string; back: boolean; rLvPlus1: boolean; rLvPlus2: boolean; boss: boolean }>
>([]);
const selectedMonster = ref<string>('');
const specialDrops = ref<string[]>([]);
const selectedSpecialDrop = ref<string>('');
const featuredJunks = ref<Array<{ name: string; uniqueCode: string }>>([]);
const selectedJunk = ref<string>('');
const isSubmitting = ref(false);

// 过滤装备列表（排除已添加的特殊掉落）
const filteredEquipments = computed(() => {
    const addedDrops = specialDrops.value;
    return equipmentStore.equipments
        .filter((e) => !addedDrops.includes(e.data.n))
        .map((e) => ({
            label: e.data.n,
            value: e.data.n,
        }));
});

// 过滤杂物列表（排除已添加的特色杂物，只显示可获取的）
const filteredJunks = computed(() => {
    const addedJunkCodes = featuredJunks.value.map((j) => j.uniqueCode);
    return junkStore.junkItems
        .filter((j) => !addedJunkCodes.includes(j.uniqueCode) && !j.notObt)
        .map((j) => ({
            label: `${j.name} [${j.uniqueCode}]`,
            value: j.uniqueCode,
        }));
});

const loadMapData = () => {
    const mapData = monsterStore.maps.find((m) => m.index.toString() === props.mapIndex);
    if (mapData) {
        map.value = mapData;
        minLevel.value = mapData.minLv || 0;
        maxLevel.value = mapData.maxLv || 0;
        rlv.value = mapData.rlv || 0;
        comment.value = mapData.comment || '';

        // 初始化敌人列表
        if (mapData.enemies) {
            enemies.value = mapData.enemies
                .map((enemyIdentifier: string) => {
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

                    return {
                        id: monster?.id.toString() || enemyIdentifier,
                        name: monster?.name || enemyIdentifier,
                        back: mapData.backEnemies?.includes(enemyIdentifier) || false,
                        rLvPlus1: mapData.rLvPlus1Enemies?.includes(enemyIdentifier) || false,
                        rLvPlus2: mapData.rLvPlus2Enemies?.includes(enemyIdentifier) || false,
                        boss: mapData.bossEnemies?.includes(enemyIdentifier) || false,
                    };
                })
                .filter((e) => e.name !== '？？？？')
                .sort((a, b) => Number(a.id) - Number(b.id));
        }

        // 初始化特殊掉落列表
        if (mapData.drops) {
            specialDrops.value = [...mapData.drops];
        }

        // 初始化特色杂物列表
        if (mapData.junk && mapData.junkCodes) {
            featuredJunks.value = mapData.junk.map((name: string, index: number) => ({
                name: name,
                uniqueCode: mapData.junkCodes[index] || '',
            }));
        }
    }
};

const addSpecialDrop = () => {
    if (selectedSpecialDrop.value && !specialDrops.value.includes(selectedSpecialDrop.value)) {
        specialDrops.value.push(selectedSpecialDrop.value);
        selectedSpecialDrop.value = '';
    }
};

const removeSpecialDrop = (index: number) => {
    specialDrops.value.splice(index, 1);
};

const moveSpecialDrop = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < specialDrops.value.length) {
        const temp = specialDrops.value[index];
        specialDrops.value[index] = specialDrops.value[newIndex];
        specialDrops.value[newIndex] = temp;
    }
};

const addFeaturedJunk = () => {
    if (selectedJunk.value && !featuredJunks.value.some((j) => j.uniqueCode === selectedJunk.value)) {
        const junkItem = junkStore.junkItems.find((j) => j.uniqueCode === selectedJunk.value);
        if (junkItem) {
            featuredJunks.value.push({
                name: junkItem.name,
                uniqueCode: junkItem.uniqueCode,
            });
            selectedJunk.value = '';
        }
    }
};

const removeFeaturedJunk = (index: number) => {
    featuredJunks.value.splice(index, 1);
};

const moveFeaturedJunk = (index: number, direction: number) => {
    const newIndex = index + direction;
    if (newIndex >= 0 && newIndex < featuredJunks.value.length) {
        const temp = featuredJunks.value[index];
        featuredJunks.value[index] = featuredJunks.value[newIndex];
        featuredJunks.value[newIndex] = temp;
    }
};

// 过滤怪物列表（排除已添加的敌人和名字为「？？？？」的敌人）
const filteredMonsters = computed(() => {
    const addedEnemyIds = enemies.value.map((e) => e.id);
    return monsters.value
        .filter((m) => !addedEnemyIds.includes(m.id.toString()) && m.name !== '？？？？')
        .sort((a, b) => a.id - b.id)
        .map((m) => ({
            label: `${m.id}: ${m.name}`,
            value: m.id.toString(),
        }));
});

const addEnemy = () => {
    if (selectedMonster.value && !enemies.value.some((e) => e.id === selectedMonster.value)) {
        const enemyId = Number(selectedMonster.value);
        const monster = monsters.value.find((m) => m.id === enemyId);
        if (monster) {
            enemies.value.push({
                id: monster.id.toString(),
                name: monster.name,
                back: false,
                rLvPlus1: false,
                rLvPlus2: false,
                boss: false,
            });
            // 按ID排序
            enemies.value.sort((a, b) => Number(a.id) - Number(b.id));
            selectedMonster.value = '';
        }
    }
};

const removeEnemy = (index: number) => {
    enemies.value.splice(index, 1);
};

const fetchWikiData = async () => {
    try {
        const data = await getPageRawByTitle<TabxSchema>('Data:Map.tabx', true);
        return data;
    } catch (error) {
        console.error('获取wiki数据失败:', error);
        window.wiz.$message.error('获取wiki数据失败');
        return null;
    }
};

const mergeData = (
    wikiData: TabxSchema,
    mapIndex: string,
    newMinLevel: number,
    newMaxLevel: number,
    newRlv: number,
    newComment: string,
    newEnemies: Array<{ id: string; name: string; back: boolean; rLvPlus1: boolean; rLvPlus2: boolean; boss: boolean }>,
    newDrops: string[],
    newJunks: Array<{ name: string; uniqueCode: string }>,
) => {
    if (!wikiData || !Array.isArray(wikiData.data)) {
        return wikiData;
    }

    // 动态获取字段索引
    const minLvIndex = getFieldIndex(wikiData, 'min_lv');
    const maxLvIndex = getFieldIndex(wikiData, 'max_lv');
    const rlvIndex = getFieldIndex(wikiData, 'rlv');
    const commentIndex = getFieldIndex(wikiData, 'comment');
    const enemyIndex = getFieldIndex(wikiData, 'enemy');
    const backEnemyIndex = getFieldIndex(wikiData, 'back');
    const rLvPlus1EnemyIndex = getFieldIndex(wikiData, 'rlv1');
    const rLvPlus2EnemyIndex = getFieldIndex(wikiData, 'rlv2');
    const bossEnemyIndex = getFieldIndex(wikiData, 'boss');
    const dropIndex = getFieldIndex(wikiData, 'drop');
    const junkIndex = getFieldIndex(wikiData, 'junk');
    const junkCodeIndex = getFieldIndex(wikiData, 'junk_code');

    const mergedData = [...wikiData.data];
    const index = mergedData.findIndex((record: any[]) => record[0].toString() === mapIndex);

    if (index !== -1) {
        // 更新最低等级
        if (minLvIndex !== -1) {
            mergedData[index][minLvIndex] = newMinLevel || null;
        }

        // 更新最高等级
        if (maxLvIndex !== -1) {
            mergedData[index][maxLvIndex] = newMaxLevel || null;
        }

        // 更新遗物等级
        if (rlvIndex !== -1) {
            mergedData[index][rlvIndex] = newRlv || null;
        }

        // 更新备注
        if (commentIndex !== -1) {
            mergedData[index][commentIndex] = newComment || null;
        }

        // 更新敌人列表（使用ID）
        if (enemyIndex !== -1) {
            const enemyIds = newEnemies.map((e) => e.id);
            mergedData[index][enemyIndex] = enemyIds.length > 0 ? enemyIds.join(';') : null;
        }

        // 更新不掉落遗物的敌人列表（使用ID）
        if (backEnemyIndex !== -1) {
            const backEnemyIds = newEnemies.filter((e) => e.back).map((e) => e.id);
            mergedData[index][backEnemyIndex] = backEnemyIds.length > 0 ? backEnemyIds.join(';') : null;
        }

        // 更新精英敌人列表（使用ID）
        if (rLvPlus1EnemyIndex !== -1) {
            const rLvPlus1EnemyIds = newEnemies.filter((e) => e.rLvPlus1).map((e) => e.id);
            mergedData[index][rLvPlus1EnemyIndex] = rLvPlus1EnemyIds.length > 0 ? rLvPlus1EnemyIds.join(';') : null;
        }

        // 更新精英敌人列表2（使用ID）
        if (rLvPlus2EnemyIndex !== -1) {
            const rLvPlus2EnemyIds = newEnemies.filter((e) => e.rLvPlus2).map((e) => e.id);
            mergedData[index][rLvPlus2EnemyIndex] = rLvPlus2EnemyIds.length > 0 ? rLvPlus2EnemyIds.join(';') : null;
        }

        // 更新boss敌人列表（使用ID）
        if (bossEnemyIndex !== -1) {
            const bossEnemyIds = newEnemies.filter((e) => e.boss).map((e) => e.id);
            mergedData[index][bossEnemyIndex] = bossEnemyIds.length > 0 ? bossEnemyIds.join(';') : null;
        }

        // 更新特殊掉落列表
        if (dropIndex !== -1) {
            mergedData[index][dropIndex] = newDrops.length > 0 ? newDrops.join(';') : null;
        }

        // 更新特色杂物列表
        if (junkIndex !== -1) {
            mergedData[index][junkIndex] = newJunks.length > 0 ? newJunks.map((j) => j.name).join(';') : null;
        }

        // 更新特色杂物代码列表
        if (junkCodeIndex !== -1) {
            mergedData[index][junkCodeIndex] = newJunks.length > 0 ? newJunks.map((j) => j.uniqueCode).join(';') : null;
        }
    }

    return {
        ...wikiData,
        data: mergedData,
    };
};

const handleSave = async () => {
    if (!map.value) return;

    if (IS_DEV) {
        console.log('提交的数据:', {
            mapIndex: props.mapIndex,
            minLevel: minLevel.value,
            maxLevel: maxLevel.value,
            rlv: rlv.value,
            comment: comment.value,
            enemies: enemies.value,
            drops: specialDrops.value,
            junks: featuredJunks.value,
        });
        return;
    }

    isSubmitting.value = true;
    try {
        const wikiData = await fetchWikiData();
        if (!wikiData) {
            return;
        }

        const mergedData = mergeData(
            wikiData,
            props.mapIndex,
            minLevel.value,
            maxLevel.value,
            rlv.value,
            comment.value,
            enemies.value,
            specialDrops.value,
            featuredJunks.value,
        );

        const jsonText = JSON.stringify(mergedData, null, 2);
        const response = await edit({
            title: 'Data:Map.tabx',
            text: jsonText,
            summary: `更新地图「${map.value.name}」的信息`,
            minor: false,
        });

        if ('error' in response) {
            console.error('提交失败:', response.error);
            window.wiz.$message.error(`提交失败: ${response.error.info}`);
            return;
        }

        // 更新本地数据
        map.value.minLv = minLevel.value;
        map.value.maxLv = maxLevel.value;
        map.value.rlv = rlv.value;
        map.value.comment = comment.value;
        map.value.enemies = enemies.value.map((e) => e.id);
        map.value.backEnemies = enemies.value.filter((e) => e.back).map((e) => e.id);
        map.value.rLvPlus1Enemies = enemies.value.filter((e) => e.rLvPlus1).map((e) => e.id);
        map.value.rLvPlus2Enemies = enemies.value.filter((e) => e.rLvPlus2).map((e) => e.id);
        map.value.bossEnemies = enemies.value.filter((e) => e.boss).map((e) => e.id);
        map.value.drops = [...specialDrops.value];
        map.value.setJunks(featuredJunks.value);

        window.wiz.$message.success('数据提交成功');
        emit('submit');
    } catch (error) {
        console.error('提交失败:', error);
        window.wiz.$message.error('提交失败');
    } finally {
        isSubmitting.value = false;
    }
};

const handleCancel = () => {
    emit('cancel');
};

onMounted(() => {
    loadMapData();
    junkStore.loadJunkData();
});
</script>
