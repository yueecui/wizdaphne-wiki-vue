import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 装备内联元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.equipment-inline');
    },
    components: [
        {
            selector: '.equipment-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const equipmentName = element.getAttribute('data-name');
                return { equipmentName };
            },
            app: () => import('../../components/EquipmentInline.vue'),
        },
    ],
};

export default config;
