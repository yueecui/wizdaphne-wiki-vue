// localStorage存储的格式
export interface IDropRecord {
    id: string;
    timestamp: number;
}

// 配置文件
export interface IDropConfigFile {
    drops: IDropConfig[];
    categorys: IDropCategory[];
}

export interface IDropConfig {
    id: string;
    category: number;
    title: string;
    description?: string;
    image?: string;
    days: number;
    hours: number;
}

export interface IDropCategory {
    i: number;
    name: string;
}
