import { defineStore } from 'pinia';
import { ref } from 'vue';

export const useUtilStore = defineStore('util', () => {
    // 全局计时器
    const currentTime = ref(Date.now());
    setInterval(() => {
        currentTime.value = Date.now();
    }, 1000);

    return {
        currentTime,
    };
});
