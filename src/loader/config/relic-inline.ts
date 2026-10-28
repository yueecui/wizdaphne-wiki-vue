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
                // 有 ID 优先按 ID 定位，名字只负责脚本加载前显示
                const relicId = element.getAttribute('data-id');
                return { relicName, relicId };
            },
            app: () => import('../../components/RelicInline.vue'),
        },
    ],
};

export default config;