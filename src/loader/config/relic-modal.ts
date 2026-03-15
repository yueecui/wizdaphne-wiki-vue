import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 遗物模态框全局组件 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.relic-inline') || hasHTMLElement('#data-searcher');
    },
    components: [
        {
            selector: '#relic-global-modal',
            type: 'append',
            targetSelector: 'body',
            useStore: true,
            app: () => import('../../components/RelicModal.vue'),
        },
    ],
};

export default config;
