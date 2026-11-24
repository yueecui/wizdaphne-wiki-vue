import axios from 'axios';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'node:path';

dotenv.config();

// wiki 站点（可用 .env 里的 VITE_WIKI_PREFIX 覆盖）
const WIKI_PREFIX = process.env.VITE_WIKI_PREFIX || 'wizdaphne';
const WIKI_BASE = `https://${WIKI_PREFIX}.huijiwiki.com`;

// API地址
const luaApi = (module: string) => `${WIKI_BASE}/api.php?action=lua&module=${module}&format=json&utf8=1`;
const API_URLS = {
    searcherData: luaApi('Api/GetSearcherData'),
    equipment: luaApi('Api/GetEquipment'),
    junkData: luaApi('Api/GetJunkData'),
    dropConfig: luaApi('Api/GetDropConfig'),
    achievement: luaApi('Api/GetAchievement'),
    relicbrew: luaApi('Api/GetRelicbrew'),
    items: luaApi('Api/GetItem'),
    monster: luaApi('Api/GetMonster'),
    talent: `${WIKI_BASE}/wiki/Data:Talent.json?action=raw&t=` + Date.now(),
};

// 请求头配置
const REQUEST_HEADERS = {
    'user-agent': process.env.WIKI_TOOL_UA || 'Yuee-Tool/0.1',
    Accept: 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
};

// 输出路径（相对本仓库的 public/，可用 WIKI_SCRAPE_OUT 覆盖）
const OUT_DIR = process.env.WIKI_SCRAPE_OUT || path.join(process.cwd(), 'public');
const OUTPUT_PATHS = {
    searcherData: path.join(OUT_DIR, 'data.json'),
    equipment: path.join(OUT_DIR, 'equipment.json'),
    junkData: path.join(OUT_DIR, 'junkdata.json'),
    dropConfig: path.join(OUT_DIR, 'dropconfig.json'),
    achievement: path.join(OUT_DIR, 'achievement.json'),
    relicbrew: path.join(OUT_DIR, 'relicbrew.json'),
    items: path.join(OUT_DIR, 'items.json'),
    monster: path.join(OUT_DIR, 'monster.json'),
    talent: path.join(OUT_DIR, 'talent.json'),
};

// 抓取数据函数
const fetchData = async (url: string, outputPath: string) => {
    try {
        // 添加时间戳参数避免缓存
        const timestamp = Date.now();
        const separator = url.includes('?') ? '&' : '?';
        const urlWithTimestamp = `${url}${separator}t=${timestamp}`;

        console.log(`正在抓取 ${urlWithTimestamp}`);

        const response = await axios.get(urlWithTimestamp, {
            headers: REQUEST_HEADERS,
            maxRedirects: 0, // 禁用重定向
        });

        // 保存数据（最小化压缩）
        fs.writeFileSync(outputPath, JSON.stringify(response.data), 'utf-8');
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

        // 并行抓取所有API
        await Promise.all([
            fetchData(API_URLS.searcherData, OUTPUT_PATHS.searcherData),
            fetchData(API_URLS.equipment, OUTPUT_PATHS.equipment),
            fetchData(API_URLS.junkData, OUTPUT_PATHS.junkData),
            fetchData(API_URLS.dropConfig, OUTPUT_PATHS.dropConfig),
            fetchData(API_URLS.achievement, OUTPUT_PATHS.achievement),
            fetchData(API_URLS.relicbrew, OUTPUT_PATHS.relicbrew),
            fetchData(API_URLS.items, OUTPUT_PATHS.items),
            fetchData(API_URLS.monster, OUTPUT_PATHS.monster),
            fetchData(API_URLS.talent, OUTPUT_PATHS.talent),
        ]);

        console.log('所有数据抓取完成！');
    } catch (error) {
        console.error('数据抓取失败:', error);
        process.exit(1);
    }
};

// 执行主函数
main();
