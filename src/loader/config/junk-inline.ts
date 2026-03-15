import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 杂物内联元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.junk-inline');
    },
    components: [
        {
            selector: '.junk-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const junkName = element.getAttribute('data-name');
                const junkHash = element.getAttribute('data-hash');
                return { junkName, junkHash };
            },
            app: () => import('../../components/JunkInline.vue'),
        },
    ],
};

export default config;
