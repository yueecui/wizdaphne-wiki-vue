/**
 * fetchWikiExtras.ts
 *
 * 把 wiki 上手工维护的「补充表」拉到本地，让 `build_mock.py` 生成出的 mock 与线上
 * 完全一致（本地开发预览 == 线上效果）。对应 `local_scripts/clean/common.py` 里
 * `character_extra` / `relic_extra` 与 `build_mock.py` 的 `equipmentExtra` /
 * `effectKinds`：它们都优先读这里落盘的快照，没拉过时回退到 `config/` 旧文件。
 *
 * 拉取的目标（wiki 页面 -> 本地文件）：
 *   Data:CharacterExtra.tabx  -> local_scripts/work/wiki/Data_CharacterExtra.tabx.json
 *   Data:EquipmentExtra.tabx  -> local_scripts/work/wiki/Data_EquipmentExtra.tabx.json
 *   Data:遗物酒.tabx          -> local_scripts/work/wiki/Data_遗物酒.tabx.json
 *   Data:EffectKind.json      -> public/mock/EffectKindResponse.json
 *                                （包成 {"items":[扁平字典], "count", "page", "limit"}，
 *                                 与 build_mock 现有的 EffectKindResponse.json 形状一致）
 *
 * 只读页面、不登录（测试过 `getPageRawTextByTitle` 公开可读）；需要环境变量
 * VITE_WIKI_PREFIX / WIKI_AUTHKEY（见 .env）。
 *
 * 运行（在仓库根目录）：
 *   yarn fetch:wiki-extras
 * 正常接入 `[UPDATE 2] 转换为 mock`（先拉后洗）。
 */
import dotenv from 'dotenv';
import { HuijiWiki } from 'huijiwiki-api';
import { promises as fs } from 'node:fs';
import path from 'node:path';

dotenv.config();

const ROOT = process.cwd();
const MOCK_DIR = path.join(ROOT, 'public', 'mock');
const WIKI_TABX_DIR = path.join(ROOT, 'local_scripts', 'work', 'wiki');

/** wiki 页面标题 -> 本地落盘相对路径（相对 ROOT 或 MOCK_DIR） */
const TARGETS: { title: string; out: string; asEffectKind?: boolean }[] = [
    { title: 'Data:CharacterExtra.tabx', out: path.join(WIKI_TABX_DIR, 'Data_CharacterExtra.tabx.json') },
    { title: 'Data:EquipmentExtra.tabx', out: path.join(WIKI_TABX_DIR, 'Data_EquipmentExtra.tabx.json') },
    { title: 'Data:遗物酒.tabx', out: path.join(WIKI_TABX_DIR, 'Data_遗物酒.tabx.json') },
    { title: 'Data:EffectKind.json', out: path.join(MOCK_DIR, 'EffectKindResponse.json'), asEffectKind: true },
];

async function main(): Promise<void> {
    const prefix = process.env.VITE_WIKI_PREFIX;
    const authkey = process.env.WIKI_AUTHKEY;
    if (!prefix || !authkey) {
        throw new Error('缺少环境变量 VITE_WIKI_PREFIX / WIKI_AUTHKEY（见 .env.example）');
    }

    // 只读页面，不需要登录
    const bot = new HuijiWiki(prefix, authkey);

    await fs.mkdir(WIKI_TABX_DIR, { recursive: true });
    await fs.mkdir(MOCK_DIR, { recursive: true });

    let ok = 0;
    for (const target of TARGETS) {
        const page = await bot.getPageRawTextByTitle(target.title);
        if (!page?.content) {
            console.warn(`  × ${target.title}: 读不到页面，跳过`);
            continue;
        }

        let text = page.content;
        if (target.asEffectKind) {
            // 扁平 {id: {name, params}} -> build_mock 期望的 {"items":[扁平字典], ...}
            const flat = JSON.parse(page.content) as Record<string, unknown>;
            const count = Object.keys(flat).length;
            text = JSON.stringify({ items: [flat], count, page: 1, limit: count }, null, 2);
        }

        await fs.writeFile(target.out, text, 'utf8');
        console.log(`  ✓ ${target.title} -> ${path.relative(ROOT, target.out)}`);
        ok++;
    }

    console.log(`\n拉取完成：${ok}/${TARGETS.length}（build_mock.py 会优先使用这些快照）`);
}

main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
});
