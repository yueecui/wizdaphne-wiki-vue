// 定义JunkItem类需要的数据结构
export interface IJunkItemData {
    name: string;
    quality: number;
    grade: number;
    rates: number;
    name_cn: string;
    tier: number;
    sort: number;
}

// 定义显示用的杂物项类型
export interface IDisplayJunkItem {
    name: string;
    displayName: string;
    maxQuality: number;
    maxQualityRate: number;
    maxGrade: number;
    maxGradeRate: number;
    items: IJunkItemData[];
}

export interface IJunkData {
    name: string;
    groups: {
        weight: number;
        items: {
            name: string;
            weight: number;
            qualityWeights: number[];
            gradeWeights: number[];
        }[];
    }[];
}

// 从wiki获取的原数据格式
export interface IJunkJson {
    junkData: CompactJunkData;
    junkNameMap: [string, string][];
}

// 定义杂物过滤器类型
export interface IJunkFilter {
    searchText: string;
    maxQuality: number | null;
    maxGrade: number | null;
    maxTier: number | null;
    // 杂物自动加载开关
    junkAutoLoad: boolean;
}

// 定义junkrates.json的原始数据结构
export interface CompactJunkData {
    strMap: string[];
    data: Array<
        [
            categoryIndex: number,
            groups: Array<
                [
                    groupWeight: number,
                    items: Array<
                        [itemNameIndex: number, itemWeight: number, qualityWeights: number[], gradeWeights: number[]]
                    >,
                ]
            >,
        ]
    >;
}
