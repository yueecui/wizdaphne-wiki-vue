export interface TabxSchema<T = any> {
    description: {
        zh: string;
    };
    schema: {
        fields: {
            name: string;
            type: string;
            title: {
                en: string;
                zh: string;
            };
        }[];
    };
    data: T[][];
}

/**
 * 根据schema字段名获取字段索引
 * @param wikiData - 包含schema的wiki数据对象
 * @param fieldName - 字段名
 * @returns 字段索引，如果找不到则返回-1
 */
export const getFieldIndex = <T = any>(wikiData: TabxSchema<T>, fieldName: string): number => {
    if (!wikiData?.schema?.fields) {
        return -1;
    }
    return wikiData.schema.fields.findIndex((field) => field.name === fieldName);
};
