import TalentContainer from '../../views/GameTools/Talent/TalentContainer.vue';
import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 首页 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#talent-tree'),
    components: [
        {
            selector: '#talent-tree',
            type: 'exist',
            app: TalentContainer,
        },
    ],
};

export default config;
