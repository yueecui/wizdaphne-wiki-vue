import DropRecorderSPA from '../../views/GameTools/DropRecorderSPA.vue';
import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 首页 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#drop-recorder'),
    components: [
        {
            selector: '#drop-recorder',
            type: 'exist',
            app: DropRecorderSPA,
        },
    ],
};

export default config;
