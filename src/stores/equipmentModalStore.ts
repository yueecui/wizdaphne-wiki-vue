import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Equipment } from '../views/DataSearcher/Equipment/Equipment';

/** 装备模态框状态管理 */
export const useEquipmentModalStore = defineStore('equipmentModal', () => {
    // 是否显示模态框
    const showModal = ref(false);

    // 当前显示的装备
    const currentEquipment = ref<Equipment | null>(null);

    // 打开模态框显示装备
    const openModal = (equipment: Equipment) => {
        currentEquipment.value = equipment;
        showModal.value = true;
    };

    // 关闭模态框
    const closeModal = () => {
        showModal.value = false;
        // 延迟清空装备数据，确保动画完成
        setTimeout(() => {
            currentEquipment.value = null;
        }, 300);
    };

    return {
        showModal,
        currentEquipment,
        openModal,
        closeModal,
    };
});
