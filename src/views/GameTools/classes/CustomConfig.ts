import { useUtilStore } from '../../../stores/util';
import { useDropRecordStore } from '../dropRecordStore';
import { type AbstractRecordConfig, type ICustomConfig } from '../type';
import { formatTimeFromMilliseconds } from '../util';

export class CustomConfig implements AbstractRecordConfig {
    constructor(public data: ICustomConfig) {}

    get id() {
        return this.data.id;
    }

    get category() {
        return -1; // 自定义项使用 -1 作为分类标识
    }

    get title() {
        return this.data.title;
    }

    get description() {
        return this.data.description || '';
    }

    get refreshMilliseconds() {
        if (this.data.refreshType === '自定义') {
            return (this.data.refreshHours ?? 0) * 60 * 60 * 1000;
        }
        return 0; // 固定周期类型返回 0，使用 getNextTargetTime 计算
    }

    get isCountdown() {
        return this.data.refreshType === '自定义' && this.refreshMilliseconds > 0;
    }

    get isHidden() {
        return this.getRecordData()?.h ?? false;
    }

    get isJunk() {
        return this.data.isJunk;
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
        return useDropRecordStore().dropRecords.find((record) => record.id === this.id && record.c === true);
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

    getNextTargetTime() {
        const lastRecord = this.getLastRecord();
        if (this.data.refreshType === '自定义') {
            if (lastRecord === 0) {
                return 0;
            }
            return lastRecord + this.refreshMilliseconds;
        } else {
            // 固定周期类型
            return this.getFixedTargetTime(lastRecord || Date.now());
        }
    }

    private getFixedTargetTime(recordTime: number): number {
        const refreshType = this.data.refreshType;
        if (refreshType === '每周六') {
            return this.getNextSaturday23(new Date(recordTime));
        } else if (refreshType === '每周日') {
            return this.getNextSunday23(new Date(recordTime));
        } else if (refreshType === '双周六') {
            return this.getNextDoubleSaturday23(new Date(recordTime));
        } else if (refreshType === '双周日') {
            return this.getNextDoubleSunday23(new Date(recordTime));
        }
        return 0;
    }

    private getNextSaturday23(date: Date): number {
        const result = new Date(date);
        result.setDate(result.getDate() + ((6 + 7 - result.getDay()) % 7));
        result.setHours(23, 0, 0, 0);
        if (result.getTime() <= date.getTime()) {
            result.setDate(result.getDate() + 7);
        }
        return this.toUTC8(result);
    }

    private getNextSunday23(date: Date): number {
        const result = new Date(date);
        result.setDate(result.getDate() + ((0 + 7 - result.getDay()) % 7));
        result.setHours(23, 0, 0, 0);
        if (result.getTime() <= date.getTime()) {
            result.setDate(result.getDate() + 7);
        }
        return this.toUTC8(result);
    }

    private getNextDoubleSaturday23(date: Date): number {
        // 以 2025年4月5日（双周六）为基准
        const BASE_TIME = new Date('2025-04-05T23:00:00+08:00').getTime();
        let nextSaturday = this.getNextSaturday23(date);
        const days = (nextSaturday - BASE_TIME) / (1000 * 60 * 60 * 24);
        if (Math.round(days) % 14 !== 0) {
            nextSaturday += 7 * 24 * 60 * 60 * 1000;
        }
        return nextSaturday;
    }

    private getNextDoubleSunday23(date: Date): number {
        // 以 2025年4月6日（双周日）为基准
        const BASE_TIME = new Date('2025-04-06T23:00:00+08:00').getTime();
        let nextSunday = this.getNextSunday23(date);
        const days = (nextSunday - BASE_TIME) / (1000 * 60 * 60 * 24);
        if (Math.round(days) % 14 !== 0) {
            nextSunday += 7 * 24 * 60 * 60 * 1000;
        }
        return nextSunday;
    }

    private toUTC8(date: Date): number {
        const offset = date.getTimezoneOffset();
        if (offset !== -480) {
            const offsetMinutes = -480 - offset;
            return date.getTime() + offsetMinutes * 60 * 1000;
        }
        return date.getTime();
    }

    getRefreshTimeText(mode: 'range' | 'plus' = 'range'): string {
        if (this.data.refreshType === '自定义') {
            const hours = this.data.refreshHours;
            if (hours <= 0) {
                return '未知';
            } else if (hours <= 96) {
                return `${hours}小时`;
            } else {
                const days = Math.floor(hours / 24);
                const remainingHours = hours % 24;
                if (remainingHours === 0) {
                    return `${days}天`;
                } else {
                    return `${days}天${remainingHours}小时`;
                }
            }
        } else {
            return this.data.refreshType;
        }
    }

    hasMaxInterval(): boolean {
        return false;
    }

    getDifferenceTime(timestamp?: number) {
        timestamp = timestamp ?? useUtilStore().currentTime;
        return this.getNextTargetTime() - timestamp;
    }

    isNear() {
        if (!this.isCountdown && this.data.refreshType === '自定义') {
            return false;
        }
        const nextTargetTime = this.getNextTargetTime();
        if (nextTargetTime === 0) {
            return false;
        }
        const differenceTime = this.getDifferenceTime();
        // 14天 = 14 * 24 * 60 * 60 * 1000 = 1209600000 毫秒
        const fourteenDays = 14 * 24 * 60 * 60 * 1000;
        // 3天 = 3 * 24 * 60 * 60 * 1000 = 259200000 毫秒
        const threeDays = 3 * 24 * 60 * 60 * 1000;
        // 1天 = 24 * 60 * 60 * 1000 = 86400000 毫秒
        const oneDay = 24 * 60 * 60 * 1000;

        if (this.data.refreshType === '自定义') {
            if (this.refreshMilliseconds >= fourteenDays) {
                return differenceTime < threeDays;
            } else {
                return differenceTime < oneDay;
            }
        } else {
            // 固定周期类型
            if (this.data.refreshType?.startsWith('双')) {
                return differenceTime < threeDays;
            } else {
                return differenceTime < oneDay;
            }
        }
    }

    getNearClass(): string {
        if (this.data.refreshType === '自定义' && !this.isCountdown) {
            return '';
        }
        if (this.isHidden) {
            return 'text-gray-400';
        }
        if (this.getLastRecord() === 0) {
            return '';
        }
        const differenceTime = this.getDifferenceTime();
        if (differenceTime > 0) {
            return 'text-green-700';
        } else {
            return 'text-green-400';
        }
    }

    getRemainTimeText(): string {
        const nextTargetTime = this.getNextTargetTime();
        if (nextTargetTime === 0) {
            return '-';
        }
        const differenceTime = this.getDifferenceTime();
        if (differenceTime > 0) {
            return formatTimeFromMilliseconds(differenceTime);
        } else {
            return '已刷新 ' + formatTimeFromMilliseconds(-differenceTime);
        }
    }

    getLastCheckText(): string {
        const lastCheck = this.getLastCheck();
        if (lastCheck === 0) {
            return '-';
        }
        return new Date(lastCheck).toLocaleString();
    }

    updateLastCheckTime(timestamp?: number) {
        timestamp = timestamp ?? useUtilStore().currentTime;
        const { dropRecords } = useDropRecordStore();
        const recordData = dropRecords.find((record) => record.id === this.id && record.c === true);
        if (recordData) {
            recordData.lt = timestamp;
        } else {
            dropRecords.push({
                id: this.id,
                r: [],
                lt: timestamp,
                c: true, // 标记为自定义项
            });
        }
    }

    updateLastRecordTime(timestamp?: number) {
        timestamp = timestamp ?? useUtilStore().currentTime;
        const { dropRecords } = useDropRecordStore();
        const recordData = dropRecords.find((record) => record.id === this.id && record.c === true);
        if (recordData) {
            if (recordData.r.length > 0) {
                recordData.r[recordData.r.length - 1] = timestamp;
            } else {
                recordData.r.push(timestamp);
            }
        } else {
            dropRecords.push({
                id: this.id,
                r: [timestamp],
                c: true, // 标记为自定义项
            });
        }
    }

    addNewRecordTime() {
        const timestamp = useUtilStore().currentTime;
        const { dropRecords } = useDropRecordStore();
        const recordData = dropRecords.find((record) => record.id === this.id && record.c === true);
        if (recordData) {
            recordData.r.push(timestamp);
            // 如果记录数超过100，则从前面删除
            if (recordData.r.length > 100) {
                recordData.r.splice(0, recordData.r.length - 100);
            }
            recordData.lt = undefined;
            recordData.h = undefined;
        } else {
            dropRecords.push({
                id: this.id,
                r: [timestamp],
                c: true, // 标记为自定义项
            });
        }
    }

    clearRecord() {
        const { dropRecords } = useDropRecordStore();
        const recordIndex = dropRecords.findIndex((record) => record.id === this.id && record.c === true);
        if (recordIndex !== -1) {
            dropRecords.splice(recordIndex, 1);
        }
    }

    removeRecord(index: number) {
        const { dropRecords } = useDropRecordStore();
        const recordData = dropRecords.find((record) => record.id === this.id && record.c === true);
        if (recordData) {
            recordData.r.splice(index, 1);
            if (recordData.r.length === 0) {
                this.clearRecord();
            }
        }
    }

    toggleHidden() {
        const { dropRecords } = useDropRecordStore();
        const recordData = dropRecords.find((record) => record.id === this.id && record.c === true);
        if (recordData) {
            recordData.h = recordData.h ? undefined : true;
        } else {
            // 没有记录，创建一条空记录用于存储隐藏状态
            dropRecords.push({
                id: this.id,
                r: [],
                h: true,
                c: true, // 标记为自定义项
            });
        }
    }
}
