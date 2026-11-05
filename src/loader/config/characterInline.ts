import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 角色内联元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.character-inline');
    },
    components: [
        {
            selector: '.character-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const characterName = element.getAttribute('data-name');
                // 有 ID 优先按 ID 定位，名字只负责脚本加载前显示
                const characterId = element.getAttribute('data-id');
                // 自定义样式类：有值时默认的蓝色（普通 / hover）都不生效
                const customClass = element.getAttribute('data-class') ?? undefined;
                return { characterName, characterId, customClass };
            },
            app: () => import('../../components/CharacterInline.vue'),
        },
    ],
};

export default config;
