/**
 * achievementTabx.ts —— 读写 wiki 上的 `Data:成就.tabx`。
 *
 * 用法（仓库根目录）：
 *   npx tsx local_scripts/wiki/achievementTabx.ts fetch    # 线上 -> local_scripts/work/achievement.tabx.json
 *   npx tsx local_scripts/wiki/achievementTabx.ts upload   # local_scripts/work/achievement.tabx.json -> 线上
 *
 * 需要 .env：VITE_WIKI_PREFIX / WIKI_AUTHKEY / WIKI_USERNAME / WIKI_PASSWORD
 */
import dotenv from 'dotenv';
import { HuijiWiki } from 'huijiwiki-api';
import { promises as fs, existsSync, mkdirSync } from 'node:fs';
import path from 'node:path';

dotenv.config();

const TITLE = 'Data:成就.tabx';
const FILE = path.join(process.cwd(), 'local_scripts', 'work', 'achievement.tabx.json');

const WIKI_PREFIX = process.env.VITE_WIKI_PREFIX;
const WIKI_AUTHKEY = process.env.WIKI_AUTHKEY;
const WIKI_USERNAME = process.env.WIKI_USERNAME;
const WIKI_PASSWORD = process.env.WIKI_PASSWORD;

async function login(): Promise<HuijiWiki> {
    if (!WIKI_PREFIX || !WIKI_AUTHKEY) {
        throw new Error('缺少环境变量 VITE_WIKI_PREFIX / WIKI_AUTHKEY（见 .env）');
    }
    if (!WIKI_USERNAME || !WIKI_PASSWORD) {
        throw new Error('缺少环境变量 WIKI_USERNAME / WIKI_PASSWORD（见 .env）');
    }
    const bot = new HuijiWiki(WIKI_PREFIX, WIKI_AUTHKEY);
    if (!(await bot.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
        throw new Error(`wiki 登录失败：${bot.getLastErrorMessage() || '未知原因'}`);
    }
    return bot;
}

async function main(): Promise<void> {
    const cmd = process.argv[2];

    if (cmd === 'fetch') {
        const bot = await login();
        const page = await bot.getPageRawTextByTitle(TITLE);
        if (!page?.content) throw new Error(`读不到页面 ${TITLE}`);
        mkdirSync(path.dirname(FILE), { recursive: true });
        await fs.writeFile(FILE, page.content, 'utf8');
        console.log(`已保存 ${FILE}（${page.content.length} 字符）`);
        return;
    }

    if (cmd === 'upload') {
        if (!existsSync(FILE)) throw new Error(`本地文件不存在：${FILE}（先 fetch）`);
        const text = await fs.readFile(FILE, 'utf8');
        const parsed = JSON.parse(text) as { schema?: { fields?: unknown[] }; data?: unknown[] };
        if (!Array.isArray(parsed.schema?.fields) || !Array.isArray(parsed.data)) {
            throw new Error('本地文件不是合法 tabx（缺少 schema.fields / data）');
        }
        const bot = await login();
        const res = await bot.editPage(TITLE, text, { summary: '按解包数据更新成就（保留旧 id，补 uid）' });
        if (res.error) throw new Error(res.error.info ?? JSON.stringify(res.error));
        console.log(`已上传 ${TITLE}`);
        return;
    }

    throw new Error('用法：tsx achievementTabx.ts fetch|upload');
}

main().catch((err) => {
    console.error('执行失败:', err instanceof Error ? err.message : err);
    process.exitCode = 1;
});
