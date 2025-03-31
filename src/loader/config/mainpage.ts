import MainPage from '@/views/mainpage/MainPage.vue';
import NavTab from '@/views/mainpage/NavTab.vue';
import type { LoaderConfig } from '../loaderConfig.type';
import { checkPageType } from '../util';

/** 首页 */
const config: LoaderConfig = {
    isEnabled: () => checkPageType('MainPage'),
    components: [
        {
            selector: '#mainpage-nav',
            type: 'before',
            targetSelector: '#wiki-body',
            app: NavTab,
        },
        {
            selector: '#mainpage-searcher',
            type: 'prepend',
            targetSelector: '.mw-parser-output',
            app: MainPage,
        },
    ],
};

export default config;
