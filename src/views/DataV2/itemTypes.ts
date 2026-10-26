/** 道具（`Api/GetV2Item`）的数据形状；字段与 `src/api/dbCodec.ts` 的 `ITEM_FIELDS` 对应 */

export interface ItemShopRow {
    /** 商店展示名（`shop.py` 清洗后写入，如「银鳞伯爵府 · 奖赏品」） */
    shop_name?: string;
    /** 1 = 金币商店，2 = 宝石商，3 = 黒樽亭，4 = 银鳞伯爵府 */
    shop_kind?: number;
    price?: number;
    /** 支付方式枚举：1 金币 / 2 无偿宝石 / 3 有偿宝石 / 4 直购 / 5 兑换点数 */
    currency?: number;
    /** 支付方式名；兑换点数时是实际点数名（如「银鳞硬币」） */
    currency_name?: string;
    quantity?: number;
    /** 限购周期：0 = 不限购 */
    limit_kind?: number;
    limit_num?: number;
    repeat?: boolean;
    /** 进度解锁条件 id（0 = 无条件） */
    condition?: number;
    /** 0 = 所有城镇通用 */
    town?: number;
    point_shop_id?: number;
}

export interface ItemFishing {
    volume?: number;
    duration?: number;
    min_meet?: number;
    max_meet?: number;
    min_success?: number;
    max_success?: number;
}

export interface ItemRelic {
    grade?: number;
    rank?: number;
    alignment?: number;
    skill_id?: number;
}

/**
 * 图鉴条目引用（只有部分道具进图鉴）。
 * 只存条目 id 与编号；图鉴售价 / 说明 / 显示类型由图鉴模块提供，不在道具数据里重复。
 */
export interface ItemCollection {
    /** 图鉴内部 id */
    id?: number;
    /** 图鉴编号（`CollectionItem.list_number`） */
    no?: number;
}

/**
 * 杂物（`Item::Junk`）的二级分类。
 * 官方没有专门字段，按 `list_icon` 区分：`list_icon_bone` / `list_icon_Summoning_Scroll`
 * = 角色抽卡（骸骨 / 召唤卷轴），`list_icon_junk` = 装备抽卡（「××杂物」）。
 */
export type JunkGroup = '角色抽卡' | '装备抽卡' | '未分类';

/** 导航里展示的两个抽卡分类（`未分类` 只作为数据兜底值，不单独成页签） */
export const JUNK_GROUPS: JunkGroup[] = ['角色抽卡', '装备抽卡'];

/** 杂物分组在页面上的显示名（数据值仍是「角色抽卡 / 装备抽卡」） */
export const JUNK_GROUP_LABELS: Record<JunkGroup, string> = {
    角色抽卡: '骨头',
    装备抽卡: '杂物',
    未分类: '未分类',
};

/** 图鉴的四个分类 */
export type CollectionGroup = '出售' | '消耗品' | '贵重品' | '其他';

export const COLLECTION_GROUPS: CollectionGroup[] = ['出售', '消耗品', '贵重品', '其他'];

/**
 * 图鉴编号 5XX（500–599）在游戏里标注为 **EX**，并统一排在分类最后。
 * 与解包数据吻合：81 条 `display_type = 2` 的条目正好是 500–581。
 */
export const isCollectionEx = (no?: number) => typeof no === 'number' && no >= 500 && no <= 599;

/**
 * 还没归类的道具：不在图鉴四类里、不是两种抽卡杂物、也不属于下面按类型分的六组。
 * 「未分类」页签就是把这些挑出来，方便继续辨认。
 */
export const isUnclassifiedItem = (item: ItemDoc) =>
    !item.collection_group &&
    (!item.junk_group || item.junk_group === '未分类') &&
    itemGroupOf(item) === null;

/** 列表里的显示形式：5XX 一律显示 EX（真实编号在弹窗里看） */
export const formatCollectionNo = (no?: number) => {
    if (no == null) return '—';
    return isCollectionEx(no) ? 'EX' : String(no);
};

/** 描述片段：纯文本或游戏内图标 */
export type DescSegment = { type: 'text'; text: string } | { type: 'image'; name: string };

/** `[[页面|显示文字]]` / `[[页面]]` / `[icon=rankN]` */
const DESC_TOKEN = /\[\[([^\]|]+)\|([^\]]+)\]\]|\[\[([^\]]+)\]\]|\[icon=([a-zA-Z_]+)(\d+)\]/gi;

/**
 * 把说明文本拆成文本与图标片段：
 * - `[[页面|显示文字]]` → 显示文字
 * - `[icon=rankN]` → 游戏内的装备阶级图标 `Grade_info_iconN.png`
 *   （铁矿石的 `[icon=rank1]`～`[icon=rank5]` 表示 1～5 阶装备，不是星级）
 * - 其余方括号内容（`[Vol. II]`、`[売却専用]` 等）是正文，原样保留
 */
export const parseDescription = (text?: string): DescSegment[] => {
    if (!text) return [];
    const segments: DescSegment[] = [];
    const pushText = (value: string) => {
        if (!value) return;
        const last = segments[segments.length - 1];
        if (last?.type === 'text') last.text += value;
        else segments.push({ type: 'text', text: value });
    };

    let cursor = 0;
    for (const match of text.matchAll(DESC_TOKEN)) {
        const index = match.index ?? 0;
        pushText(text.slice(cursor, index));
        const [, , linkLabel, linkPlain, iconKind, iconNumber] = match;
        if (linkLabel) pushText(linkLabel);
        else if (linkPlain) pushText(linkPlain);
        else if (iconKind && iconKind.toLowerCase() === 'rank' && iconNumber) {
            segments.push({ type: 'image', name: `Grade_info_icon${iconNumber}.png` });
        }
        cursor = index + match[0].length;
    }
    pushText(text.slice(cursor));
    return segments;
};

/** 纯文本版本（列表等无法放图标的地方用） */
export const cleanDescription = (text?: string) =>
    parseDescription(text)
        .map((segment) => (segment.type === 'text' ? segment.text : ''))
        .join('');

/**
 * 图鉴排序：普通编号升序 → 5XX（EX）→ 无编号。
 * 返回 0 时两边同档，调用方再按数据 id 兜底。
 */
export const compareCollectionNo = (a?: number, b?: number) => {
    const rank = (no?: number) => (no == null ? 2 : isCollectionEx(no) ? 1 : 0);
    const ra = rank(a);
    const rb = rank(b);
    if (ra !== rb) return ra - rb;
    return (a ?? 0) - (b ?? 0);
};

export interface ItemDoc {
    id: number;
    name?: string;
    name_jp?: string;
    name_en?: string;
    /** `Item::Expendable` 等原始 content_type */
    type?: string;
    /** 游戏内分类（消耗品 / 杂物 / 精炼装备素材…） */
    category?: string;
    desc?: string;
    desc_lang?: string;
    icon?: string;
    list_icon?: string;
    /** 卖价 */
    value?: number;
    sort_id?: number;
    use_skill?: { kind?: string; id?: number; name?: string };
    shop?: ItemShopRow[];
    fishing?: ItemFishing;
    relic?: ItemRelic;
    /** 图鉴分类（未进图鉴时没有） */
    collection_group?: CollectionGroup;
    collection?: ItemCollection;
    /** 杂物二级分类（只有 `Item::Junk` 有） */
    junk_group?: JunkGroup;
}

/** 按 `Reward.type` 再细分出来的六组（页签用） */
export type ItemGroup = '其他消耗品' | '技能书' | '转职书' | '遗物' | '精炼石' | '通行证';

export const ITEM_GROUPS: ItemGroup[] = ['其他消耗品', '技能书', '转职书', '遗物', '精炼石', '通行证'];

/** 每组对应的 `Item::*` 类型 */
export const ITEM_GROUP_TYPES: Record<ItemGroup, string[]> = {
    其他消耗品: ['Item::Expendable', 'Item::NamedExpendable'],
    技能书: ['Item::InheritSkill', 'Item::LimitedSkillLevelup'],
    转职书: ['Item::JobChangeable', 'Item::JobReturnable'],
    遗物: ['Item::Relic'],
    精炼石: ['Item::EquipmentSubEffectChange'],
    通行证: ['Item::VipPass', 'Item::MissionPass'],
};

/**
 * 道具属于哪一组（不属于这六组则返回 `null`）。
 * 「其他消耗品」只收**没进图鉴「消耗品」**的那批，避免和已有页签重复；
 * 其余五组按类型全收（图鉴里也有的照样能查到，比如神器）。
 */
export const itemGroupOf = (item: ItemDoc): ItemGroup | null => {
    const type = item.type ?? '';
    for (const group of ITEM_GROUPS) {
        if (!ITEM_GROUP_TYPES[group].includes(type)) continue;
        if (group === '其他消耗品' && item.collection_group === '消耗品') return null;
        return group;
    }
    return null;
};

/** `Shop.purchase_kind` */
export const CURRENCY_LABELS: Record<number, string> = {
    1: '金币',
    2: '无偿宝石',
    3: '有偿宝石',
    4: '宝石 / 直购',
    5: '兑换点数',
};

/** `Shop.shop_kind` */
export const SHOP_KIND_LABELS: Record<number, string> = {
    1: '金币商店',
    2: '宝石商',
    3: '黒樽亭',
    4: '银鳞伯爵府',
};

/** `Shop.limit_kind` */
export const LIMIT_LABELS: Record<number, string> = {
    0: '不限购',
    1: '每日',
    2: '每周',
    3: '每月',
    4: '活动期间',
};

/** 城镇（取自 `TownConfig`，只有这三个有地区限定商品） */
export const TOWN_LABELS: Record<number, string> = {
    0: '通用',
    3: '伊斯贝克',
    5: '瓜尔达要塞',
    44: '诺森霍洛村',
};

export const describeShop = (row: ItemShopRow): string => {
    const kind = SHOP_KIND_LABELS[row.shop_kind ?? 0] ?? '特殊';
    const town = TOWN_LABELS[row.town ?? 0] ?? `城镇 ${row.town}`;
    const currency = row.currency_name ?? CURRENCY_LABELS[row.currency ?? 0] ?? '';
    const limit = row.limit_kind ? `${LIMIT_LABELS[row.limit_kind] ?? ''} ${row.limit_num ?? ''}`.trim() : '不限购';
    return [kind, town, `${row.price ?? 0} ${currency}`, limit].filter(Boolean).join(' · ');
};
