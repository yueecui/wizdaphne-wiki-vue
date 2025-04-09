export const NEAR_TIME = 24 * 60 * 60 * 1000 * 1; // 1天内视为临期
export const TEMPLE_REFRESH_TIME = new Date('2025-04-05T23:00:00+08:00').getTime(); // 炉壶的神庙刷新时间戳

export interface RecordConfig {
    id: string;
    category: number;
    title: string;
    description: string;
    refreshMilliseconds: number;
    isCountdown: boolean;
    getRefreshTimeText: () => string;
    getTargetTime: (recordTime: number) => number;
    getDifferenceTime: (recordTime: number, currentTime: number) => number;
    isNear: (recordTime: number, currentTime: number) => boolean;
}

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

export interface IFixedRefreshConfig {
    id: string;
    title: string;
    description: string;
    refreshType: '双周六' | '每周日';
    refreshText: string;
    link?: string;
    linkText?: string;
}
