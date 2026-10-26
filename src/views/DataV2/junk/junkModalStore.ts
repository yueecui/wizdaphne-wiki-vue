import { defineStore } from 'pinia';
import { ref } from 'vue';
import { JunkItem } from './JunkItem';

/** V2 杂物模态框状态（与 V1 的 junkModalStore 完全独立） */
export const useJunkModalStore = defineStore('junkModal-v2', () => {
    const showModal = ref(false);
    const currentJunk = ref<JunkItem | null>(null);

    const openModal = (junk: JunkItem) => {
        currentJunk.value = junk;
        showModal.value = true;
    };

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
