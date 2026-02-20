import type { LoaderConfig } from '../loaderConfig.type';

/** 角色模态框全局组件 */
const config: LoaderConfig = {
    isEnabled: () => {
        return (
            document.querySelector('.character-inline') !== null || document.querySelector('.character-item') !== null
        );
    },
    components: [
        {
            selector: '#character-global-modal',
            type: 'append',
            targetSelector: 'body',
            useStore: true,
            app: () => import('../../components/CharacterModal.vue'),
        },
    ],
};

export default config;
