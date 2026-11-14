import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 商店内联链接（`{{商店|展示名|店铺ID}}`）：点击打开商店弹窗 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.shop-inline');
    },
    components: [
        {
            selector: '.shop-inline',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                // `data-name` 是编辑者自定义的显示文字；没有就用数据里的店名
                const shopName = element.getAttribute('data-name');
                const shopId = element.getAttribute('data-id');
                // 自定义样式类：有值时默认的蓝色（普通 / hover）都不生效
                const customClass = element.getAttribute('data-class') ?? undefined;
                return { shopName, shopId, customClass };
            },
            app: () => import('../../components/ShopInline.vue'),
        },
    ],
};

export default config;
