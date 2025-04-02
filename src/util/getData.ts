import { convertLuaTable } from './convertLuaTable';

let dataCache: any;

/**
 * 获取写在页面中的数据
 */
export function getData<T = any>(key: string): T {
    if (!dataCache) {
        if (window.mw) {
            dataCache = convertLuaTable(window.mw.config.get(`wgHuijiVars.${key}`));
        } else {
            dataCache = convertLuaTable(window.Data!);
            window.Data = dataCache;
        }
    }

    return dataCache;
}
