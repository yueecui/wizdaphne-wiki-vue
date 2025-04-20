import { useUtilStore } from '../../../stores/util';
import { useDropRecordStore } from '../dropRecordStore';
import { type AbstractRecordConfig, type IDropConfig } from '../type';
import { formatTimeFromMilliseconds } from '../util';
import {
    addNewRecordTime,
    clearRecord,
    NEAR_TIME,
    removeRecord,
    toggleHidden,
    updateLastRecordTime,
} from './recordConfigUtil';

export class DropConfig implements AbstractRecordConfig {
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
        return (this.data.min_interval ?? 0) * 60 * 60 * 1000;
    }

    get isCountdown() {
        return this.refreshMilliseconds > 0;
    }

    get isHidden() {
        return this.getRecordData()?.h ?? false;
    }

    get hasHidden() {
        return true;
    }

    get hasHistory() {
        return this.getRecordHistory().length > 0;
    }

    get canCheck() {
        return true;
    }

    getRecordData() {
        return useDropRecordStore().dropRecords.find((record) => record.id === this.id);
    }

    getRecordHistory() {
        return this.getRecordData()?.r ?? [];
    }

    getLastRecord() {
        const records = this.getRecordHistory();
        if (records.length > 0) {
            return records[records.length - 1];
        }
        return 0;
    }

    getLastCheck() {
        return this.getRecordData()?.lt ?? 0;
    }

    getRefreshTimeText(mode: 'range' | 'plus' = 'range') {
        const { min_interval, max_interval } = this.data;
        const texts: string[] = [];
        if (min_interval <= 0) {
            return '未知';
        } else if (min_interval <= 96) {
            texts.push(`${min_interval}小时`);
        } else {
            const days = Math.floor(min_interval / 24);
            const hours = min_interval % 24;
            if (hours === 0) {
                texts.push(`${days}天`);
            } else {
                texts.push(`${days}天${hours}小时`);
            }
        }
        if (max_interval) {
            const t = mode === 'range' ? max_interval : max_interval - min_interval;
            if (t < 96) {
                texts.push(`${t}小时`);
            } else {
                const days = Math.floor(t / 24);
                const hours = t % 24;
                if (hours === 0) {
                    texts.push(`${days}天`);
                } else {
                    texts.push(`${days}天${hours}小时`);
                }
            }
        }
        return mode === 'range' ? texts.join('～') : texts.join('+');
    }

    hasMaxInterval() {
        return (this.data.max_interval ?? 0) > 0;
    }

    getNextTargetTime() {
        if (this.isCountdown && this.getLastRecord()) {
            return this.getLastRecord() + this.refreshMilliseconds;
        } else {
            return 0;
        }
    }

    // 根据记录时间和当前时间，参考本掉落的刷新时间配置，给出时间差
    getDifferenceTime(timestamp?: number) {
        timestamp = timestamp ?? useUtilStore().currentTime;
        if (this.isCountdown) {
            return this.getNextTargetTime() - timestamp;
        } else {
            return timestamp - this.getLastRecord();
        }
    }

    // 是否显示在「待办项目」
    isNear() {
        if (!this.isCountdown) {
            return false;
        }
        if (this.getNextTargetTime() === 0) {
            return false;
        }
        const differenceTime = this.getDifferenceTime();
        return differenceTime < NEAR_TIME;
    }

    // 用于在近期列表里获取不同的颜色来表示是否临期
    getNearClass() {
        if (!this.isCountdown) {
            return '';
        }
        if (this.getLastRecord() === 0) {
            return '';
        }
        if (this.isHidden) {
            return 'text-gray-400';
        }
        const differenceTime = this.getDifferenceTime();
        // 如果为正数表示还未到达目标时间
        if (differenceTime > 0) {
            return 'text-green-700';
        } else {
            return 'text-green-400';
        }
    }

    getRemainTimeText() {
        if (!this.getLastRecord()) {
            return '-';
        }

        const diff = this.getDifferenceTime();
        if (this.isCountdown) {
            if (diff <= 0) {
                return `已过 ${formatTimeFromMilliseconds(-diff)}`;
            }
            return formatTimeFromMilliseconds(diff);
        } else {
            return `已过 ${formatTimeFromMilliseconds(diff)}`;
        }
    }

    getLastCheckText() {
        const lastCheck = this.getLastCheck();
        if (lastCheck) {
            const diff = this.getDifferenceTime(lastCheck);
            if (this.isCountdown) {
                if (diff <= 0) {
                    return `已过 ${formatTimeFromMilliseconds(-diff)}`;
                }
                return formatTimeFromMilliseconds(diff);
            } else {
                // 等于0时不知道刷新时间，所以改为已经经过的时间
                return formatTimeFromMilliseconds(diff);
            }
        } else {
            return '-';
        }
    }

    updateLastCheckTime(timestamp?: number) {
        const record = this.getRecordData();
        if (record) {
            record.lt = timestamp ?? useUtilStore().currentTime;
        }
    }

    // 写入操作需要拿到引用对象
    updateLastRecordTime(timestamp?: number) {
        updateLastRecordTime(this.id, timestamp);
    }

    addNewRecordTime() {
        addNewRecordTime(this.id);
    }

    clearRecord() {
        clearRecord(this.id);
    }

    removeRecord(index: number) {
        removeRecord(this.id, index);
    }

    toggleHidden() {
        toggleHidden(this.id);
    }
}
