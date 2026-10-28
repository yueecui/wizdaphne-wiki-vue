import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/**
 * 技能内联元素处理。
 *
 * 技能是 V2 新加的内联，重名很多：模板写成 `{{技能|名字|ID}}`，
 * 页面上输出 `data-name`（只用于显示）与 `data-id`（定位用）。
 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.skill-inline');
    },
    components: [
        {
            selector: '.skill-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const skillName = element.getAttribute('data-name');
                const skillId = element.getAttribute('data-id');
                return { skillName, skillId };
            },
            app: () => import('../../components/SkillInline.vue'),
        },
    ],
};

export default config;
