/** 遗物（`Api/GetV2Item` 顶层 `relics`）的数据形状；字段与 `src/api/dbCodec.ts` 的 `RELIC_FIELDS` 对应 */
export interface RelicMonster {
    /** 怪物图鉴编号（接口 `relics_extra.monster_id`，对应敌人表的 `no`） */
    id?: number;
    name?: string;
}

/** `Api/GetV2Item` 顶层 `relics_extra` 的一条：遗物图鉴编号 + 掉落怪物编号 + 推荐类别 */
export interface RelicExtra {
    /** 遗物的物品图鉴编号（道具数据里的 `collection.no`） */
    id?: number;
    /** 掉落怪物的图鉴编号（对应敌人表的 `no`） */
    monster_id?: number[];
    /** 推荐类别（`物理` / `法系` / `坦克` / `开箱`） */
    categories?: string[];
}

export interface RelicDoc {
    /** 遗物道具 id（`Reward.identification`，如 500010010），对回道具表的图鉴编号用 */
    id?: number;
    name?: string;
    /** 遗物酒名 */
    brew?: string;
    /** 遗物之力（技能名） */
    power?: string;
    /** 遗物之力对应的技能 identification（点击遗物打开技能弹窗） */
    skill_id?: number;
    /** 性格：善 / 中立 / 恶 */
    align?: string;
    /** 阶级（同组只保留最低阶级的一条） */
    grade?: number;
    icon?: string;
    /** 提升属性 */
    inc?: string[];
    /** 降低属性 */
    dec?: string[];
    /** 掉落怪物：按图鉴编号对到 `relics_extra`，怪物名再用敌人表的图鉴编号解析 */
    monsters?: RelicMonster[];
    /** 推荐类别：来自 `relics_extra.c`（可选项见 `relics_ccate`） */
    categories?: string[];
}

/** 属性展示顺序，与 V1 遗物酒页面一致 */
export const RELIC_STAT_ORDER = [
    'HP',
    'MP',
    'SP',
    '攻击力',
    '魔力',
    '神力',
    '防御力',
    '法术防御力',
    '抵抗',
    '行动速度',
    '命中',
    '会心',
    '回避',
    '探知',
    '陷阱解除',
    '陷阱回避',
    '火耐性',
    '水耐性',
    '土耐性',
    '风耐性',
    '光耐性',
    '暗耐性',
    '暴击耐性',
];

export const RELIC_ALIGNMENTS = ['善', '中立', '恶'] as const;

/** 按统一顺序排列属性（未知属性排在最后） */
export const sortRelicStats = (stats?: string[]) =>
    [...(stats ?? [])].sort((a, b) => {
        const indexA = RELIC_STAT_ORDER.indexOf(a);
        const indexB = RELIC_STAT_ORDER.indexOf(b);
        return (indexA < 0 ? RELIC_STAT_ORDER.length : indexA) - (indexB < 0 ? RELIC_STAT_ORDER.length : indexB);
    });
