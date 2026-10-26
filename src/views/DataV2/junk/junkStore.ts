import { defineStore } from 'pinia';
import { ref } from 'vue';
import { MwConfig } from '../../../huiji/MwConfig';
import { IS_DEV } from '../../../util';
import { useDataV2Store } from '../dataV2Store';
import { JunkItem, hashString } from './JunkItem';
import { readJunkCache, writeJunkCache } from './junkCache';
import type { IJunkJson, IJunkSupplementary } from './types';

export const useJunkStore = defineStore('junk-v2', () => {
    // 配置数据
    const junkItems = ref<JunkItem[]>([]);
    const isAllInit = ref(false); // 所有杂物数据已全部初始化，只有显示链接时不会全部初始化，列表时则会全部初始化
    const isLoading = ref(false);
    const isLoaded = ref(false); // 杂物数据是否已加载

    // 源数据（官网抓包）哈希，用于 IndexedDB 缓存判断
    let sourceHash = '';

    // 加载并解析junkrates.json数据
    const loadJunkData = async () => {
        if (isLoading.value || isLoaded.value) return;

        isLoading.value = true;

        try {
            // 本地已有整理结果：直接使用，不与线上发生任何交互
            const cached = await readJunkCache();
            if (cached) {
                junkItems.value = cached.map((row) => JunkItem.fromCache(row));
                isLoaded.value = true;
                isAllInit.value = true;
                return;
            }

            const response = await fetch(
                IS_DEV ? '/junkdata.json' : '/api.php?action=lua&module=Api/GetJunkData&format=json&utf8=1',
            );

            if (response.ok) {
                const data: IJunkJson = await response.json();
                sourceHash = hashString(JSON.stringify(data));

                // 解析数据并创建JunkItem对象
                const parsedData = await parseJunkData(data);
                junkItems.value = parsedData;
                isLoaded.value = true;
            } else {
                console.error('获取垃圾装备数据失败');
            }
        } catch (error) {
            console.error('加载杂物数据时发生错误:', error);
        } finally {
            isLoading.value = false;
        }
    };

    // 解析compact格式的junk数据
    const parseJunkData = async (data: IJunkJson): Promise<JunkItem[]> => {
        const store = useDataV2Store();
        // 先等待 V2 装备数据加载完成（整理时要用中文名 / 阶级 / 特典）
        await store.ensureAll();

        // 转换一下
        const strMap = (() => {
            const map: Map<number, string> = new Map();
            data.junkData.strMap.forEach((str, index) => {
                map.set(index, str);
            });
            return map;
        })();

        // 使用异步并行方式创建JunkItem实例，避免主线程阻塞
        const promises = data.junkData.data.map((raw, arrayIndex) => {
            // 使用Promise包装JunkItem创建过程
            return new Promise<JunkItem>((resolve) => {
                // 使用setTimeout将创建过程放入事件队列，避免阻塞主线程
                setTimeout(() => {
                    // 根据数组索引生成顺序值，从1开始
                    const index = arrayIndex + 1;

                    // 在传入JunkItem构造函数之前，替换raw数据中的字段
                    const [categoryIndex, groups] = raw;
                    const categoryName = strMap.get(categoryIndex) || `未知杂物${categoryIndex}`;

                    // 替换后的groups数据
                    const processedGroups = groups.map(([groupWeight, items]) => [
                        groupWeight,
                        items.map(([itemNameIndex, itemWeight, qualityWeights, gradeWeights]) => [
                            strMap.get(itemNameIndex) || `未知物品${itemNameIndex}`,
                            itemWeight,
                            qualityWeights,
                            gradeWeights,
                        ]),
                    ]);

                    // 替换后的raw数据
                    const processedRaw = [categoryName, processedGroups] as any;

                    // 不再传入strMap，因为已经完成了字段替换
                    resolve(new JunkItem(processedRaw, { index }));
                }, 0);
            });
        });

        // 等待所有JunkItem创建完成
        const result = await Promise.all(promises);

        // 将supplementary数据关联到对应的JunkItem实例
        if (data.supplementary && data.supplementary.length > 0) {
            // 创建uniqueCode到JunkItem的映射，方便快速查找
            const uniqueCodeMap = new Map<string, JunkItem>();
            result.forEach((item) => {
                uniqueCodeMap.set(item.uniqueCode, item);
            });

            // 收集未匹配的supplementary数据
            const unmatchedSupplements: IJunkSupplementary[] = [];

            // 遍历supplementary数据，关联到对应的JunkItem
            data.supplementary.forEach((supplement) => {
                const junkItem = uniqueCodeMap.get(supplement.id);
                if (junkItem) {
                    junkItem.supplementary = supplement;
                } else {
                    unmatchedSupplements.push(supplement);
                }
            });

            // 打印未匹配的supplementary数据到控制台
            if (unmatchedSupplements.length > 0) {
                console.log('未匹配的补充数据:');
                unmatchedSupplements.forEach((supplement) => {
                    console.log(supplement);
                });

                // 如果是管理员且有未匹配数据，发送消息通知
                if (MwConfig.getInstance().canEdit) {
                    // 使用setTimeout确保通知在DOM渲染完成后显示
                    setTimeout(() => {
                        window.wiz?.$message?.warning?.(
                            `发现${unmatchedSupplements.length}条未匹配的杂物补充数据，请检查Data:JunkSupplementary.tabx`,
                        );
                    }, 0);
                }
            }
        }

        return result;
    };

    // 更新杂物补充数据
    const updateSupplementaryData = (newData: any) => {
        const junkItem = junkItems.value.find((item) => item.uniqueCode === newData.id);
        if (junkItem) {
            junkItem.supplementary = newData;
        }
    };

    // 初始化所有杂物的详细数据
    const initAllJunkItemDetails = () => {
        junkItems.value.forEach((item) => {
            if (!item.isInit) {
                item.initJunkItem();
            }
        });
        isAllInit.value = true;
    };

    // 初始化特定杂物的详细数据
    const initJunkItemDetailByName = async (junkName: string) => {
        while (!isLoaded.value) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const junkItem = junkItems.value.find((item) => item.name === junkName);
        if (junkItem && !junkItem.isInit) {
            junkItem.initJunkItem();
        }
    };

    // 初始化特定杂物的详细数据
    const initJunkItemDetailByHash = async (junkHash: string) => {
        while (!isLoaded.value) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        const junkItem = junkItems.value.find((item) => item.uniqueCode === junkHash);
        if (junkItem && !junkItem.isInit) {
            junkItem.initJunkItem();
        }
    };

    // 初始化store时就加载数据
    const loadAndInitJunkData = async () => {
        await loadJunkData();
        // 缓存命中（已整理）或加载失败时都不用继续
        if (!isLoaded.value || isAllInit.value) return;
        initAllJunkItemDetails();
        // 整理完成后写入 IndexedDB，下次刷新（源数据未变）直接恢复
        if (sourceHash) {
            await writeJunkCache(
                sourceHash,
                junkItems.value.map((item) => item.toCache()),
            );
        }
    };

    return {
        junkItems,
        isAllInit,
        isLoading,
        isLoaded,
        loadJunkData,
        updateSupplementaryData,
        initAllJunkItemDetails,
        loadAndInitJunkData,
        initJunkItemDetailByName,
        initJunkItemDetailByHash,
    };
});
