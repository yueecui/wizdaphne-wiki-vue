import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 杂物模态框全局组件 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.map-inline') || hasHTMLElement('#data-searcher');
    },
    components: [
        {
            selector: '#map-global-modal',
            type: 'append',
            targetSelector: 'body',
            useStore: true,
            app: () => import('../../components/MapModal.vue'),
        },
    ],
};

export default config;
