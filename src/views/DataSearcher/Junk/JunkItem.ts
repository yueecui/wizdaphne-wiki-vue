import { useEquipmentStore } from '../Equipment/equipmentStore';
import type { CompactJunkData, IJunkData, IJunkItemData } from './types';

// 初始化垃圾装备数据
const InitJunkData = (raw: CompactJunkData['data'][0], strMap: Map<number, string>): [IJunkData, IJunkItemData[]] => {
    const equipmentStore = useEquipmentStore();

    // 从raw中解析IJunkData
    const [categoryIndex, groups] = raw;
    const categoryName = strMap.get(categoryIndex) || `未知分类${categoryIndex}`;

    // 转换为IJunkData格式
    const junkData: IJunkData = {
        name: categoryName,
        groups: groups.map(([groupWeight, items]) => ({
            weight: groupWeight,
            items: items.map(([itemNameIndex, itemWeight, qualityWeights, gradeWeights]) => ({
                name: strMap.get(itemNameIndex) || `未知物品${itemNameIndex}`,
                weight: itemWeight,
                qualityWeights,
                gradeWeights,
            })),
        })),
    };

    // 计算每个物品、品质、星级的获得几率
    const junkItems: IJunkItemData[] = [];
    const existingItemsMap = new Map<string, IJunkItemData>();

    // 计算总权重用于归一化
    const totalGroupWeight = junkData.groups.reduce((sum, group) => sum + group.weight, 0);

    // 目前没有中文名的日文名记录
    const MissingJunkNames = new Set<string>();

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

            // 生成所有品质和星级的组合
            item.qualityWeights.forEach((qualityWeight, quality) => {
                item.gradeWeights.forEach((gradeWeight, grade) => {
                    const qualityRatio = qualityWeight / qualityTotalWeight;
                    const gradeRatio = gradeWeight / gradeTotalWeight;
                    const totalRate = groupWeightRatio * itemWeightRatio * qualityRatio * gradeRatio;

                    // 数组第一个位置的是1级而不是0级，所以需要+1
                    const actualQuality = quality + 1;
                    const actualGrade = grade + 1;

                    // 生成唯一键用于检查是否已存在相同的项
                    const key = `${item.name}|${actualQuality}|${actualGrade}`;

                    // 查找装备信息
                    const equipment = equipmentStore.getEquipmentByNJP(item.name);
                    if (!equipment && !MissingJunkNames.has(item.name)) {
                        MissingJunkNames.add(item.name);
                        console.log(`未找到装备: ${item.name}`);
                    }

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
                            name_cn: equipment ? equipment.data.n : '',
                            tier: equipment ? equipment.data.t : 0,
                            sort: equipment ? equipment.sort : 0,
                        };

                        existingItemsMap.set(key, newItem);
                    }
                });
            });
        });
    });

    // 将map中的值转换为数组
    existingItemsMap.forEach((item) => {
        junkItems.push(item);
    });

    return [junkData, junkItems];
};

export class JunkItem {
    public name: string;
    public data: IJunkData;
    public items: IJunkItemData[];
    public maxQuality: number;
    public maxGrade: number;
    public maxTier: number;

    constructor(
        raw: CompactJunkData['data'][0],
        { strMap, nameMap }: { strMap: Map<number, string>; nameMap: Map<string, string> },
    ) {
        [this.data, this.items] = InitJunkData(raw, strMap);
        this.name = nameMap.get(this.data.name) || this.data.name; // 如果有中文名就获取，否则就是用日文名

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
}
