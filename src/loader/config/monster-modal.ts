import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 敌人模态框全局组件 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.monster-inline') || hasHTMLElement('#data-searcher');
    },
    components: [
        {
            selector: '#monster-global-modal',
            type: 'append',
            targetSelector: 'body',
            useStore: true,
            app: () => import('../../components/MonsterModal.vue'),
        },
    ],
};

export default config;
