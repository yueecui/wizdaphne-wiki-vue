import { defineStore } from 'pinia';
import { ref } from 'vue';
import { JunkItem } from '../views/DataSearcher/Junk/JunkItem';

/** 杂物模态框状态管理 */
export const useJunkModalStore = defineStore('junkModal', () => {
    // 是否显示模态框
    const showModal = ref(false);

    // 当前显示的杂物
    const currentJunk = ref<JunkItem | null>(null);

    // 打开模态框显示杂物
    const openModal = (junk: JunkItem) => {
        currentJunk.value = junk;
        showModal.value = true;
    };

    // 关闭模态框
    const closeModal = () => {
        showModal.value = false;
        // 延迟清空杂物数据，确保动画完成
        setTimeout(() => {
            currentJunk.value = null;
        }, 300);
    };

    return {
        showModal,
        currentJunk,
        openModal,
        closeModal,
    };
});
