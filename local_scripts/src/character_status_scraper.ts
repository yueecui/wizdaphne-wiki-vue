import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import ExcelJS from 'exceljs';
import * as path from 'path';
import { HuijiWiki, type HuijiTabxRaw } from 'huijiwiki-api';
import { WIKI_USERNAME, WIKI_PASSWORD, WIKI_AUTHKEY, WIKI_PREFIX } from './config.js';

// 定义数据接口
interface CharacterStatus {
    name: string;
    data: number[];
    rates: number[];
}

interface DataRow {
    rate: number;
    strength: string;
    wisdom: string;
    faith: string;
    vitality: string;
    dexterity: string;
    agility: string;
    luck: string;
}

// 解析带有几率的数值
function parseValueWithChance(text: string): number {
    const cleanText = text.replace(/\n/g, ' ').trim();
    const matches = cleanText.match(/(\d+)\s*\((\d+\.\d+)%\)/g);

    if (!matches) {
        return parseFloat(cleanText) || 0;
    }

    let total = 0;
    matches.forEach((match) => {
        const parts = match.match(/(\d+)\s*\((\d+\.\d+)%\)/);
        if (parts) {
            const value = parseFloat(parts[1]);
            const chance = parseFloat(parts[2]) / 100;
            total += value * chance;
        }
    });

    return total;
}

async function main(): Promise<void> {
    try {
        // 从URL获取网页内容
        const url = 'https://wizardry.info/daphne/gacha_rates/ja/characters.html';
        const response = await axios.get(url);
        const $ = cheerio.load(response.data);

        // 查找目标h1标签
        const h1 = $('h1').filter((_, el) => $(el).text().includes('冒険者別 ステータス提供割合'));

        if (h1.length === 0) {
            console.error('未找到目标h1标签');
            process.exit(1);
        }

        const result: CharacterStatus[] = [];

        // 遍历所有h2标签
        $('h2').each((_, h2El) => {
            const h2 = $(h2El);
            const name = h2.text().trim();
            const table = h2.next('table');

            if (!table.length) return;

            const rows = table.find('tr');
            if (rows.length < 9) return;

            // 提取8行数据（行索引1-8）
            const dataRows: DataRow[] = [];
            for (let i = 1; i <= 8; i++) {
                const row = rows.eq(i);
                const cells = row.find('td');
                if (cells.length < 9) continue;

                const rate = parseFloat(cells.eq(1).text().trim()) || 0;

                const strength = cells.eq(2).text().trim();
                const wisdom = cells.eq(3).text().trim();
                const faith = cells.eq(4).text().trim();
                const vitality = cells.eq(5).text().trim();
                const dexterity = cells.eq(6).text().trim();
                const agility = cells.eq(7).text().trim();
                const luck = cells.eq(8).text().trim();

                dataRows.push({
                    rate,
                    strength,
                    wisdom,
                    faith,
                    vitality,
                    dexterity,
                    agility,
                    luck,
                });
            }

            if (dataRows.length !== 8) return;

            // 基准行是第8行（索引7）
            const base = dataRows[7];

            // 提取提供割合
            const rates = dataRows.map((row) => row.rate);

            // 计算每个状态的结果
            const data: number[] = [];

            // 基准值
            const strengthBase = parseFloat(base.strength) || 0;
            const wisdomBase = parseFloat(base.wisdom) || 0;
            const faithBase = parseFloat(base.faith) || 0;
            const vitalityBase = parseFloat(base.vitality) || 0;
            const dexterityBase = parseFloat(base.dexterity) || 0;
            const agilityBase = parseFloat(base.agility) || 0;
            const luckBase = parseFloat(base.luck) || 0;

            // 计算每个状态在对应模式中的差值（力对应模式1，智慧对应模式2，依此类推）
            // 力 - 模式1（索引0）
            const strengthValue = parseValueWithChance(dataRows[0].strength);
            data.push(strengthValue > strengthBase ? strengthValue - strengthBase : 0);

            // 智慧 - 模式2（索引1）
            const wisdomValue = parseValueWithChance(dataRows[1].wisdom);
            data.push(wisdomValue > wisdomBase ? wisdomValue - wisdomBase : 0);

            // 信仰心 - 模式3（索引2）
            const faithValue = parseValueWithChance(dataRows[2].faith);
            data.push(faithValue > faithBase ? faithValue - faithBase : 0);

            // 生命力 - 模式4（索引3）
            const vitalityValue = parseValueWithChance(dataRows[3].vitality);
            data.push(vitalityValue > vitalityBase ? vitalityValue - vitalityBase : 0);

            // 灵巧 - 模式5（索引4）
            const dexterityValue = parseValueWithChance(dataRows[4].dexterity);
            data.push(dexterityValue > dexterityBase ? dexterityValue - dexterityBase : 0);

            // 敏捷 - 模式6（索引5）
            const agilityValue = parseValueWithChance(dataRows[5].agility);
            data.push(agilityValue > agilityBase ? agilityValue - agilityBase : 0);

            // 运 - 模式7（索引6）
            const luckValue = parseValueWithChance(dataRows[6].luck);
            data.push(luckValue > luckBase ? luckValue - luckBase : 0);

            // 添加到结果
            result.push({
                name,
                data,
                rates,
            });
        });

        // 输出结果
        // console.log(JSON.stringify(result, null, 2));

        // 确保public目录存在
        const publicDir = path.resolve(process.cwd(), 'public');
        if (!fs.existsSync(publicDir)) {
            fs.mkdirSync(publicDir, { recursive: true });
        }

        // 保存JSON结果到public目录
        const jsonFilePath = path.join(publicDir, 'character_data.json');
        fs.writeFileSync(jsonFilePath, JSON.stringify(result, null, 2));
        console.log(`\n数据已保存到 ${jsonFilePath}`);

        // 创建Excel文件
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('角色状态数据');

        // 设置表头
        const headers = [
            '名字',
            '力',
            '智慧',
            '信仰心',
            '生命力',
            '灵巧',
            '敏捷',
            '运',
            '力几率',
            '智慧几率',
            '信仰心几率',
            '生命力几率',
            '灵巧几率',
            '敏捷几率',
            '运几率',
            '基准几率',
        ];

        worksheet.addRow(headers);

        // 写入数据
        result.forEach((character) => {
            // 计算每个状态的几率（直接使用对应模式的几率）
            const statusRates: number[] = [];
            for (let i = 0; i < 7; i++) {
                // 力对应模式1，智慧对应模式2，信仰心对应模式3，生命力对应模式4，灵巧对应模式5，敏捷对应模式6，运对应模式7
                statusRates.push(character.rates[i]);
            }

            const row = [
                character.name,
                // 7个状态比较结果
                ...character.data,
                // 7个状态的几率
                ...statusRates,
                // 基准几率（rates数组的第7个值，即第8个模式的几率）
                character.rates[7],
            ];
            worksheet.addRow(row);
        });

        // 保存Excel文件到public目录
        const excelFilePath = path.join(publicDir, 'character_data.xlsx');
        await workbook.xlsx.writeFile(excelFilePath);
        console.log(`Excel文件已保存到 ${excelFilePath}`);

        // 使用 HuijiTabx 读取条目 "Data:角色抽取率.tabx"
        console.log('\n正在处理 HuijiTabx 数据...');
        try {
            const bot = new HuijiWiki(WIKI_PREFIX, WIKI_AUTHKEY);

            if (!(await bot.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
                console.error('登录失败');
            } else {
                console.log('成功登录 wiki');

                // 获取现有 Data:角色抽取率.tabx 页面
                const existingPage = await bot.getPageRawTextByTitle('Data:角色抽取率.tabx');
                let existingTabx: HuijiTabxRaw | null = null;

                if (existingPage && existingPage.content) {
                    try {
                        existingTabx = JSON.parse(existingPage.content);
                        console.log('成功解析现有 tabx 数据');

                        // 提取现有数据中的角色名称
                        const existingNames = new Set<string>();
                        const existingDataMap = new Map<string, { data: number[]; rates: number[] }>();

                        if (
                            existingTabx.data &&
                            Array.isArray(existingTabx.data) &&
                            existingTabx.schema &&
                            existingTabx.schema.fields
                        ) {
                            // 转换现有数据为对象数组
                            const convertedData = existingTabx.data.map((row: any[]) => {
                                const obj: any = {};
                                existingTabx.schema.fields.forEach((field: any, index: number) => {
                                    obj[field.name] = row[index];
                                });
                                return obj;
                            });

                            convertedData.forEach((row: any) => {
                                if (row.name) {
                                    existingNames.add(row.name);
                                    // 转换线上数据结构为本地数据结构以便比较
                                    existingDataMap.set(row.name, {
                                        data: [
                                            row.str || 0,
                                            row.iq || 0,
                                            row.pie || 0,
                                            row.vit || 0,
                                            row.dex || 0, // 注意：线上dex对应本地的spe位置
                                            row.spe || 0, // 注意：线上spe对应本地的dex位置
                                            row.luck || 0,
                                        ],
                                        rates: [
                                            row.rstr || 0,
                                            row.riq || 0,
                                            row.rpie || 0,
                                            row.rvit || 0,
                                            row.rdex || 0, // 注意：线上rdex对应本地的rspe位置
                                            row.rspe || 0, // 注意：线上rspe对应本地的rdex位置
                                            row.rluck || 0,
                                            row.rbase || 0,
                                        ],
                                    });
                                }
                            });
                        }

                        // 创建一个合并了现有数据和新数据的完整数据集
                        const allCharacters = new Map<string, CharacterStatus>();

                        // 先添加所有现有数据，以便可以被新数据覆盖
                        existingNames.forEach((name) => {
                            const existingData = existingDataMap.get(name);
                            if (existingData) {
                                allCharacters.set(name, {
                                    name,
                                    data: existingData.data,
                                    rates: existingData.rates,
                                });
                            }
                        });

                        // 添加或更新新数据
                        const newNames = new Set<string>();
                        result.forEach((character) => {
                            newNames.add(character.name);

                            // 检查现有数据中是否有该角色
                            if (existingNames.has(character.name)) {
                                // 查找现有数据中的对应行
                                const existingData = existingDataMap.get(character.name);
                                if (existingData) {
                                    // 比较数据是否有变化
                                    const hasChanges =
                                        JSON.stringify({
                                            data: character.data,
                                            rates: character.rates,
                                        }) !== JSON.stringify(existingData);

                                    if (hasChanges) {
                                        console.log(`角色 ${character.name} 的数据有变化`);
                                        console.log('现有数据:', existingData);
                                        console.log('新数据:', { data: character.data, rates: character.rates });
                                        // 更新数据
                                        allCharacters.set(character.name, character);
                                    }
                                }
                            } else {
                                // 添加新角色
                                console.log(`添加新角色: ${character.name}`);
                                allCharacters.set(character.name, character);
                            }
                        });

                        // 检查是否有现有角色在新数据中不存在
                        existingNames.forEach((name) => {
                            if (!newNames.has(name)) {
                                console.log(`现有角色 ${name} 不在新数据中`);
                            }
                        });

                        // 转换合并后的数据为Tabx格式
                        const mergedTabx: HuijiTabxRaw = {
                            license: existingTabx.license || 'CC0-1.0',
                            description: existingTabx.description || {
                                en: 'Character Status Rates',
                                zh: '角色状态抽取率',
                            },
                            sources: existingTabx.sources || '',
                            schema: existingTabx.schema || {
                                fields: [
                                    { name: 'name', type: 'string', title: { en: 'name', zh: 'name' } },
                                    { name: 'str', type: 'number', title: { en: 'str', zh: 'str' } },
                                    { name: 'iq', type: 'number', title: { en: 'iq', zh: 'iq' } },
                                    { name: 'pie', type: 'number', title: { en: 'pie', zh: 'pie' } },
                                    { name: 'vit', type: 'number', title: { en: 'vit', zh: 'vit' } },
                                    { name: 'spe', type: 'number', title: { en: 'spe', zh: 'spe' } },
                                    { name: 'dex', type: 'number', title: { en: 'dex', zh: 'dex' } },
                                    { name: 'luck', type: 'number', title: { en: 'luck', zh: 'luck' } },
                                    { name: 'rstr', type: 'number', title: { en: 'rstr', zh: 'rstr' } },
                                    { name: 'riq', type: 'number', title: { en: 'riq', zh: 'riq' } },
                                    { name: 'rpie', type: 'number', title: { en: 'rpie', zh: 'rpie' } },
                                    { name: 'rvit', type: 'number', title: { en: 'rvit', zh: 'rvit' } },
                                    { name: 'rspe', type: 'number', title: { en: 'rspe', zh: 'rspe' } },
                                    { name: 'rdex', type: 'number', title: { en: 'rdex', zh: 'rdex' } },
                                    { name: 'rluck', type: 'number', title: { en: 'rluck', zh: 'rluck' } },
                                    { name: 'rbase', type: 'number', title: { en: 'rbase', zh: 'rbase' } },
                                ],
                            },
                            data: Array.from(allCharacters.values()).map((character) => [
                                character.name,
                                character.data[0], // str
                                character.data[1], // iq
                                character.data[2], // pie
                                character.data[3], // vit
                                character.data[5], // spe (对应本地的agility)
                                character.data[4], // dex (对应本地的dexterity)
                                character.data[6], // luck
                                character.rates[0], // rstr
                                character.rates[1], // riq
                                character.rates[2], // rpie
                                character.rates[3], // rvit
                                character.rates[5], // rspe (对应本地的agilityRate)
                                character.rates[4], // rdex (对应本地的dexterityRate)
                                character.rates[6], // rluck
                                character.rates[7], // rbase
                            ]),
                        };

                        // 保存更新后的数据到 wiki
                        console.log('\n正在保存更新后的数据到 wiki...');
                        try {
                            const jsonString = JSON.stringify(mergedTabx, null, 2);
                            const result = await bot.editPage('Data:角色抽取率.tabx', jsonString, {
                                isBot: true,
                                summary: '更新角色状态抽取率数据',
                            });
                            if (result.edit && result.edit.result === 'Success') {
                                console.log('数据保存成功！');
                            } else {
                                console.error('数据保存失败:', result);
                            }
                        } catch (error) {
                            console.error('保存数据时发生错误:', (error as Error).message);
                        }
                    } catch (error) {
                        console.error('解析现有 tabx 数据失败:', error);
                    }
                } else {
                    console.log('未找到现有 Data:角色抽取率.tabx 页面，正在创建新页面...');
                    // 创建新的 tabx 数据
                    const newTabx: HuijiTabxRaw = {
                        license: 'CC0-1.0',
                        description: { en: 'Character Status Rates', zh: '角色状态抽取率' },
                        sources: '',
                        schema: {
                            fields: [
                                {
                                    name: 'name',
                                    type: 'string',
                                    title: { en: 'name', zh: 'name' },
                                },
                                {
                                    name: 'str',
                                    type: 'number',
                                    title: { en: 'str', zh: 'str' },
                                },
                                {
                                    name: 'iq',
                                    type: 'number',
                                    title: { en: 'iq', zh: 'iq' },
                                },
                                {
                                    name: 'pie',
                                    type: 'number',
                                    title: { en: 'pie', zh: 'pie' },
                                },
                                {
                                    name: 'vit',
                                    type: 'number',
                                    title: { en: 'vit', zh: 'vit' },
                                },
                                {
                                    name: 'spe',
                                    type: 'number',
                                    title: { en: 'spe', zh: 'spe' },
                                },
                                {
                                    name: 'dex',
                                    type: 'number',
                                    title: { en: 'dex', zh: 'dex' },
                                },
                                {
                                    name: 'luck',
                                    type: 'number',
                                    title: { en: 'luck', zh: 'luck' },
                                },
                                {
                                    name: 'rstr',
                                    type: 'number',
                                    title: { en: 'rstr', zh: 'rstr' },
                                },
                                {
                                    name: 'riq',
                                    type: 'number',
                                    title: { en: 'riq', zh: 'riq' },
                                },
                                {
                                    name: 'rpie',
                                    type: 'number',
                                    title: { en: 'rpie', zh: 'rpie' },
                                },
                                {
                                    name: 'rvit',
                                    type: 'number',
                                    title: { en: 'rvit', zh: 'rvit' },
                                },
                                {
                                    name: 'rspe',
                                    type: 'number',
                                    title: { en: 'rspe', zh: 'rspe' },
                                },
                                {
                                    name: 'rdex',
                                    type: 'number',
                                    title: { en: 'rdex', zh: 'rdex' },
                                },
                                {
                                    name: 'rluck',
                                    type: 'number',
                                    title: { en: 'rluck', zh: 'rluck' },
                                },
                                {
                                    name: 'rbase',
                                    type: 'number',
                                    title: { en: 'rbase', zh: 'rbase' },
                                },
                            ],
                        },
                        data: result.map((character) => [
                            character.name,
                            character.data[0], // str
                            character.data[1], // iq
                            character.data[2], // pie
                            character.data[3], // vit
                            character.data[5], // spe (对应本地的agility)
                            character.data[4], // dex (对应本地的dexterity)
                            character.data[6], // luck
                            character.rates[0], // rstr
                            character.rates[1], // riq
                            character.rates[2], // rpie
                            character.rates[3], // rvit
                            character.rates[5], // rspe (对应本地的agilityRate)
                            character.rates[4], // rdex (对应本地的dexterityRate)
                            character.rates[6], // rluck
                            character.rates[7], // rbase
                        ]),
                    };

                    // 保存新的 tabx 数据到 wiki
                    console.log('\n正在保存新创建的数据到 wiki...');
                    try {
                        const jsonString = JSON.stringify(newTabx, null, 2);
                        const result = await bot.editPage('Data:角色抽取率.tabx', jsonString, {
                            isBot: true,
                            summary: '创建角色状态抽取率数据页面',
                        });
                        if (result.edit && result.edit.result === 'Success') {
                            console.log('新页面创建并保存成功！');
                        } else {
                            console.error('新页面保存失败:', result);
                        }
                    } catch (error) {
                        console.error('保存新页面时发生错误:', (error as Error).message);
                    }
                }
            }
        } catch (error) {
            console.error('处理 HuijiTabx 数据时发生错误:', (error as Error).message);
        }
    } catch (error) {
        console.error('Error scraping data:', (error as Error).message);
        process.exit(1);
    }
}

// 执行脚本
main();
