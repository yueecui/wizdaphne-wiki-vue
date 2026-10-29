import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/**
 * wiki 角色页「基本信息」区块（旧模板 `{{角色基本信息}}` 里的右浮动信息框）。
 *
 * 挂载点：`#character-profile-v2`，页面上写成
 * `<div id="character-profile-v2" data-name="{{PAGENAME}}"></div>`。
 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#character-profile-v2'),
    components: [
        {
            selector: '#character-profile-v2',
            type: 'exist',
            getParams: (element) => ({
                characterName: element.getAttribute('data-name')?.trim() ?? '',
                characterId: element.getAttribute('data-id')?.trim() ?? '',
            }),
            app: () => import('../../components/CharacterProfileInline.vue'),
        },
    ],
};

export default config;
