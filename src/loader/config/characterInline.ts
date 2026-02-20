import type { LoaderConfig } from '../loaderConfig.type';

/** 角色内联元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return document.querySelector('.character-inline') !== null;
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
