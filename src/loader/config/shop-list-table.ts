import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/** 商店列表（`{{商店列表|标题|店铺ID}}`）：商品表直接渲染在元素位置 */
const config: LoaderConfig = {
    isEnabled: () => {
        return hasHTMLElement('.shop-list-table');
    },
    components: [
        {
            selector: '.shop-list-table',
            type: 'multiple',
            useStore: true,
            getParams: (element) => {
                // `data-name` 可选：编辑者自定义抬头；没写就用商品表自带的抬头
                const shopName = element.getAttribute('data-name');
                const shopId = element.getAttribute('data-id');
                const customClass = element.getAttribute('data-class') ?? undefined;
                return { shopName, shopId, customClass };
            },
            app: () => import('../../components/ShopListTable.vue'),
        },
    ],
};

export default config;
