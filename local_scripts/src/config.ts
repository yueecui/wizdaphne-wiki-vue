import dotenv from 'dotenv';

dotenv.config();

export const COS_SECRET_ID = process.env.COS_SECRET_ID!;
export const COS_SECRET_KEY = process.env.COS_SECRET_KEY!;
export const WIKI_USERNAME = process.env.WIKI_USERNAME!;
export const WIKI_PASSWORD = process.env.WIKI_PASSWORD!;
export const WIKI_AUTHKEY = process.env.WIKI_AUTHKEY!;

// 上传到COS的路径前缀
export const COS_PATH_PREFIX = process.env.COS_PATH_PREFIX!;
// 上传到COS路径后，WIKI引入脚本的地址。不需要“零件:”NS名
export const WIKI_PREFIX = process.env.VITE_WIKI_PREFIX!;
export const WIKI_JS_IMPORTER_PAGE_TITLE = process.env.WIKI_JS_IMPORTER_PAGE_TITLE!;

// 单index和css上传到wiki的页面标题。不需要“零件:”NS名
// 需要整个项目没有动态引入的组件文件
export const WIKI_GADGET_JS_PAGE_TITLE = process.env.WIKI_GADGET_JS_PAGE_TITLE!;
export const WIKI_GADGET_CSS_PAGE_TITLE = process.env.WIKI_GADGET_CSS_PAGE_TITLE!;
