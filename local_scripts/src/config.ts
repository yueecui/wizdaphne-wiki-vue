import dotenv from 'dotenv';

dotenv.config();

/** 必填环境变量：缺失时立刻报错，避免带着 undefined 去请求远端 */
const requireEnv = (name: string): string => {
    const value = process.env[name];
    if (!value) {
        throw new Error(`缺少环境变量 ${name}（复制 .env.example 为 .env 后填写）`);
    }
    return value;
};

export const COS_SECRET_ID = requireEnv('COS_SECRET_ID');
export const COS_SECRET_KEY = requireEnv('COS_SECRET_KEY');
export const WIKI_USERNAME = requireEnv('WIKI_USERNAME');
export const WIKI_PASSWORD = requireEnv('WIKI_PASSWORD');
export const WIKI_AUTHKEY = requireEnv('WIKI_AUTHKEY');

// 上传到COS的路径前缀
export const COS_PATH_PREFIX = requireEnv('COS_PATH_PREFIX');
// COS 桶与区域（腾讯云控制台可查，换账号/换桶时改 .env）
export const COS_BUCKET = process.env.COS_BUCKET || 'single-page-app-1300115157';
export const COS_REGION = process.env.COS_REGION || 'ap-shanghai';
// 上传到COS路径后，WIKI引入脚本的地址。不需要“零件:”NS名
export const WIKI_PREFIX = requireEnv('VITE_WIKI_PREFIX');
export const WIKI_JS_IMPORTER_PAGE_TITLE = requireEnv('WIKI_JS_IMPORTER_PAGE_TITLE');

// 单index和css上传到wiki的页面标题。不需要“零件:”NS名
// 需要整个项目没有动态引入的组件文件
export const WIKI_GADGET_JS_PAGE_TITLE = process.env.WIKI_GADGET_JS_PAGE_TITLE!;
export const WIKI_GADGET_CSS_PAGE_TITLE = process.env.WIKI_GADGET_CSS_PAGE_TITLE!;
