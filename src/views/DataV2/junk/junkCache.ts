import { DB_SCHEMA_VERSION, getWikiDb, type JunkCacheRow } from '../../../stores/wikiData';
import type { SerializedJunkItem } from './types';

/**
 * V2 杂物整理结果缓存，存放在 wiki 主库（``wizdaphne-wiki-v2``）的 ``junk`` 表。
 *
 * 官网抓包的 ``junkdata.json`` 每次整理要做 20 万级几率组合计算，耗时很长。
 * 这里把整理结果（JunkItem 可序列化字段）写进主库：
 *   - 本地有数据时直接恢复，既不请求线上源数据，也不再重新整理；
 *   - 记录写入时的 ``DB_SCHEMA_VERSION``，整库重建（版本 bump）后自动失效；
 *   - 用户手动刷新（``wikiDataStore.refresh``）时一起清掉。
 */

/** 旧版本把整理结果放在独立库里，清掉以释放空间 */
const LEGACY_DB_NAME = 'wizdaphne-junk-v2';
let legacyDropped = false;

const dropLegacyDb = () => {
    if (legacyDropped) return;
    legacyDropped = true;
    try {
        indexedDB.deleteDatabase(LEGACY_DB_NAME);
    } catch (error) {
        console.warn('清理旧杂物缓存失败:', error);
    }
};

/** 结构版本一致才算有效缓存 */
const isFresh = (row: JunkCacheRow | undefined): row is JunkCacheRow =>
    !!row && row.schemaVersion === DB_SCHEMA_VERSION;

/** 本地是否已有整理结果（决定进入杂物页时是否自动加载） */
export const hasJunkCache = async (): Promise<boolean> => {
    dropLegacyDb();
    try {
        return isFresh(await getWikiDb().junk.get('all'));
    } catch (error) {
        console.error('检查杂物缓存失败:', error);
        return false;
    }
};

export const readJunkCache = async (): Promise<SerializedJunkItem[] | null> => {
    dropLegacyDb();
    try {
        const row = await getWikiDb().junk.get('all');
        return isFresh(row) ? row.items : null;
    } catch (error) {
        console.error('读取杂物缓存失败:', error);
        return null;
    }
};

export const writeJunkCache = async (hash: string, items: SerializedJunkItem[]) => {
    try {
        // items 来自 Vue 的响应式数组，内部是 Proxy，IndexedDB 无法结构化克隆；
        // 先转成普通对象再写入
        const plain = JSON.parse(JSON.stringify(items)) as SerializedJunkItem[];
        await getWikiDb().junk.put({
            key: 'all',
            schemaVersion: DB_SCHEMA_VERSION,
            hash,
            items: plain,
            savedAt: Date.now(),
        });
    } catch (error) {
        console.error('写入杂物缓存失败:', error);
    }
};
