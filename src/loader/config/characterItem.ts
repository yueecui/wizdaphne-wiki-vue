import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 角色项元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.character-item') !== null;
    },
    components: [
        {
            selector: '.character-item',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const characterName = element.getAttribute('data-name');
                return { characterName };
            },
            app: () => import('../../components/CharacterItemLoader.vue'),
        },
    ],
};

export default config;
