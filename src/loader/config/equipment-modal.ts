import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 装备模态框全局组件 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.equipment-inline') !== null;
    },
    components: [
        {
            selector: '#equipment-global-modal',
            type: 'append',
            targetSelector: 'body',
            useStore: true,
            app: () => import('../../components/EquipmentModal.vue'),
        },
    ],
};

export default config;
