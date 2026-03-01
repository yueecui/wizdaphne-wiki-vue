import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 角色模态框全局组件 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.character-inline') !== null || hasHTMLElement('.character-item') !== null;
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
