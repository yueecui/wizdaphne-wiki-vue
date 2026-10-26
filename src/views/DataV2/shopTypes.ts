/** 商店（`Api/GetV2Shop`）的数据形状；字段与 `src/api/dbCodec.ts` 的 `SHOP_FIELDS` 对应 */

export interface ShopItemRow {
    /** `Shop.id`（原始商品行 id） */
    shop_id?: number;
    name?: string;
    /** `Item::Junk` / `Equip::Equipment` / `Point::Gold` … */
    content_type?: string;
    content_id?: number;
    /** 装备商品：`content_id` 是档位行 id，这里是装备 identification（弹窗用） */
    content_ident?: number;
    icon?: string;
    price?: number;
    /** 支付方式枚举：1 金币 / 2 无偿宝石 / 3 有偿宝石 / 4 直购 / 5 兑换点数 */
    currency?: number;
    currency_name?: string;
    quantity?: number;
    limit_kind?: number;
    limit_num?: number;
    repeat?: boolean;
    /** 进度解锁条件 id（0 = 无条件） */
    condition?: number;
}

export interface ShopDoc {
    id: number;
    /** `shop_kind-town-pointShopId`，便于人工对照 */
    key?: string;
    /** 一级分类：1 常驻商店 / 2 活动商店 */
    group?: number;
    group_name?: string;
    /** 1 金币商店 / 2 宝石商 / 3 黒樽亭 / 4 银鳞伯爵府 */
    kind?: number;
    kind_name?: string;
    town?: number;
    town_name?: string;
    point_shop_id?: number;
    point_shop_name?: string;
    point_id?: number;
    point_name?: string;
    start_at?: number;
    end_at?: number;
    /** 展示名（如「金币商店 · 全城镇通用」「宝石商 · 指南书库【第2编】」） */
    name?: string;
    count?: number;
    items?: ShopItemRow[];
}

