import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 首页 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#data-searcher'),
    components: [
        {
            selector: '#data-searcher',
            type: 'exist',
            app: () => import('@/views/DataSearcher/DataSearcher.vue'),
        },
    ],
};

export default config;
