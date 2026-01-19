// 遗物酒数据类型
export interface IRelicBrew {
    monster: string; // 怪物名称
    power: string; // 力量名称
    align: string; // 性格 (善/中立/恶)
    i: number; // 索引
    id: number;
    c: string[]; // 推荐类别
    name: string; // 遗物酒名称
    dec: string[]; // 降低的属性数组
    brew: string; // 酿造名称
    inc: string[]; // 提升的属性数组
    comment?: string; // 注释（可选）
}

// 遗物酒过滤器类型
export interface IRelicBrewFilter {
    searchText: string; // 搜索文本
    align: string; // 性格过滤
    inc: string; // 提升属性过滤（单选）
    dec: string; // 降低属性过滤（单选）
    category: string; // 推荐类别过滤
    showOnlyDoubleInc: boolean; // 是否仅显示双提升遗物
    showBrewName: boolean; // 是否显示遗物酒名
    showRelicPower: boolean; // 是否显示遗物之力
}

// API返回的JSON数据类型
export interface IRelicBrewJson {
    relicbrews: IRelicBrew[];
    stat_list: string[];
    category: string[];
    warnings?: any; // 可选的warnings字段，处理实际API返回的数据结构
}
