import fs from 'fs';
import axios from 'axios';

// API地址
const API_URLS = {
  searcherData: 'https://wizdaphne.huijiwiki.com/api.php?action=lua&module=Api/GetSearcherData&format=json&utf8=1',
  equipment: 'https://wizdaphne.huijiwiki.com/api.php?action=lua&module=Api/GetEquipment&format=json&utf8=1'
};

// 请求头配置
const REQUEST_HEADERS = {
  'user-agent': 'Yuee-Tool/0.1',
  'Accept': 'application/json, text/plain, */*',
  'Content-Type': 'application/json'
};

// 输出路径
const OUTPUT_PATHS = {
  searcherData: 'd:\\WizardyDaphne\\wizdaphne-wiki-vue\\public\\data.json',
  equipment: 'd:\\WizardyDaphne\\wizdaphne-wiki-vue\\public\\equipment.json'
};

// 抓取数据函数
const fetchData = async (url: string, outputPath: string) => {
  try {
    console.log(`正在抓取 ${url}`);
    
    const response = await axios.get(url, {
      headers: REQUEST_HEADERS,
      maxRedirects: 0 // 禁用重定向
    });
    
    // 保存数据
    fs.writeFileSync(outputPath, JSON.stringify(response.data, null, 2), 'utf-8');
    console.log(`数据已保存到 ${outputPath}`);
    
    return response.data;
  } catch (error) {
    console.error(`抓取 ${url} 时出错:`, error);
    throw error;
  }
};

// 主函数
const main = async () => {
  try {
    console.log('开始抓取数据...');
    
    // 并行抓取两个API
    await Promise.all([
      fetchData(API_URLS.searcherData, OUTPUT_PATHS.searcherData),
      fetchData(API_URLS.equipment, OUTPUT_PATHS.equipment)
    ]);
    
    console.log('所有数据抓取完成！');
  } catch (error) {
    console.error('数据抓取失败:', error);
    process.exit(1);
  }
};

// 执行主函数
main();
