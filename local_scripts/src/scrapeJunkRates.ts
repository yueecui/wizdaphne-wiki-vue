import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';
import { HuijiWiki, type HuijiTabxRaw } from 'huijiwiki-api';
import { WIKI_AUTHKEY, WIKI_PASSWORD, WIKI_PREFIX, WIKI_USERNAME } from './config.js';

interface QualityRate {
    quality: number;
    rate: string;
    weight: string;
}

interface GradeRate {
    grade: number;
    rate: string;
    weight: string;
}

interface GachaItem {
    name: string;
    itemRate: string;
    itemWeight: string;
    qualityRates: QualityRate[];
    gradeRates: GradeRate[];
}

interface GachaGroup {
    groupId: string;
    groupRate: string;
    groupWeight: string;
    items: GachaItem[];
}

interface GachaRecord {
    category: string;
    groups: GachaGroup[];
}

interface GachaData {
    data: GachaRecord[];
}

// 辅助函数：将百分比字符串转换为数值
const parsePercentage = (percentage: string): number => {
    if (percentage === '-') return 0;
    return parseFloat(percentage.replace('%', ''));
};

// 辅助函数：计算权重数组
const calculateWeights = (rates: { [key: string]: string }): Array<{ value: number; rate: string; weight: number }> => {
    const parsedRates = Object.entries(rates)
        .filter(([_, rate]) => rate !== '-')
        .map(([key, rate]) => ({
            value: parseInt(key.replace('★', '')),
            rate: rate,
            weight: parsePercentage(rate),
        }));

    return parsedRates;
};

// 辅助函数：将数据上传到 HuijiWiki
async function uploadToWiki(records: any[]) {
    console.log('正在准备上传数据到 wiki...');

    // 获取所有唯一的分类
    const categories = Array.from(new Set(records.map((record) => record.category)));
    console.log(`获取到 ${categories.length} 个唯一分类`);

    try {
        const bot = new HuijiWiki(WIKI_PREFIX, WIKI_AUTHKEY);

        if (!(await bot.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
            console.error('登录失败');
            return;
        }
        console.log('成功登录 wiki');

        // 获取现有 Data:JunkNameMap.tabx 页面
        const existingPage = await bot.getPageRawTextByTitle('Data:JunkNameMap.tabx');
        // console.log('现有页面:', existingPage);
        // console.log('现有页面内容:', existingPage?.content);

        let existingTabx: any = null;
        if (existingPage && existingPage.content) {
            try {
                existingTabx = JSON.parse(existingPage.content);
                // console.log('成功解析现有 tabx 数据');
                // console.log('现有 tabx 对象结构:', Object.keys(existingTabx));
                // console.log('现有 tabx schema:', existingTabx?.schema);
                // console.log('现有 tabx data:', existingTabx?.data);
            } catch (error) {
                console.error('解析现有 tabx 数据失败:', error);
                existingTabx = null;
            }
        }

        const tabxRaw: HuijiTabxRaw = {
            license: 'CC0-1.0',
            description: { en: 'Junk Name Mapping Data', zh: '杂物物品名称映射表' },
            sources: '',
            schema: {
                fields: [
                    {
                        name: 'name_jp',
                        type: 'string',
                        title: { en: 'name_jp' },
                    },
                    {
                        name: 'name_cn',
                        type: 'string',
                        title: { en: 'name_cn' },
                    },
                ],
            },
            data: [],
        };

        // 处理现有数据
        let existingNameJpSet = new Set<string>();
        if (existingTabx) {
            // console.log('处理现有数据...');
            try {
                // 手动转换现有数据，避免使用可能失败的 convertTabxRawToData 方法
                if (existingTabx.data && existingTabx.schema && existingTabx.schema.fields) {
                    // console.log('手动转换现有 tabx 数据');
                    // console.log('现有 tabx 数据长度:', existingTabx.data.length);
                    // console.log('现有 tabx 字段:', existingTabx.schema.fields);

                    // 手动转换为对象数组
                    const existingData = existingTabx.data.map((row: any) => {
                        const obj: any = {};
                        existingTabx.schema.fields.forEach((field: any, index: number) => {
                            obj[field.name] = row[index];
                        });
                        return obj;
                    });

                    // console.log('转换后的现有数据:', existingData);
                    existingNameJpSet = new Set(existingData.map((item: any) => item.name_jp));

                    // 将现有数据添加到 tabxRaw.data
                    tabxRaw.data = existingTabx.data;
                } else {
                    console.error('现有 tabx 数据结构不完整，缺少 data、schema 或 schema.fields');
                }
            } catch (error) {
                console.error('转换现有 tabx 数据时出错:', error);
            }
        }

        // 添加新的分类
        console.log('添加更新杂物名称...');
        let newCount = 0;
        for (const category of categories) {
            if (!existingNameJpSet.has(category)) {
                console.log('添加新名称:', category);
                // 添加新行，name_cn 留空
                tabxRaw.data.push([category, '']);
                newCount += 1;
            }
        }

        if (newCount === 0) {
            console.log('没有新杂物名称需要添加');
        } else {
            console.log(`共添加 ${newCount} 条杂物名称记录`);

            // 调用 API 编辑页面
            const editSummary = '更新杂物物品名称映射数据：添加新杂物名称';

            console.log('正在编辑 wiki 页面...');

            const result = await bot.editPage('Data:JunkNameMap.tabx', JSON.stringify(tabxRaw, null, 2), {
                summary: editSummary,
            });

            console.log('编辑结果:', result);
            if (result.error) {
                console.error('编辑失败:', result.error);
            } else {
                console.log(`编辑完成，成功更新 [[Data:JunkNameMap.tabx]] 页面`);
            }
        }
    } catch (error) {
        console.error('上传 wiki 时发生错误:', error);
    }
}

// 辅助函数：将 junkrates.json 上传到 HuijiWiki 的 Data:JunkRates.json 页面
async function uploadJunkRatesToWiki(filePath: string) {
    console.log('正在准备上传 junkrates.json 到 wiki...');

    try {
        // 读取 junkrates.json 文件内容
        const jsonContent = fs.readFileSync(filePath, 'utf-8');

        const bot = new HuijiWiki(WIKI_PREFIX, WIKI_AUTHKEY);

        if (!(await bot.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
            console.error('登录失败');
            return;
        }
        console.log('成功登录 wiki');

        // 调用 API 编辑页面
        const editSummary = '更新垃圾物品概率数据：上传精简版本的概率数据';

        console.log('正在编辑 Data:JunkRates.json 页面...');

        const result = await bot.editPage('Data:JunkRates.json', jsonContent, {
            summary: editSummary,
        });

        console.log('编辑结果:', result);
        if (result.error) {
            console.error('编辑失败:', result.error);
        } else {
            console.log(`编辑完成，成功更新 [[Data:JunkRates.json]] 页面`);
        }
    } catch (error) {
        console.error('上传 junkrates.json 到 wiki 时发生错误:', error);
    }
}

const scrapeGachaRates = async () => {
    try {
        const url = 'https://wizardry.info/daphne/gacha_rates/ja/equipments.html';
        console.log(`正在抓取 ${url}...`);

        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        const gachaData: GachaData = { data: [] };

        // 获取所有h2标签
        const h2Elements = $('h2');
        console.log(`找到 ${h2Elements.length} 个h2标签`);

        h2Elements.each((h2Index, h2) => {
            const category = $(h2).text().trim();
            console.log(`处理 ${h2Index + 1}/${h2Elements.length}: ${category}`);

            // 找到当前h2后面的第一个table
            let nextElement = $(h2).next();
            let targetTable = null;

            while (nextElement.length > 0) {
                if (nextElement[0].tagName === 'table') {
                    targetTable = nextElement;
                    break;
                }
                nextElement = nextElement.next();
            }

            if (!targetTable) {
                console.log(`  未找到对应的table，跳过`);
                return;
            }

            const groups: GachaGroup[] = [];
            let currentGroup: GachaGroup | null = null;

            // 遍历表格行
            const rows = targetTable.find('tr');

            // 跳过表头行（前2行）
            for (let rowIndex = 2; rowIndex < rows.length; rowIndex++) {
                const row = rows.eq(rowIndex);
                const cells = row.find('td, th');
                const cellTexts = cells.map((_, cell) => $(cell).text().trim()).get();

                // 跳过空行
                if (cellTexts.length === 0) continue;

                // 如果这一行有组ID（第一个单元格是数字），说明是新组的开始
                if (cellTexts[0] && cellTexts[0].match(/^\d+$/)) {
                    // 保存当前组
                    if (currentGroup) {
                        // 计算组内物品的权重
                        const totalItemRate = currentGroup.items.reduce(
                            (sum, item) => sum + parsePercentage(item.itemRate),
                            0,
                        );
                        currentGroup.items.forEach((item) => {
                            item.itemWeight = item.itemRate;
                        });

                        groups.push(currentGroup);
                    }

                    // 创建新组
                    currentGroup = {
                        groupId: cellTexts[0],
                        groupRate: cellTexts[1],
                        groupWeight: cellTexts[1],
                        items: [],
                    };

                    // 解析当前行的装备数据
                    if (cellTexts.length >= 12) {
                        const qualityRates: QualityRate[] = [
                            { quality: 1, rate: cellTexts[4], weight: cellTexts[4] },
                            { quality: 2, rate: cellTexts[5], weight: cellTexts[5] },
                            { quality: 3, rate: cellTexts[6], weight: cellTexts[6] },
                            { quality: 4, rate: cellTexts[7] || '-', weight: cellTexts[7] || '-' },
                            { quality: 5, rate: cellTexts[8] || '-', weight: cellTexts[8] || '-' },
                        ];

                        const gradeRates: GradeRate[] = [
                            { grade: 1, rate: cellTexts[9], weight: cellTexts[9] },
                            { grade: 2, rate: cellTexts[10], weight: cellTexts[10] },
                            { grade: 3, rate: cellTexts[11], weight: cellTexts[11] },
                            { grade: 4, rate: cellTexts[12] || '-', weight: cellTexts[12] || '-' },
                            { grade: 5, rate: cellTexts[13] || '-', weight: cellTexts[13] || '-' },
                        ];

                        const item: GachaItem = {
                            name: cellTexts[2],
                            itemRate: cellTexts[3],
                            itemWeight: cellTexts[3],
                            qualityRates: qualityRates.filter((qr) => qr.rate !== '-'),
                            gradeRates: gradeRates.filter((gr) => gr.rate !== '-'),
                        };

                        currentGroup.items.push(item);
                    }
                }
                // 否则是同一组的其他装备
                else if (currentGroup && cellTexts.length >= 10) {
                    const qualityRates: QualityRate[] = [
                        { quality: 1, rate: cellTexts[2], weight: cellTexts[2] },
                        { quality: 2, rate: cellTexts[3], weight: cellTexts[3] },
                        { quality: 3, rate: cellTexts[4], weight: cellTexts[4] },
                        { quality: 4, rate: cellTexts[5] || '-', weight: cellTexts[5] || '-' },
                        { quality: 5, rate: cellTexts[6] || '-', weight: cellTexts[6] || '-' },
                    ];

                    const gradeRates: GradeRate[] = [
                        { grade: 1, rate: cellTexts[7], weight: cellTexts[7] },
                        { grade: 2, rate: cellTexts[8], weight: cellTexts[8] },
                        { grade: 3, rate: cellTexts[9], weight: cellTexts[9] },
                        { grade: 4, rate: cellTexts[10] || '-', weight: cellTexts[10] || '-' },
                        { grade: 5, rate: cellTexts[11] || '-', weight: cellTexts[11] || '-' },
                    ];

                    const item: GachaItem = {
                        name: cellTexts[0],
                        itemRate: cellTexts[1],
                        itemWeight: cellTexts[1],
                        qualityRates: qualityRates.filter((qr) => qr.rate !== '-'),
                        gradeRates: gradeRates.filter((gr) => gr.rate !== '-'),
                    };

                    currentGroup.items.push(item);
                }
            }

            // 保存最后一个组
            if (currentGroup) {
                // 直接使用原始字符串作为物品权重
                currentGroup.items.forEach((item) => {
                    item.itemWeight = item.itemRate;
                });

                groups.push(currentGroup);
            }

            // 只有当表格有数据时才保存
            if (groups.length > 0) {
                // 直接使用原始字符串作为组权重
                groups.forEach((group) => {
                    group.groupWeight = group.groupRate;
                });

                const record: GachaRecord = {
                    category: category,
                    groups: groups,
                };

                gachaData.data.push(record);
            }
        });

        // 保存完整版本
        const fullOutputPath = './public/junkrates_full.json';
        fs.writeFileSync(fullOutputPath, JSON.stringify(gachaData, null, 2), 'utf-8');
        console.log(`完整版本已成功保存到 ${fullOutputPath}`);

        // 辅助函数：移除数组末尾的0
        const trimTrailingZeros = (arr: number[]): number[] => {
            let endIndex = arr.length;
            while (endIndex > 0 && arr[endIndex - 1] === 0) {
                endIndex--;
            }
            return arr.slice(0, endIndex);
        };

        // 生成并保存精简版本
        const generateCompactOutput = () => {
            console.log('正在生成精简版本...');

            // 构建字符串映射表
            const strMap: string[] = [];
            const getStringIndex = (str: string): number => {
                if (!strMap.includes(str)) {
                    strMap.push(str);
                }
                return strMap.indexOf(str);
            };

            // 转换数据
            const compactData: any = {
                strMap: [],
                data: [],
            };

            gachaData.data.forEach((record: any) => {
                const categoryIndex = getStringIndex(record.category);
                const compactGroups: any[] = [];

                record.groups.forEach((group: any) => {
                    const groupWeight = parsePercentage(group.groupWeight);
                    const compactItems: any[] = [];

                    group.items.forEach((item: any) => {
                        const itemNameIndex = getStringIndex(item.name);
                        const itemWeight = parsePercentage(item.itemWeight);

                        // 构建品质权重数组 [q1, q2, q3, q4, q5]
                        const qualityWeights: number[] = [0, 0, 0, 0, 0];
                        item.qualityRates.forEach((qr: any) => {
                            if (qr.quality >= 1 && qr.quality <= 5) {
                                qualityWeights[qr.quality - 1] = parsePercentage(qr.weight);
                            }
                        });
                        const trimmedQuality = trimTrailingZeros(qualityWeights);

                        // 构建等级权重数组 [g1, g2, g3, g4, g5]
                        const gradeWeights: number[] = [0, 0, 0, 0, 0];
                        item.gradeRates.forEach((gr: any) => {
                            if (gr.grade >= 1 && gr.grade <= 5) {
                                gradeWeights[gr.grade - 1] = parsePercentage(gr.weight);
                            }
                        });
                        const trimmedGrade = trimTrailingZeros(gradeWeights);

                        // 物品格式：[名字映射, 权重, [品质], [阶级]]
                        const compactItem = [itemNameIndex, itemWeight, trimmedQuality, trimmedGrade];
                        compactItems.push(compactItem);
                    });

                    // 组格式：[权重, [物品集]]
                    const compactGroup = [groupWeight, compactItems];
                    compactGroups.push(compactGroup);
                });

                // 记录格式：[categoryIndex, [groups]]
                const compactRecord = [categoryIndex, compactGroups];
                compactData.data.push(compactRecord);
            });

            // 确保strMap被正确填充
            compactData.strMap = strMap;

            // 保存精简版本
            const compactOutputPath = './public/junkrates.json';
            fs.writeFileSync(compactOutputPath, JSON.stringify(compactData, null, 0), 'utf-8');

            // 计算压缩率
            const originalSize = Buffer.byteLength(JSON.stringify(gachaData, null, 2), 'utf-8');
            const compactSize = Buffer.byteLength(JSON.stringify(compactData, null, 0), 'utf-8');
            const compressionRatio = (((originalSize - compactSize) / originalSize) * 100).toFixed(2);

            console.log(`精简版本已成功保存到 ${compactOutputPath}`);
            console.log(`原始大小: ${originalSize.toLocaleString()} 字节`);
            console.log(`精简大小: ${compactSize.toLocaleString()} 字节`);
            console.log(`压缩率: ${compressionRatio}%`);
        };

        generateCompactOutput();
        console.log(`处理完成，共保存了 ${gachaData.data.length} 条记录`);

        // 上传数据到 HuijiWiki
        await uploadToWiki(gachaData.data);
        // 上传 junkrates.json 到 Data:JunkRates.json
        await uploadJunkRatesToWiki('./public/junkrates.json');
    } catch (error) {
        console.error('抓取过程中发生错误:', error);
    }
};

scrapeGachaRates();
