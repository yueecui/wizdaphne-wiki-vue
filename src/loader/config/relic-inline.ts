import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 遗物内联元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.relic-inline');
    },
    components: [
        {
            selector: '.relic-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const relicName = element.getAttribute('data-name');
                return { relicName };
            },
            app: () => import('../../components/RelicInline.vue'),
        },
    ],
};

export default config;