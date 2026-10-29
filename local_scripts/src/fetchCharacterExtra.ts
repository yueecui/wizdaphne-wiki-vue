/**
 * 重新抓取线上手工表 ``Data:CharacterExtra.tabx``，覆盖 ``config/Data_CharacterExtra.tabx.xlsx``。
 *
 * 这张表是 wiki 上手工维护的（卡池组 / 上线日期 / 声优 / banner 立绘编号），
 * 清洗层只读仓库里的 xlsx，所以表在线上加了新列之后要跑一次本脚本。
 *
 * 注意 UA：站点的 Cloudflare 会拦浏览器 UA，脚本沿用抓取脚本惯用的 ``Yuee-Tool/0.1``。
 *
 *     npx tsx local_scripts/src/fetchCharacterExtra.ts
 *     npx tsx local_scripts/src/fetchCharacterExtra.ts --dry   # 只看统计，不写文件
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HuijiTabx } from 'huijiwiki-api';

dotenv.config();

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const OUT = path.join(ROOT, 'config', 'Data_CharacterExtra.tabx.xlsx');
const TITLE = 'Data:CharacterExtra.tabx';
const UA = 'Yuee-Tool/0.1';

async function main(): Promise<void> {
    const prefix = process.env.VITE_WIKI_PREFIX;
    if (!prefix) throw new Error('缺少环境变量 VITE_WIKI_PREFIX（见 .env）');

    const url = `https://${prefix}.huijiwiki.com/wiki/${encodeURIComponent(TITLE)}?action=raw&t=${Date.now()}`;
    console.log(`抓取 ${url}`);
    const res = await fetch(url, { headers: { 'user-agent': UA, accept: 'application/json, */*' } });
    if (!res.ok) throw new Error(`抓取失败：HTTP ${res.status}`);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const raw: any = await res.json();
    // tabx 的数组列标题带 ``[]``（``banner[]``），而 HuijiTabx 内部用 ``name``（``banner``）
    // 当键、写 xlsx 时又取 ``title.en``，两边不一致会写出整列 null。这里统一成 ``name``。
    for (const field of raw?.schema?.fields ?? []) {
        if (field?.title?.en && field.title.en !== field.name) {
            field.title.en = field.name;
        }
    }

    const table = HuijiTabx.newFromJson(raw);
    const rows = table.data;
    const fields = Object.keys(rows[0] ?? {});
    const withBanner = rows.filter((row) => row['banner[]'] ?? row.banner).length;
    console.log(`${rows.length} 行，字段：${fields.join(', ')}`);
    console.log(`带 banner 的行：${withBanner}`);

    if (process.argv.includes('--dry')) {
        console.log('--dry：未写入文件');
        return;
    }
    table.saveAsXlsx(OUT);
    console.log(`已覆盖 ${OUT}`);
}

main().catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
});
