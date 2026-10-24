import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/**
 * 解包数据查询（v2）。
 *
 * 与旧的 `#data-searcher` 完全独立：挂载点是 `#data-searcher-v2`。
 * 数据来自 Wiki 模块 `Api/GetV2Character|GetV2Job|GetV2Skill|GetV2Enum`（开发环境读
 * `public/mock/*Response.json`），短键解码后缓存到 IndexedDB，
 * 不读取也不修改手工维护的 `public/data.json`。
 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#data-searcher-v2'),
    components: [
        {
            selector: '#data-searcher-v2',
            type: 'exist',
            app: () => import('@/views/DataV2/DataV2.vue'),
        },
    ],
};

export default config;
