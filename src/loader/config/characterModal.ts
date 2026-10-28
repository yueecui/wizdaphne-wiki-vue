import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 角色模态框全局组件 */
const config: LoaderConfig = {
    // 正文里的角色卡 / 角色链接都已改走 V2 的 `inline-modal.ts`，这里只服务 V1 查询页
    isEnabled: () => hasHTMLElement('#data-searcher'),
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
