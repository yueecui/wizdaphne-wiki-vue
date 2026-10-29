/**
 * 哈肯的加护（`public/blessing.json`，`local_scripts/clean/blessing.py` 生成）。
 *
 * 只有 143 条、也没有按 id 单独查询的需求，所以不拆记录页、不进 mock / IndexedDB
 * 管线：整个文件即数据源，前端一次 `fetch` 就够（对应 `Api/GetV2Blessing` 整包返回）。
 */

/** 一条效果：`kind` 决定参数含义，其余是原值 */
export interface BlessingEffect {
    kind: number;
    /** 效果种类的日文名（`SkillSubEffectKind`），也是默认显示名 */
    kind_name?: string;
    /** `param_1..N`（末尾的 0 已在清洗时去掉，位置不能错） */
    params: number[];
    turn?: number;
    strength?: number;
}

/** 一种加护 */
export interface BlessingDoc {
    id: number;
    name: string;
    name_jp?: string;
    name_en?: string;
    description?: string;
    /** 说明回退到日文 / 英文时的语言标记 */
    description_lang?: string;
    /** `HakenBlessing.group_id`（= `pool * 10 + tier`） */
    group: number;
    /** 加护池：同一主题下的加护集合（2000 / 2001 / 2002 / 2003 / 7015 / 600000） */
    pool: number;
    /** 池内的档位（1 / 2 / 3） */
    tier: number;
    /** 稀有度（0-3，数值越小越常见） */
    rarity: number;
    /** 抽取权重（同池内越大越常见；0 = 不在随机池里） */
    weight: number;
    effects: BlessingEffect[];
}

/**
 * 效果参数里会出现的 id 字典（名字跟着数据走，前端不用再查别的表）。
 * 只收录本文件里用得到的那些。
 */
export interface BlessingDictionaries {
    /** 被加成的基础能力值（kind 7000 的 `param_1`） */
    stats: Record<string, string>;
    /** 种族（kind 150 / 2340 的 `param_1`，`EnemySpecies`） */
    species: Record<string, string>;
    /** 属性（kind 2363 的 `param_2`，`Attribute`） */
    attributes: Record<string, string>;
}

/** 一个加护组（`group_id`）挂在哪些层上 */
export interface BlessingGroup {
    /** 楼层名（`DungeonWedge.blessing_group_id` -> `DungeonFloorMove.name`） */
    layers: string[];
}

/** `public/blessing.json` 的完整形状 */
export interface BlessingFile extends BlessingDictionaries {
    generatedAt?: string;
    count: number;
    /** `group_id` -> 楼层信息：加护组本身没有名字，用它挂的层来标 */
    groups: Record<string, BlessingGroup>;
    items: BlessingDoc[];
}
