import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Item } from '../views/DataSearcher/Item/Item';

/** 物品模态框状态管理 */
export const useItemModalStore = defineStore('itemModal', () => {
    // 是否显示模态框
    const showModal = ref(false);

    // 当前显示的物品
    const currentItem = ref<Item | null>(null);

    // 打开模态框显示物品
    const openModal = (item: Item) => {
        currentItem.value = item;
        showModal.value = true;
    };

    // 关闭模态框
    const closeModal = () => {
        showModal.value = false;
        // 延迟清空物品数据，确保动画完成
        setTimeout(() => {
            currentItem.value = null;
        }, 300);
    };

    return {
        showModal,
        currentItem,
        openModal,
        closeModal,
    };
});
