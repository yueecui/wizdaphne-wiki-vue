import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 杂物模态框全局组件 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.junk-inline') || hasHTMLElement('#data-searcher');
    },
    components: [
        {
            selector: '#junk-global-modal',
            type: 'append',
            targetSelector: 'body',
            useStore: true,
            app: () => import('../../components/JunkModal.vue'),
        },
    ],
};

export default config;
