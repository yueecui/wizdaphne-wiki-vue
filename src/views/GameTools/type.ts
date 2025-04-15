export interface AbstractRecordConfig {
    id: string;
    category: number;
    title: string;
    description: string;
    refreshMilliseconds: number;
    isCountdown: boolean;
    hasHistory: boolean;
    canCheck: boolean;
    getRecordData(): IDropRecord | undefined;
    getRecordHistory(): number[];
    getLastRecord(): number;
    getLastCheck(): number;
    getNextTargetTime(): number;
    getRefreshTimeText: () => string;
    getDifferenceTime: (timestamp?: number) => number;
    isNear: () => boolean;
    getNearClass: () => string;
    getRemainTimeText: () => string;
    getLastCheckText: () => string;
    updateLastCheckTime: (timestamp?: number) => void;
    updateLastRecordTime: (timestamp?: number) => void;
    addNewRecordTime: (timestamp?: number) => void;
    clearRecord: () => void;
    removeRecord: (index: number) => void;
}
// localStorage存储的格式
export interface IDropRecord {
    id: string;
    r: number[]; // 记录的时间，最后一个是最新的
    timestamp?: number; // 旧的记录时间
    lt?: number; // 最后一次检查的记录时间
}

// 配置文件
export interface IDropConfigFile {
    drops: IDropConfig[];
    categorys: IDropCategory[];
}

export interface IDropConfig {
    index: number;
    id: string;
    category: number;
    title: string;
    description?: string;
    image?: string;
    min_interval: number;
    max_interval: number;
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
