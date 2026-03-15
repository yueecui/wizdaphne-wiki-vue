import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 物品内联元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.item-inline');
    },
    components: [
        {
            selector: '.item-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const itemName = element.getAttribute('data-name');
                return { itemName };
            },
            app: () => import('../../components/ItemInline.vue'),
        },
    ],
};

export default config;
