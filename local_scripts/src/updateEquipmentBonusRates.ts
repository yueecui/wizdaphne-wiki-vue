import axios from 'axios';
import * as cheerio from 'cheerio';
import dotenv from 'dotenv';
import fs from 'fs';
import { HuijiWiki } from 'huijiwiki-api';
import path from 'path';
import { fileURLToPath } from 'url';

// 加载项目根目录的.env文件
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Wiki配置
const WIKI_USERNAME = process.env.WIKI_USERNAME!;
const WIKI_PASSWORD = process.env.WIKI_PASSWORD!;
const WIKI_AUTHKEY = process.env.WIKI_AUTHKEY!;
const WIKI_PREFIX = process.env.VITE_WIKI_PREFIX!;

// 定义数据结构
interface EquipmentLevel {
    level: number;
    rates: Record<string, number>;
}

interface EquipmentData {
    name: string;
    levels: EquipmentLevel[];
}

// 定义属性的固定顺序
const attributeOrder = [
    '攻击力提升（％）',
    '魔力提升（％）',
    '神力提升（％）',
    '命中提升（％）',
    '回避提升（％）',
    '抵抗提升（％）',
    '防御力提升（％）',
    '法术防御力提升（％）',
    '行动速度提升（％）',
    '攻击力提升（固定值）',
    '魔力提升（固定值）',
    '神力提升（固定值）',
    '命中提升（固定值）',
    '回避提升（固定值）',
    '抵抗提升（固定值）',
    '防御力提升（固定值）',
    '法术防御力提升（固定值）',
    '会心提升（固定值）',
    '行动速度提升（固定值）',
];

// 辅助函数：将百分比字符串转换为数值
const parsePercentage = (percentage: string): number => {
    if (percentage === '' || percentage === '-') return 0;
    return parseFloat(percentage.replace('%', ''));
};

// 1. 抓取普通装备加护数据
const scrapeRegularEquipmentBonusRates = async (): Promise<EquipmentData[]> => {
    try {
        const url = 'https://wizardry.info/daphne/gacha_rates/zh_cn/alternations.html';
        console.log(`正在抓取普通装备数据：${url}...`);

        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const equipmentData: EquipmentData[] = [];

        // 找到「按装备分类的附加加护获取概率」部分
        const sectionTitle = $('h1').filter((_, element) => {
            return $(element).text().trim() === '按装备分类的附加加护获取概率';
        });

        if (sectionTitle.length === 0) {
            console.error('未找到「按装备分类的附加加护获取概率」部分');
            return [];
        }

        console.log('找到目标部分，开始解析表格...');

        // 找到标题下方的表格
        let nextElement = sectionTitle.next();
        let targetTable = null;

        while (nextElement.length > 0) {
            if (nextElement[0].tagName === 'table') {
                targetTable = nextElement;
                break;
            }
            nextElement = nextElement.next();
        }

        if (!targetTable) {
            console.error('未找到对应的表格');
            return [];
        }

        // 获取表格的所有行
        const allRows = targetTable.find('tr');
        console.log('普通装备表格总行数:', allRows.length);

        // 获取表头
        const headerRow = targetTable.find('tr').eq(0);
        let headers = headerRow
            .find('td, th')
            .map((_, cell) => {
                return $(cell).text().trim();
            })
            .get();

        // 检查表头是否正确，如果不正确则手动设置
        if (headers.length < 5 || headers[0] !== '装備') {
            console.warn('表头解析可能不正确，使用手动设置的标准表头');
            headers = [
                '装备',
                '附加加护栏位',
                '攻击力提升（％）',
                '魔力提升（％）',
                '神力提升（％）',
                '命中提升（％）',
                '回避提升（％）',
                '抵抗提升（％）',
                '防御力提升（％）',
                '法术防御力提升（％）',
                '行动速度提升（％）',
                '攻击力提升（固定值）',
                '魔力提升（固定值）',
                '神力提升（固定值）',
                '命中提升（固定值）',
                '回避提升（固定值）',
                '抵抗提升（固定值）',
                '防御力提升（固定值）',
                '法术防御力提升（固定值）',
                '会心提升（固定值）',
                '行动速度提升（固定值）',
            ];
        }

        // 获取所有数据行
        const rows = targetTable.find('tr').slice(1);
        let currentEquipment: EquipmentData | null = null;

        rows.each((rowIndex, row) => {
            const cells = $(row).find('td, th');
            const cellTexts = cells
                .map((_, cell) => {
                    return $(cell).text().trim();
                })
                .get();

            // 跳过空行
            if (cellTexts.length === 0) return;

            // 解析等级数据
            const parseLevelData = () => {
                if (!currentEquipment) return;

                let levelStr: string;
                let attributesStartIndex: number;

                // 检查是否有装备名称
                if (cellTexts[0] && cellTexts[0] !== '' && !cellTexts[0].match(/^\d+$/)) {
                    levelStr = cellTexts[1];
                    attributesStartIndex = 2;
                } else {
                    levelStr = cellTexts[0];
                    attributesStartIndex = 1;
                }

                if (levelStr && levelStr.match(/^\d+$/)) {
                    const level = parseInt(levelStr);
                    const rates: Record<string, number> = {};

                    for (let i = attributesStartIndex; i < cellTexts.length; i++) {
                        const headerIndex = 2 + (i - attributesStartIndex);
                        if (headers[headerIndex] && cellTexts[i]) {
                            rates[headers[headerIndex]] = parsePercentage(cellTexts[i]);
                        }
                    }

                    currentEquipment.levels.push({
                        level,
                        rates,
                    });
                }
            };

            // 检查是否是新装备行
            if (cellTexts[0] && cellTexts[0] !== '' && !cellTexts[0].match(/^\d+$/)) {
                // 保存当前装备
                if (currentEquipment) {
                    equipmentData.push(currentEquipment);
                }

                // 创建新装备
                currentEquipment = {
                    name: cellTexts[0],
                    levels: [],
                };
            }

            // 解析当前行的等级数据
            parseLevelData();
        });

        // 保存最后一个装备
        if (currentEquipment) {
            equipmentData.push(currentEquipment);
        }

        console.log(`共抓取了 ${equipmentData.length} 件普通装备的数据`);
        return equipmentData;
    } catch (error) {
        console.error('抓取普通装备数据时发生错误:', error);
        return [];
    }
};

// 2. 抓取特典装备加护数据
const scrapeSpecialEquipmentBonusRates = async (): Promise<EquipmentData[]> => {
    try {
        const url = 'https://wizardry.info/daphne/gacha_rates/zh_cn/characters.html';
        console.log(`正在抓取特典装备数据：${url}...`);

        const response = await axios.get(url);
        const $ = cheerio.load(response.data);
        const equipmentData: EquipmentData[] = [];

        // 找到「特典装备附加加护获取概率」部分
        const sectionAnchor = $('#additions_additional_blessing_rates');
        if (!sectionAnchor.length) {
            console.error('未找到「特典装备附加加护获取概率」部分的锚点');
            return [];
        }

        console.log('找到目标部分，开始解析表格...');

        // 从锚点开始查找后续的表格
        let targetTable = null;
        let currentElement = sectionAnchor.next();

        while (currentElement.length > 0) {
            if (currentElement[0].tagName === 'table') {
                targetTable = currentElement;
                break;
            }
            currentElement = currentElement.next();
        }

        if (!targetTable) {
            console.error('未找到特典装备对应的表格');
            return [];
        }

        // 获取表格的所有行
        const allRows = targetTable.find('tr');
        console.log('特典装备表格总行数:', allRows.length);

        // 获取表头
        const headerRow = allRows.eq(0);
        const headers = headerRow
            .find('td, th')
            .map((_, cell) => {
                return $(cell).text().trim();
            })
            .get();

        // 获取所有数据行
        const rows = allRows.slice(1);
        let currentEquipment: EquipmentData | null = null;

        rows.each((rowIndex, row) => {
            const cells = $(row).find('td, th');
            const cellTexts = cells
                .map((_, cell) => {
                    return $(cell).text().trim();
                })
                .get();

            // 跳过空行
            if (cellTexts.length === 0) return;

            // 解析等级数据
            const parseLevelData = () => {
                if (!currentEquipment) return;

                let levelStr: string;
                let attributesStartIndex: number;

                // 检查是否有装备名称
                if (cellTexts[0] && cellTexts[0] !== '' && !cellTexts[0].match(/^\d+$/)) {
                    levelStr = cellTexts[1];
                    attributesStartIndex = 2;
                } else {
                    levelStr = cellTexts[0];
                    attributesStartIndex = 1;
                }

                if (levelStr && levelStr.match(/^\d+$/)) {
                    const level = parseInt(levelStr);
                    const rates: Record<string, number> = {};

                    for (let i = attributesStartIndex; i < cellTexts.length; i++) {
                        const headerIndex = 2 + (i - attributesStartIndex);
                        if (headers[headerIndex] && cellTexts[i]) {
                            rates[headers[headerIndex]] = parsePercentage(cellTexts[i]);
                        }
                    }

                    currentEquipment.levels.push({
                        level,
                        rates,
                    });
                }
            };

            // 检查是否是新装备行
            if (cellTexts[0] && cellTexts[0] !== '' && !cellTexts[0].match(/^\d+$/)) {
                // 保存当前装备
                if (currentEquipment) {
                    equipmentData.push(currentEquipment);
                }

                // 创建新装备
                currentEquipment = {
                    name: cellTexts[0],
                    levels: [],
                };
            }

            // 解析当前行的等级数据
            parseLevelData();
        });

        // 保存最后一个装备
        if (currentEquipment) {
            equipmentData.push(currentEquipment);
        }

        console.log(`共抓取了 ${equipmentData.length} 件特典装备的数据`);
        return equipmentData;
    } catch (error) {
        console.error('抓取特典装备数据时发生错误:', error);
        return [];
    }
};

// 3. 整合装备数据
const integrateBonusRates = (regularData: EquipmentData[], specialData: EquipmentData[]): string => {
    try {
        // 合并所有装备数据
        const allEquipmentData = [...regularData, ...specialData];

        // 转换为用户要求的格式：[name, [[level1数据], [level2数据]...]]
        const formattedData = allEquipmentData.map((equipment) => {
            // 按等级排序
            const sortedLevels = equipment.levels.sort((a, b) => a.level - b.level);

            // 转换每个等级的数据为数组
            const levelsData = sortedLevels.map((level) => {
                return attributeOrder.map((attr) => {
                    const value = level.rates[attr] || 0;
                    // 将接近0的数值转换为0
                    return Math.abs(value) < 0.0001 ? 0 : value;
                });
            });

            // 返回 [name, [level1数据, level2数据, ...]]
            return [equipment.name, levelsData];
        });

        // 创建最终的JSON对象
        const result = {
            data: formattedData,
        };

        return JSON.stringify(result);
    } catch (error) {
        console.error('整合数据时发生错误:', error);
        throw error;
    }
};

// 4. 上传数据到Wiki
const uploadToWiki = async (jsonContent: string, dryRun: boolean = false): Promise<boolean> => {
    if (dryRun) {
        console.log('=== 测试模式：跳过实际的Wiki上传操作 ===');
        console.log('要上传的数据长度:', jsonContent.length);
        return true;
    }
    try {
        console.log('正在准备上传装备加护数据到 wiki...');

        // 调试信息：检查环境变量
        console.log('环境变量检查:');
        console.log('WIKI_USERNAME:', WIKI_USERNAME);
        console.log('WIKI_PASSWORD:', WIKI_PASSWORD ? '已设置' : '未设置');
        console.log('WIKI_AUTHKEY:', WIKI_AUTHKEY);
        console.log('WIKI_PREFIX:', WIKI_PREFIX);

        // 创建HuijiWiki实例
        const bot = new HuijiWiki(WIKI_PREFIX, WIKI_AUTHKEY);

        // 确保用户名和密码不为undefined
        const username = WIKI_USERNAME?.trim() || '';
        const password = WIKI_PASSWORD?.trim() || '';

        console.log('正在尝试登录...');
        if (!(await bot.apiLogin(username, password))) {
            console.error('登录失败');
            return false;
        }
        console.log('成功登录 wiki');

        // 调用 API 编辑页面
        const editSummary = '更新装备追加护提供割合数据';

        console.log('正在编辑 Data:EquipmentBonusRates.json 页面...');

        const result = await bot.editPage('Data:EquipmentBonusRates.json', jsonContent, {
            summary: editSummary,
        });

        console.log('编辑结果:', result);
        if (result.error) {
            console.error('编辑失败:', result.error);
            return false;
        } else {
            console.log(`编辑完成，成功更新 [[Data:EquipmentBonusRates.json]] 页面`);
            return true;
        }
    } catch (error) {
        console.error('上传装备加护数据到 wiki 时发生错误:', error);
        return false;
    }
};

// 主函数：整合所有步骤
const main = async () => {
    console.log('=== 装备追加护提供割合数据更新开始 ===');

    // 解析命令行参数
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run') || args.includes('-d');

    console.log(`运行模式: ${dryRun ? '测试模式（不实际上传）' : '实际上传模式'}`);

    try {
        // 1. 抓取普通装备数据
        const regularEquipmentData = await scrapeRegularEquipmentBonusRates();
        if (regularEquipmentData.length === 0) {
            console.error('未抓取到普通装备数据，程序终止');
            return;
        }

        // 2. 抓取特典装备数据
        const specialEquipmentData = await scrapeSpecialEquipmentBonusRates();
        if (specialEquipmentData.length === 0) {
            console.error('未抓取到特典装备数据，程序终止');
            return;
        }

        // 3. 整合数据
        const integratedData = integrateBonusRates(regularEquipmentData, specialEquipmentData);
        console.log(`整合完成！共处理了 ${regularEquipmentData.length + specialEquipmentData.length} 件装备`);

        // 保存整合后的数据到文件（可选）
        const outputPath = path.resolve(__dirname, '../../public/integrated_bonus_rates.json');
        fs.writeFileSync(outputPath, integratedData);
        console.log(`整合后的数据已保存到：${outputPath}`);

        // 4. 上传到Wiki
        const uploadResult = await uploadToWiki(integratedData, dryRun);
        if (uploadResult) {
            console.log('=== 装备追加护提供割合数据更新成功 ===');
        } else {
            console.log('=== 装备追加护提供割合数据更新失败 ===');
        }
    } catch (error) {
        console.error('程序执行过程中发生错误:', error);
        console.log('=== 装备追加护提供割合数据更新失败 ===');
    }
};

// 执行主函数
main();
