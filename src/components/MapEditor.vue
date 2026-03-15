<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
        <div v-if="map">
            <div class="text-lg text-light font-bold mb-4">编辑地图信息</div>

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
                            <div>{{ enemy.id }}: {{ enemy.name }}</div>
                            <div class="flex items-center gap-2">
                                <NCheckbox v-model:checked="enemy.noRelic" class="mr-2">不掉落遗物</NCheckbox>
                                <NButton size="small" type="error" @click="removeEnemy(index)">删除</NButton>
                            </div>
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
import { NButton, NCheckbox, NInput, NSelect } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, onMounted, ref } from 'vue';
import { edit } from '../api/editPage';
import { getPageRawByTitle } from '../api/getPageRaw';
import { IS_DEV } from '../util/index';
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

const map = ref<any>(null);
const comment = ref('');
const enemies = ref<Array<{ id: string; name: string; noRelic: boolean }>>([]);
const selectedMonster = ref<string>('');
const isSubmitting = ref(false);

const loadMapData = () => {
    const mapData = monsterStore.maps.find((m) => m.index.toString() === props.mapIndex);
    if (mapData) {
        map.value = mapData;
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
                        noRelic: mapData.noRelicEnemies?.includes(enemyIdentifier) || false,
                    };
                })
                .filter((e) => e.name !== '？？？？')
                .sort((a, b) => Number(a.id) - Number(b.id));
        }
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
                noRelic: false,
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
        const data = await getPageRawByTitle<any>('Data:Map.tabx', true);
        return data;
    } catch (error) {
        console.error('获取wiki数据失败:', error);
        window.wiz.$message.error('获取wiki数据失败');
        return null;
    }
};

const mergeData = (
    wikiData: any,
    mapIndex: string,
    newComment: string,
    newEnemies: Array<{ id: string; name: string; noRelic: boolean }>,
) => {
    if (!wikiData || !Array.isArray(wikiData.data)) {
        return wikiData;
    }

    const mergedData = [...wikiData.data];
    const index = mergedData.findIndex((record: any[]) => record[0].toString() === mapIndex);

    if (index !== -1) {
        // 更新备注
        mergedData[index][8] = newComment || null;

        // 更新敌人列表（使用ID）
        const enemyIds = newEnemies.map((e) => e.id);
        mergedData[index][6] = enemyIds.length > 0 ? enemyIds.join(';') : null;

        // 更新不掉落遗物的敌人列表（使用ID）
        const noRelicEnemyIds = newEnemies.filter((e) => e.noRelic).map((e) => e.id);
        mergedData[index][7] = noRelicEnemyIds.length > 0 ? noRelicEnemyIds.join(';') : null;
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
            comment: comment.value,
            enemies: enemies.value,
        });
        return;
    }

    isSubmitting.value = true;
    try {
        const wikiData = await fetchWikiData();
        if (!wikiData) {
            return;
        }

        const mergedData = mergeData(wikiData, props.mapIndex, comment.value, enemies.value);

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
        map.value.comment = comment.value;
        map.value.enemies = enemies.value.map((e) => e.id);
        map.value.noRelicEnemies = enemies.value.filter((e) => e.noRelic).map((e) => e.id);

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
});
</script>
