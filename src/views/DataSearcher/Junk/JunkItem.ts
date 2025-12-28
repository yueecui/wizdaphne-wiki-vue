import { useEquipmentStore } from '../Equipment/equipmentStore';
import type { IJunkData, IJunkItemData, IJunkSupplementary } from './types';

// 简单的字符串哈希算法，生成相对唯一的哈希值
const hashString = (str: string): string => {
    let hash = 107;
    let i = str.length;

    while (i--) {
        hash = ((hash << 5) + hash) ^ str.charCodeAt(i);
    }

    return (hash >>> 0).toString(16);
};

// 初始化垃圾装备数据
// 注意：raw参数是经过预处理的，其中categoryIndex和itemNameIndex已经替换为对应的字符串名称
const InitJunkData = (
    raw: [string, Array<[number, Array<[string, number, number[], number[]]>]>],
): [IJunkData, IJunkItemData[]] => {
    const equipmentStore = useEquipmentStore();

    // 从raw中解析IJunkData
    const [categoryName, groups] = raw;

    // 目前没有中文名的日文名记录
    const MissingJunkNames = new Set<string>();

    // 缓存装备查找结果，避免重复查找
    const equipmentCache = new Map<string, ReturnType<typeof equipmentStore.getEquipmentByNJP>>();

    // 转换为IJunkData格式
    const junkData: IJunkData = {
        name: categoryName,
        groups: groups.map(([groupWeight, items]) => ({
            weight: groupWeight,
            items: items.map(([itemName, itemWeight, qualityWeights, gradeWeights]) => {
                // 查找装备信息获取中文名
                let equipment = equipmentCache.get(itemName);
                if (equipment === undefined) {
                    equipment = equipmentStore.getEquipmentByNJP(itemName);
                    equipmentCache.set(itemName, equipment);
                    if (!equipment && !MissingJunkNames.has(itemName)) {
                        MissingJunkNames.add(itemName);
                        console.log(`未找到装备: ${itemName}`);
                    }
                }

                return {
                    name: itemName,
                    name_cn: equipment ? equipment.data.n : undefined,
                    weight: itemWeight,
                    qualityWeights,
                    gradeWeights,
                };
            }),
        })),
    };

    // 计算每个物品、品质、星级的获得几率
    const existingItemsMap = new Map<string, IJunkItemData>();

    // 计算总权重用于归一化
    const totalGroupWeight = junkData.groups.reduce((sum, group) => sum + group.weight, 0);

    junkData.groups.forEach((group) => {
        // 计算组内物品的总权重
        const groupItemTotalWeight = group.items.reduce((sum, item) => sum + item.weight, 0);
        const groupWeightRatio = group.weight / totalGroupWeight;

        group.items.forEach((item) => {
            // 计算物品在组内的权重比
            const itemWeightRatio = item.weight / groupItemTotalWeight;

            // 计算品质总权重
            const qualityTotalWeight = item.qualityWeights.reduce((sum, weight) => sum + weight, 0);

            // 计算星级总权重
            const gradeTotalWeight = item.gradeWeights.reduce((sum, weight) => sum + weight, 0);

            // 缓存当前物品的装备信息，避免在品质和星级循环中重复查找
            let equipment = equipmentCache.get(item.name);
            if (equipment === undefined) {
                equipment = equipmentStore.getEquipmentByNJP(item.name);
                equipmentCache.set(item.name, equipment);
                if (!equipment && !MissingJunkNames.has(item.name)) {
                    MissingJunkNames.add(item.name);
                    console.log(`未找到装备: ${item.name}`);
                }
            }

            // 预先获取装备相关属性
            const equipmentNameCn = equipment ? equipment.data.n : '';
            const equipmentTier = equipment ? equipment.data.t : 0;
            const equipmentSort = equipment ? equipment.sort : 0;

            // 生成所有品质和星级的组合
            item.qualityWeights.forEach((qualityWeight, quality) => {
                const qualityRatio = qualityWeight / qualityTotalWeight;
                const actualQuality = quality + 1;

                item.gradeWeights.forEach((gradeWeight, grade) => {
                    const gradeRatio = gradeWeight / gradeTotalWeight;
                    const actualGrade = grade + 1;
                    const totalRate = groupWeightRatio * itemWeightRatio * qualityRatio * gradeRatio;

                    // 生成唯一键用于检查是否已存在相同的项
                    const key = `${item.name}|${actualQuality}|${actualGrade}`;

                    if (existingItemsMap.has(key)) {
                        // 如果已存在相同项，累加rates
                        const existingItem = existingItemsMap.get(key)!;
                        existingItem.rates += totalRate;
                    } else {
                        // 如果不存在，创建新项并加入map
                        const newItem = {
                            name: item.name,
                            quality: actualQuality,
                            grade: actualGrade,
                            rates: totalRate,
                            name_cn: equipmentNameCn,
                            tier: equipmentTier,
                            sort: equipmentSort,
                        };

                        existingItemsMap.set(key, newItem);
                    }
                });
            });
        });
    });

    // 直接返回Map的值数组，避免额外的forEach循环
    return [junkData, Array.from(existingItemsMap.values())];
};

export class JunkItem {
    public name: string;
    public data: IJunkData;
    public items: IJunkItemData[];
    public maxQuality: number;
    public maxGrade: number;
    public maxTier: number;
    public index: number;
    public uniqueCode: string;
    public supplementary?: IJunkSupplementary;

    // raw参数是经过预处理的，其中categoryIndex和itemNameIndex已经替换为对应的字符串名称
    constructor(
        public raw: [string, Array<[number, Array<[string, number, number[], number[]]>]>],
        { nameMap, index }: { nameMap: Map<string, string>; index: number },
    ) {
        [this.data, this.items] = InitJunkData(raw);
        this.name = nameMap.get(this.data.name) || this.data.name; // 如果有中文名就获取，否则就是用日文名
        this.index = index;

        // 使用raw数据的哈希值作为唯一码，不依赖index
        this.uniqueCode = hashString(JSON.stringify(raw));

        // 初始化时计算并存储最高品质、最高星级和最高阶级
        this.maxQuality = 0;
        this.maxGrade = 0;
        this.maxTier = 0;

        this.items.forEach((item) => {
            if (item.quality > this.maxQuality) {
                this.maxQuality = item.quality;
            }
            if (item.grade > this.maxGrade) {
                this.maxGrade = item.grade;
            }
            if (item.tier > this.maxTier) {
                this.maxTier = item.tier;
            }
        });
    }

    /**
     * 按品质分组，返回各品质的总几率
     */
    getRatesGroupedByQuality(): Map<number, number> {
        const grouped: Map<number, number> = new Map();

        this.items.forEach((item) => {
            if (grouped.has(item.quality)) {
                grouped.set(item.quality, grouped.get(item.quality)! + item.rates);
            } else {
                grouped.set(item.quality, item.rates);
            }
        });

        return grouped;
    }

    /**
     * 按星级分组，返回各星级的总几率
     */
    getRatesGroupedByGrade(): Map<number, number> {
        const grouped: Map<number, number> = new Map();

        this.items.forEach((item) => {
            if (grouped.has(item.grade)) {
                grouped.set(item.grade, grouped.get(item.grade)! + item.rates);
            } else {
                grouped.set(item.grade, item.rates);
            }
        });

        return grouped;
    }

    /**
     * 按物品名称分组，返回各物品的总几率
     */
    getRatesGroupedByName(): Map<string, number> {
        const grouped: Map<string, number> = new Map();

        this.items.forEach((item) => {
            if (grouped.has(item.name)) {
                grouped.set(item.name, grouped.get(item.name)! + item.rates);
            } else {
                grouped.set(item.name, item.rates);
            }
        });

        return grouped;
    }

    /**
     * 按装备等级（tier）分组，返回各等级的总几率
     */
    getRatesGroupedByTier(): Map<number, number> {
        const grouped: Map<number, number> = new Map();

        this.items.forEach((item) => {
            if (grouped.has(item.tier)) {
                grouped.set(item.tier, grouped.get(item.tier)! + item.rates);
            } else {
                grouped.set(item.tier, item.rates);
            }
        });

        return grouped;
    }

    /**
     * 获取是否无法获取该杂物项
     */
    get notObt(): boolean {
        return this.supplementary?.not_obt === 1;
    }

    /**
     * 获取杂物项的额外描述
     */
    get description(): string | undefined {
        return this.supplementary?.desc;
    }
}
