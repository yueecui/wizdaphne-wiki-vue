import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Map } from '../views/DataSearcher/Map/Map';
import { Monster } from '../views/DataSearcher/Monster/Monster';
import type { RelicBrew } from '../views/DataSearcher/RelicBrew/RelicBrew';

/** 模态框类型 */
type ModalType = 'monster' | 'map' | 'relic';

/** 历史记录项 */
interface HistoryItem {
    type: ModalType;
    data: Monster | Map | RelicBrew;
}

/** 敌人模态框状态管理 */
export const useMonsterModalStore = defineStore('monsterModal', () => {
    // ===== 敌人模态框状态 =====
    const showMonsterModal = ref(false);
    const currentMonster = ref<Monster | null>(null);

    // ===== 地图模态框状态 =====
    const showMapModal = ref(false);
    const currentMap = ref<Map | null>(null);

    // ===== 遗物模态框状态 =====
    const showRelicModal = ref(false);
    const currentRelic = ref<RelicBrew | null>(null);

    // ===== 历史记录 =====
    const modalHistory = ref<HistoryItem[]>([]);

    // ===== 辅助方法 =====
    // 保存当前模态框到历史记录
    const saveCurrentToHistory = () => {
        if (showMonsterModal.value && currentMonster.value) {
            modalHistory.value.push({
                type: 'monster',
                data: currentMonster.value,
            });
        } else if (showMapModal.value && currentMap.value) {
            modalHistory.value.push({
                type: 'map',
                data: currentMap.value,
            });
        } else if (showRelicModal.value && currentRelic.value) {
            modalHistory.value.push({
                type: 'relic',
                data: currentRelic.value,
            });
        }
    };

    // 关闭其他类型的模态框
    const closeOtherModals = (currentType: ModalType) => {
        if (currentType !== 'monster' && showMonsterModal.value) {
            showMonsterModal.value = false;
            setTimeout(() => {
                currentMonster.value = null;
            }, 300);
        }
        if (currentType !== 'map' && showMapModal.value) {
            showMapModal.value = false;
            setTimeout(() => {
                currentMap.value = null;
            }, 300);
        }
        if (currentType !== 'relic' && showRelicModal.value) {
            showRelicModal.value = false;
            setTimeout(() => {
                currentRelic.value = null;
            }, 300);
        }
    };

    // 从历史记录中恢复上一个模态框
    const restoreFromHistory = () => {
        const lastItem = modalHistory.value.pop();
        if (!lastItem) return;

        if (lastItem.type === 'monster') {
            currentMonster.value = lastItem.data as Monster;
            showMonsterModal.value = true;
        } else if (lastItem.type === 'map') {
            currentMap.value = lastItem.data as Map;
            showMapModal.value = true;
        } else if (lastItem.type === 'relic') {
            currentRelic.value = lastItem.data as RelicBrew;
            showRelicModal.value = true;
        }
    };

    // ===== 敌人模态框方法 =====
    const openMonsterModal = (monster: Monster) => {
        // 保存当前状态到历史记录
        saveCurrentToHistory();

        // 关闭其他类型的模态框
        closeOtherModals('monster');

        currentMonster.value = monster;
        showMonsterModal.value = true;
    };

    const closeMonsterModal = () => {
        showMonsterModal.value = false;
        setTimeout(() => {
            currentMonster.value = null;
        }, 300);
        // 恢复上一个模态框
        restoreFromHistory();
    };

    // ===== 地图模态框方法 =====
    const openMapModal = (map: Map) => {
        // 保存当前状态到历史记录
        saveCurrentToHistory();

        // 关闭其他类型的模态框
        closeOtherModals('map');

        currentMap.value = map;
        showMapModal.value = true;
    };

    const closeMapModal = () => {
        showMapModal.value = false;
        setTimeout(() => {
            currentMap.value = null;
        }, 300);
        // 恢复上一个模态框
        restoreFromHistory();
    };

    // ===== 遗物模态框方法 =====
    const openRelicModal = (relic: RelicBrew) => {
        // 保存当前状态到历史记录
        saveCurrentToHistory();

        // 关闭其他类型的模态框
        closeOtherModals('relic');

        currentRelic.value = relic;
        showRelicModal.value = true;
    };

    const closeRelicModal = () => {
        showRelicModal.value = false;
        setTimeout(() => {
            currentRelic.value = null;
        }, 300);
        // 恢复上一个模态框
        restoreFromHistory();
    };

    // ===== 清空历史记录 =====
    const clearHistory = () => {
        modalHistory.value = [];
    };

    return {
        // 敌人模态框
        showMonsterModal,
        currentMonster,
        openMonsterModal,
        closeMonsterModal,
        // 地图模态框
        showMapModal,
        currentMap,
        openMapModal,
        closeMapModal,
        // 遗物模态框
        showRelicModal,
        currentRelic,
        openRelicModal,
        closeRelicModal,
        // 历史记录
        modalHistory,
        clearHistory,
    };
});
