import { defineStore } from 'pinia';
import { ref } from 'vue';
import { MwConfig } from '../types/global';

// 获取当前站点的信息
// 这里信息包括两个部分，一个部分是静态写死在mw.config中的
// 另外一个部分是根据需要动态通过接口获取的数据
// 均通过本对象进行管理和读取
export const useCurrentSiteStore = defineStore('currentSite', () => {
    const mwConfig = ref<MwConfig | null>(null);
    const mwConfigInit = ref(false);

    function initMwConfig() {
        if (mwConfigInit.value) return;
        if (window.mw) {
            mwConfig.value = window.mw.config.values;
        }
        mwConfigInit.value = true;
    }

    function getPrefix() {
        return mwConfig.value?.wgHuijiPrefix ?? '';
    }

    return {
        initMwConfig,
        getPrefix,
    };
});
