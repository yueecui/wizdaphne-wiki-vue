import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 地图内联元素处理 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.map-inline');
    },
    components: [
        {
            selector: '.map-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                const mapName = element.getAttribute('data-name');
                // 获取原本内部的文本作为显示名称
                const showName = element.textContent?.trim() || mapName;
                // 有 ID 优先按 ID 定位（V2 里是地图层 id），名字只负责脚本加载前显示
                const mapId = element.getAttribute('data-id');
                return { mapName, showName, mapId };
            },
            app: () => import('../../components/MapInline.vue'),
        },
    ],
};

export default config;
