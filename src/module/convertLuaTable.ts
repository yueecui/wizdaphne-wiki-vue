export function convertLuaTable(table: Record<string, any>) {
    const key_list = Object.keys(table);
    if (key_list.length === 0) {
        return [];
    }
    if (key_list[0] === '1' && key_list[key_list.length - 1] === String(key_list.length)) {
        key_list.sort((a: string, b: string) => {
            return Number(a) - Number(b);
        });
        const result = [] as any[];
        for (const key of key_list) {
            if (typeof table[key] === 'object') {
                result.push(convertLuaTable(table[key]));
            } else {
                result.push(table[key]);
            }
        }
        return result;
    } else {
        for (const [key, value] of Object.entries(table)) {
            if (typeof value === 'object') {
                table[key] = convertLuaTable(value);
            } else {
                table[key] = value;
            }
        }
    }
    return table;
}
