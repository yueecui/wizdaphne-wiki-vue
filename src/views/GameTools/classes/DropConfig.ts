import { type IDropConfig, NEAR_TIME, type RecordConfig } from '../type';

export class DropConfig implements RecordConfig {
    constructor(public data: IDropConfig) {}

    get id() {
        return this.data.id;
    }

    get category() {
        return this.data.category;
    }

    get title() {
        return this.data.title;
    }

    get description() {
        return this.data.description || '';
    }

    get refreshMilliseconds() {
        const { days, hours } = this.data;
        return (days || 0) * 24 * 60 * 60 * 1000 + (hours || 0) * 60 * 60 * 1000;
    }

    get isCountdown() {
        return this.refreshMilliseconds > 0;
    }

    getRefreshTimeText() {
        const { days, hours } = this.data;
        const text = `${days ? days + '天' : ''}${hours ? hours + '小时' : ''}`;
        return text === '' ? '未知' : text;
    }

    getTargetTime(recordTime: number) {
        if (this.refreshMilliseconds > 0) {
            return recordTime + this.refreshMilliseconds;
        } else {
            return 0;
        }
    }

    // 根据记录时间和当前时间，参考本掉落的刷新时间配置，给出时间差
    getDifferenceTime(recordTime: number, currentTime: number) {
        if (this.refreshMilliseconds > 0) {
            return this.getTargetTime(recordTime) - currentTime;
        } else {
            return currentTime - recordTime;
        }
    }

    isNear(recordTime: number, currentTime: number) {
        if (!this.isCountdown) {
            return false;
        }
        const differenceTime = this.getDifferenceTime(recordTime, currentTime);
        return differenceTime < NEAR_TIME;
    }
}
