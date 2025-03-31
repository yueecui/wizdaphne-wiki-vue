import fs from 'fs';
import { HuijiWiki } from 'huijiwiki-api';
import {
    WIKI_AUTHKEY,
    WIKI_GADGET_CSS_PAGE_TITLE,
    WIKI_GADGET_JS_PAGE_TITLE,
    WIKI_JS_IMPORTER_PAGE_TITLE,
    WIKI_PASSWORD,
    WIKI_PREFIX,
    WIKI_USERNAME,
} from './config.js';

const bot = new HuijiWiki(WIKI_PREFIX, WIKI_AUTHKEY);

export const updateImporter = async (timeStr: string) => {
    if (!(await bot.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
        return;
    }

    const gadgetPageTitle = WIKI_JS_IMPORTER_PAGE_TITLE.startsWith('零件:')
        ? WIKI_JS_IMPORTER_PAGE_TITLE
        : `零件:${WIKI_JS_IMPORTER_PAGE_TITLE}`;

    const res = await bot.getPageRawTextByTitle(gadgetPageTitle);
    if (!res) throw new Error('获取脚本地址失败');
    let newContent = res.content;
    newContent = res.content.replace(/var timeStr = '\d+?';/, `var timeStr = '${timeStr}';`);

    const result = await bot.editPage(gadgetPageTitle, newContent, { summary: '更新脚本地址' });
    if (result.error) {
        console.log('更新脚本地址失败，原因：', result.error);
    } else {
        console.log('更新脚本地址成功');
    }
};

export const updateGadget = async () => {
    if (!(await bot.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
        return;
    }

    const OUTPUT_ROOT = './dist/assets/';

    {
        if (!fs.existsSync(OUTPUT_ROOT + 'index.js')) {
            console.log(`找不到${OUTPUT_ROOT}index.js文件，跳过上传零件`);
            return;
        }
        const jsContent = fs.readFileSync(OUTPUT_ROOT + 'index.js', 'utf-8');
        const gadgetJsPageTitle = `零件:${WIKI_GADGET_JS_PAGE_TITLE}`;
        const result = await bot.editPage(gadgetJsPageTitle, jsContent, { summary: '更新零件JS' });
        if (result.error) {
            console.log('更新零件失败，原因：', result.error);
        } else {
            console.log(`更新[[${gadgetJsPageTitle}]]成功`);
        }
    }

    {
        if (!fs.existsSync(OUTPUT_ROOT + 'index.css')) {
            console.log(`找不到${OUTPUT_ROOT}index.css文件，跳过上传零件`);
            return;
        }
        const cssContent = fs.readFileSync(OUTPUT_ROOT + 'index.css', 'utf-8');
        const gadgetCssPageTitle = `零件:${WIKI_GADGET_CSS_PAGE_TITLE}`;
        const result = await bot.editPage(gadgetCssPageTitle, cssContent, { summary: '更新零件CSS' });
        if (result.error) {
            console.log('更新零件失败，原因：', result.error);
        } else {
            console.log(`更新[[${gadgetCssPageTitle}]]成功`);
        }
    }
};
