import DataSearcher from '@/views/DataSearcher/DataSearcher.vue';
import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 首页 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#data-searcher'),
    components: [
        {
            selector: '#data-searcher',
            type: 'exist',
            app: DataSearcher,
        },
    ],
};

export default config;
