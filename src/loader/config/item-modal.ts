import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 物品模态框全局组件 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.item-inline') || hasHTMLElement('#data-searcher');
    },
    components: [
        {
            selector: '#item-global-modal',
            type: 'append',
            targetSelector: 'body',
            useStore: true,
            app: () => import('../../components/ItemModal.vue'),
        },
    ],
};

export default config;
