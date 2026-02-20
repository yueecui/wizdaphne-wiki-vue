import type { LoaderConfig } from '../loaderConfig.type';

/** 角色项元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return document.querySelector('.character-item') !== null;
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
