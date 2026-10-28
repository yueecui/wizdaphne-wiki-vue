import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 敌人模态框全局组件 */
const config: LoaderConfig = {
    // 正文里的 `.monster-inline` 已改走 V2 的 `inline-modal.ts`，这里只服务 V1 查询页
    isEnabled: () => hasHTMLElement('#data-searcher'),
    components: [
        {
            selector: '#monster-global-modal',
            type: 'append',
            targetSelector: 'body',
            useStore: true,
            app: () => import('../../components/MonsterModal.vue'),
        },
    ],
};

export default config;
