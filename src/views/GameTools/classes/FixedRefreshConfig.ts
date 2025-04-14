import { useUtilStore } from '../../../stores/util';
import { useDropRecordStore } from '../dropRecordStore';
import { type AbstractRecordConfig, type IFixedRefreshConfig } from '../type';
import { formatTimeFromMilliseconds } from '../util';
import { addNewRecordTime, clearRecord, NEAR_TIME, updateLastRecordTime } from './recordConfigUtil';

export const TEMPLE_REFRESH_TIME = new Date('2025-04-05T23:00:00+08:00').getTime(); // 炉壶的神庙刷新时间戳

export class FixedRefreshConfig implements AbstractRecordConfig {
    constructor(public data: IFixedRefreshConfig) {}

    get id() {
        return this.data.id;
    }

    get category() {
        return -1;
    }

    get title() {
        return this.data.title;
    }

    get description() {
        return this.data.description || '';
    }

    get refreshMilliseconds() {
        return 0;
    }

    get isCountdown() {
        return true;
    }

    getRecordData() {
        return useDropRecordStore().dropRecords.find((record) => record.id === this.id);
    }

    getRecords() {
        return this.getRecordData()?.r ?? [];
    }

    getLastRecord() {
        const records = this.getRecords();
        if (records.length > 0) {
            return records[records.length - 1];
        }
        return 0;
    }

    getLastCheck() {
        return 0;
    }

    getRefreshTimeText() {
        return this.data.refreshText;
    }

    getNextTargetTime() {
        // 目前有两种，都只能单独处理，根据刷新文本识别
        // 双周六晚23点：2025年4月5日23点开始，每两周的周六晚23点
        // 每周日晚23点：每周的周日晚23点
        const recordTime = this.getLastRecord();
        if (this.data.refreshType === '双周六') {
            let nextSaturday = getNextTargetDay23(new Date(recordTime), 6);
            const days = (nextSaturday.getTime() - TEMPLE_REFRESH_TIME) / (1000 * 60 * 60 * 24);
            if (days % 14 !== 0) {
                // 如果不是双周六，则加上7天
                nextSaturday.setDate(nextSaturday.getDate() + 7);
            }
            // 如果不是UTC+8时区，则根据时区偏移量调整修正为UTC+8时区的时间
            const offset = nextSaturday.getTimezoneOffset();

            if (offset !== -480) {
                const offset_minutes = offset - -480;
                nextSaturday = new Date(nextSaturday.getTime() + offset_minutes * 60 * 1000);
            }

            return nextSaturday.getTime();
        } else if (this.data.refreshType === '每周日') {
            let nextSunday = getNextTargetDay23(new Date(recordTime), 0);
            // 如果不是UTC+8时区，则根据时区偏移量调整修正为UTC+8时区的时间
            const offset = nextSunday.getTimezoneOffset();
            if (offset !== -480) {
                const offset_minutes = -480 - offset;
                nextSunday = new Date(nextSunday.getTime() + offset_minutes * 60 * 1000);
            }
            return nextSunday.getTime();
        }
        return 0;
    }

    // 根据记录时间和当前时间，参考本掉落的刷新时间配置，给出时间差
    getDifferenceTime(timestamp?: number) {
        timestamp = timestamp ?? useUtilStore().currentTime;
        return this.getNextTargetTime() - timestamp;
    }

    isNear() {
        if (!this.getLastRecord()) {
            return true; // 没有记录的话也要显示
        }
        const differenceTime = this.getDifferenceTime();
        return differenceTime < NEAR_TIME;
    }

    getNearClass() {
        if (!this.isCountdown) {
            return '';
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
}

// 计算下一个指定周几的23点
// weekDay: 0（周日）到6（周六）
function getNextTargetDay23(givenDate, weekday: number) {
    // 创建基准备日期，时间设为当天的23:00:00
    const baseDate = new Date(givenDate);
    // 获取当前的UTC时间
    baseDate.setHours(23, 0, 0, 0);

    // 计算到下一个周X所需的天数
    const currentDay = baseDate.getDay();
    const daysToAdd = (weekday + 7 - currentDay) % 7;

    // 调整到下一个周X的23点
    const nextSaturday = new Date(baseDate);
    nextSaturday.setDate(baseDate.getDate() + daysToAdd);

    // 若计算结果仍早于原时间，则加一周
    if (nextSaturday < givenDate) {
        nextSaturday.setDate(nextSaturday.getDate() + 7);
    }

    return nextSaturday;
}
