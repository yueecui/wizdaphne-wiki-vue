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
                // 有 ID 优先按 ID 定位，名字只负责脚本加载前显示
                const monsterId = element.getAttribute('data-id');
                // 自定义样式类：有值时默认的蓝色（普通 / hover）都不生效
                const customClass = element.getAttribute('data-class') ?? undefined;
                return { monsterName, monsterId, customClass };
            },
            app: () => import('../../components/MonsterInline.vue'),
        },
    ],
};

export default config;