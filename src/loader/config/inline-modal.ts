import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 正文里通过内联组件打开的 V2 modal 都挂在同一个宿主上 */
const INLINE_SELECTORS = [
    '.item-inline',
    '.equipment-inline',
    '.monster-inline',
    '.relic-inline',
    '.skill-inline',
    '.junk-inline',
    '.map-inline',
    '.character-inline',
    // 正文里的角色卡（角色列表用的就是它）
    '.character-item',
    // wiki 角色页的 Vue 区块：技能概览要点击打开技能 modal
    '#character-profile-v2',
    '#character-skills-v2',
    '#character-dialogue-v2',
];

/**
 * 内联组件全局 modal 宿主（V2）。
 *
 * `#data-searcher` 也要挂：V1 的地图弹窗里直接用了 `EquipmentInline` / `JunkInline`。
 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#data-searcher') || INLINE_SELECTORS.some((selector) => hasHTMLElement(selector)),
    components: [
        {
            selector: '#inline-global-modal',
            type: 'append',
            targetSelector: 'body',
            useStore: true,
            app: () => import('../../components/InlineModalHost.vue'),
        },
    ],
};

export default config;
