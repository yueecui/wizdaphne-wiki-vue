import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/**
 * wiki 角色页「技能概览」区块（旧模板 `{{角色基本信息}}` 里的技能表）。
 *
 * 挂载点：`#character-skills-v2`，放在 `==技能详情==` 标题下一行，
 * 页面上写成 `<div id="character-skills-v2" data-name="{{PAGENAME}}"></div>`。
 * 技能名可点击，走全局 `InlineModalHost` 打开 `SkillModal`。
 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#character-skills-v2'),
    components: [
        {
            selector: '#character-skills-v2',
            type: 'exist',
            getParams: (element) => ({
                characterName: element.getAttribute('data-name')?.trim() ?? '',
                characterId: element.getAttribute('data-id')?.trim() ?? '',
            }),
            app: () => import('../../components/CharacterSkillsInline.vue'),
        },
    ],
};

export default config;
