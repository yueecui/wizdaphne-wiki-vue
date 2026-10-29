import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/**
 * wiki 角色页「好感度对话」区块（旧模板 `{{好感对话}}`）。
 *
 * 挂载点：`#character-dialogue-v2`，页面上写成
 * `<div id="character-dialogue-v2" data-name="{{PAGENAME}}"></div>`。
 * 数据来自 `GetV2Character` 的 `dialogue`（营地 + 酒馆议题）。
 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#character-dialogue-v2'),
    components: [
        {
            selector: '#character-dialogue-v2',
            type: 'exist',
            getParams: (element) => ({
                characterName: element.getAttribute('data-name')?.trim() ?? '',
                characterId: element.getAttribute('data-id')?.trim() ?? '',
            }),
            app: () => import('../../components/CharacterDialogueInline.vue'),
        },
    ],
};

export default config;
