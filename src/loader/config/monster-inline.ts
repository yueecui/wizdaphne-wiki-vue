import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 敌人内联元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.monster-inline');
    },
    components: [
        {
            selector: '.monster-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const monsterName = element.getAttribute('data-name');
                return { monsterName };
            },
            app: () => import('../../components/MonsterInline.vue'),
        },
    ],
};

export default config;