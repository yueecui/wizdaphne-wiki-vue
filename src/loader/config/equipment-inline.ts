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
                // 有 ID 优先按 ID 定位，名字只负责脚本加载前显示
                const equipmentId = element.getAttribute('data-id');
                return { equipmentName, equipmentId };
            },
            app: () => import('../../components/EquipmentInline.vue'),
        },
    ],
};

export default config;
