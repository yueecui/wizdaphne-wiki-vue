import { IS_DEV } from '../../util';
import type { BlessingFile } from './blessingTypes';

/**
 * 加护数据（`Data:Blessing.json`）的加载入口。
 *
 * 只有一个文件、143 条，也没有按 id 单独查询的需求：**不做 Lua 接口**、不进
 * mock / IndexedDB 体系。线上直接取数据页原文（`?action=raw`），DEV 读
 * `public/blessing.json`（`blessing.py` 的产物）。数据不参与 `Api/Version` 的
 * 版本比对，重新生成 / 重新上传后刷新页面即可。
 */
const url = () =>
    IS_DEV
        ? `${import.meta.env.BASE_URL}blessing.json`
        // 数据页会被原地覆盖，带时间戳避免吃到 HTTP 缓存；走相对地址避免跨域
        : `/index.php?title=Data:Blessing.json&action=raw&ctype=text/json&t=${Date.now()}`;

let pending: Promise<BlessingFile> | null = null;

/** 模块级缓存：页签来回切换、面板与详情共用同一个请求 */
export const loadBlessingFile = (): Promise<BlessingFile> => {
    if (!pending) {
        pending = fetch(url(), { cache: 'no-store' })
            .then(async (response) => {
                if (!response.ok) throw new Error(`Data:Blessing.json: HTTP ${response.status}`);
                const data = (await response.json()) as BlessingFile;
                if (!Array.isArray(data?.items)) throw new Error('Data:Blessing.json: 缺少 items');
                return data;
            })
            .catch((e) => {
                // 失败不缓存，下次进页面可以重试
                pending = null;
                throw e;
            });
    }
    return pending;
};
