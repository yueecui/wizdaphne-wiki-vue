import GameTools from '../../views/GameTools/GameTools.vue';
import type { LoaderConfig } from '../loaderConfig.type';

/** 首页 */
const config: LoaderConfig = {
    isEnabled: () => true,
    components: [
        {
            selector: '#game-tools',
            type: 'append',
            targetSelector: '#wiki-outer-body',
            app: GameTools,
        },
    ],
};

export default config;
