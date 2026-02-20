import { defineStore } from 'pinia';
import { ref } from 'vue';
import { Character } from '../views/DataSearcher/Character/Character';

/** 角色模态框状态管理 */
export const useCharacterModalStore = defineStore('characterModal', () => {
    // 是否显示模态框
    const showModal = ref(false);
    
    // 当前显示的角色
    const currentCharacter = ref<Character | null>(null);
    
    // 打开模态框显示角色
    const openModal = (character: Character) => {
        currentCharacter.value = character;
        showModal.value = true;
    };
    
    // 关闭模态框
    const closeModal = () => {
        showModal.value = false;
        // 延迟清空角色数据，确保动画完成
        setTimeout(() => {
            currentCharacter.value = null;
        }, 300);
    };
    
    return {
        showModal,
        currentCharacter,
        openModal,
        closeModal
    };
});