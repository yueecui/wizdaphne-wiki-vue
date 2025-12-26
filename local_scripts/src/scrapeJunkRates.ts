import axios from 'axios';
import * as cheerio from 'cheerio';
import fs from 'fs';

interface QualityRate {
  quality: number;
  rate: string;
  weight: number;
}

interface GradeRate {
  grade: number;
  rate: string;
  weight: number;
}

interface GachaItem {
  name: string;
  itemRate: string;
  itemWeight: number;
  qualityRates: QualityRate[];
  gradeRates: GradeRate[];
}

interface GachaGroup {
  groupId: string;
  groupRate: string;
  groupWeight: number;
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
      weight: parsePercentage(rate)
    }));

  return parsedRates;
};

// 辅助函数：计算最大公约数
const gcd = (a: number, b: number): number => {
  return b === 0 ? a : gcd(b, a % b);
};

// 辅助函数：计算数组的最大公约数
const gcdArray = (arr: number[]): number => {
  return arr.reduce((acc, val) => gcd(acc, val), arr[0]);
};

// 辅助函数：将一组权重转换为最小整数比例
const convertToMinimalIntegers = (weights: number[]): number[] => {
  // 移除0值
  const nonZeroWeights = weights.filter(w => w > 0);
  if (nonZeroWeights.length === 0) return weights;

  // 找到最小的非零权重
  const minWeight = Math.min(...nonZeroWeights);

  // 将所有权重转换为相对于最小权重的比例
  const ratios = weights.map(w => {
    if (w === 0) return 0;
    return Math.round(w / minWeight);
  });

  // 计算最大公约数
  const nonZeroRatios = ratios.filter(r => r > 0);
  if (nonZeroRatios.length === 0) return ratios;

  const commonDivisor = gcdArray(nonZeroRatios);

  // 除以最大公约数得到最小整数比例
  return ratios.map(r => r === 0 ? 0 : Math.round(r / commonDivisor));
};

// 辅助函数：转换完整记录的权重为最小整数
const convertRecordWeightsToMinimalIntegers = (record: any): void => {
  // 处理组权重
  const groupWeights = record.groups.map((group: any) => group.groupWeight);
  const minimalGroupWeights = convertToMinimalIntegers(groupWeights);

  record.groups.forEach((group: any, index: number) => {
    group.groupWeight = minimalGroupWeights[index];

    // 处理物品权重
    const itemWeights = group.items.map((item: any) => item.itemWeight);
    const minimalItemWeights = convertToMinimalIntegers(itemWeights);

    group.items.forEach((item: any, itemIndex: number) => {
      item.itemWeight = minimalItemWeights[itemIndex];

      // 处理品质权重
      const qualityWeights = item.qualityRates.map((qr: any) => qr.weight);
      const minimalQualityWeights = convertToMinimalIntegers(qualityWeights);

      item.qualityRates.forEach((qr: any, qrIndex: number) => {
        qr.weight = minimalQualityWeights[qrIndex];
      });

      // 处理等级权重
      const gradeWeights = item.gradeRates.map((gr: any) => gr.weight);
      const minimalGradeWeights = convertToMinimalIntegers(gradeWeights);

      item.gradeRates.forEach((gr: any, grIndex: number) => {
        gr.weight = minimalGradeWeights[grIndex];
      });
    });
  });
};

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
            const totalItemRate = currentGroup.items.reduce((sum, item) => sum + parsePercentage(item.itemRate), 0);
            currentGroup.items.forEach(item => {
              item.itemWeight = parsePercentage(item.itemRate);
            });

            groups.push(currentGroup);
          }

          // 创建新组
          currentGroup = {
            groupId: cellTexts[0],
            groupRate: cellTexts[1],
            groupWeight: parsePercentage(cellTexts[1]),
            items: []
          };

          // 解析当前行的装备数据
          if (cellTexts.length >= 12) {
            const qualityRates: QualityRate[] = [
              { quality: 1, rate: cellTexts[4], weight: parsePercentage(cellTexts[4]) },
              { quality: 2, rate: cellTexts[5], weight: parsePercentage(cellTexts[5]) },
              { quality: 3, rate: cellTexts[6], weight: parsePercentage(cellTexts[6]) },
              { quality: 4, rate: cellTexts[7] || '-', weight: parsePercentage(cellTexts[7] || '-') },
              { quality: 5, rate: cellTexts[8] || '-', weight: parsePercentage(cellTexts[8] || '-') }
            ];

            const gradeRates: GradeRate[] = [
              { grade: 1, rate: cellTexts[9], weight: parsePercentage(cellTexts[9]) },
              { grade: 2, rate: cellTexts[10], weight: parsePercentage(cellTexts[10]) },
              { grade: 3, rate: cellTexts[11], weight: parsePercentage(cellTexts[11]) },
              { grade: 4, rate: cellTexts[12] || '-', weight: parsePercentage(cellTexts[12] || '-') },
              { grade: 5, rate: cellTexts[13] || '-', weight: parsePercentage(cellTexts[13] || '-') }
            ];

            const item: GachaItem = {
              name: cellTexts[2],
              itemRate: cellTexts[3],
              itemWeight: parsePercentage(cellTexts[3]),
              qualityRates: qualityRates.filter(qr => qr.rate !== '-'),
              gradeRates: gradeRates.filter(gr => gr.rate !== '-')
            };

            currentGroup.items.push(item);
          }
        }
        // 否则是同一组的其他装备
        else if (currentGroup && cellTexts.length >= 10) {
          const qualityRates: QualityRate[] = [
            { quality: 1, rate: cellTexts[2], weight: parsePercentage(cellTexts[2]) },
            { quality: 2, rate: cellTexts[3], weight: parsePercentage(cellTexts[3]) },
            { quality: 3, rate: cellTexts[4], weight: parsePercentage(cellTexts[4]) },
            { quality: 4, rate: cellTexts[5] || '-', weight: parsePercentage(cellTexts[5] || '-') },
            { quality: 5, rate: cellTexts[6] || '-', weight: parsePercentage(cellTexts[6] || '-') }
          ];

          const gradeRates: GradeRate[] = [
            { grade: 1, rate: cellTexts[7], weight: parsePercentage(cellTexts[7]) },
            { grade: 2, rate: cellTexts[8], weight: parsePercentage(cellTexts[8]) },
            { grade: 3, rate: cellTexts[9], weight: parsePercentage(cellTexts[9]) },
            { grade: 4, rate: cellTexts[10] || '-', weight: parsePercentage(cellTexts[10] || '-') },
            { grade: 5, rate: cellTexts[11] || '-', weight: parsePercentage(cellTexts[11] || '-') }
          ];

          const item: GachaItem = {
            name: cellTexts[0],
            itemRate: cellTexts[1],
            itemWeight: parsePercentage(cellTexts[1]),
            qualityRates: qualityRates.filter(qr => qr.rate !== '-'),
            gradeRates: gradeRates.filter(gr => gr.rate !== '-')
          };

          currentGroup.items.push(item);
        }
      }

      // 保存最后一个组
      if (currentGroup) {
        // 计算组内物品的权重
        const totalItemRate = currentGroup.items.reduce((sum, item) => sum + parsePercentage(item.itemRate), 0);
        currentGroup.items.forEach(item => {
          item.itemWeight = parsePercentage(item.itemRate);
        });

        groups.push(currentGroup);
      }

      // 只有当表格有数据时才保存
      if (groups.length > 0) {
        // 计算所有组的权重
        const totalGroupRate = groups.reduce((sum, group) => sum + parsePercentage(group.groupRate), 0);
        groups.forEach(group => {
          group.groupWeight = parsePercentage(group.groupRate);
        });

        const record: GachaRecord = {
          category: category,
          groups: groups
        };

        // 将权重转换为最小整数
        convertRecordWeightsToMinimalIntegers(record);

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
        data: []
      };

      gachaData.data.forEach((record: any) => {
        const categoryIndex = getStringIndex(record.category);
        const compactGroups: any[] = [];

        record.groups.forEach((group: any) => {
          const groupWeight = group.groupWeight;
          const compactItems: any[] = [];

          group.items.forEach((item: any) => {
            const itemNameIndex = getStringIndex(item.name);
            const itemWeight = item.itemWeight;

            // 构建品质权重数组 [q1, q2, q3, q4, q5]
            const qualityWeights: number[] = [0, 0, 0, 0, 0];
            item.qualityRates.forEach((qr: any) => {
              if (qr.quality >= 1 && qr.quality <= 5) {
                qualityWeights[qr.quality - 1] = qr.weight;
              }
            });
            const trimmedQuality = trimTrailingZeros(qualityWeights);

            // 构建等级权重数组 [g1, g2, g3, g4, g5]
            const gradeWeights: number[] = [0, 0, 0, 0, 0];
            item.gradeRates.forEach((gr: any) => {
              if (gr.grade >= 1 && gr.grade <= 5) {
                gradeWeights[gr.grade - 1] = gr.weight;
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
      const compressionRatio = ((originalSize - compactSize) / originalSize * 100).toFixed(2);

      console.log(`精简版本已成功保存到 ${compactOutputPath}`);
      console.log(`原始大小: ${originalSize.toLocaleString()} 字节`);
      console.log(`精简大小: ${compactSize.toLocaleString()} 字节`);
      console.log(`压缩率: ${compressionRatio}%`);
    };

    generateCompactOutput();
    console.log(`处理完成，共保存了 ${gachaData.data.length} 条记录`);

  } catch (error) {
    console.error('抓取过程中发生错误:', error);
  }
};

scrapeGachaRates();
