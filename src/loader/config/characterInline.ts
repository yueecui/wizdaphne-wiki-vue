import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 角色内联元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.character-inline') !== null;
    },
    components: [
        {
            selector: '.character-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const characterName = element.getAttribute('data-name');
                return { characterName };
            },
            app: () => import('../../components/CharacterInline.vue'),
        },
    ],
};

export default config;
