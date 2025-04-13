import { type IFixedRefreshConfig, NEAR_TIME, type RecordConfig, TEMPLE_REFRESH_TIME } from '../type';

export class FixedRefreshConfig implements RecordConfig {
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

    // 固定刷新时间不用这个项目
    get refreshMilliseconds() {
        return 0;
    }

    get isCountdown() {
        return true;
    }

    getRefreshTimeText() {
        return this.data.refreshText;
    }

    getTargetTime(recordTime: number) {
        // 目前有两种，都只能单独处理，根据刷新文本识别
        // 双周六晚23点：2025年4月5日23点开始，每两周的周六晚23点
        // 每周日晚23点：每周的周日晚23点
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
    getDifferenceTime(recordTime: number, currentTime: number) {
        return this.getTargetTime(recordTime) - currentTime;
    }

    isNear(recordTime: number, currentTime: number) {
        if (!this.isCountdown) {
            return false;
        }
        if (!recordTime) {
            return true; // 没有记录的话也要显示
        }
        const differenceTime = this.getDifferenceTime(recordTime, currentTime);
        return differenceTime < NEAR_TIME;
    }

    getNearClass(recordTime: number, currentTime: number) {
        if (!this.isCountdown) {
            return '';
        }
        const differenceTime = this.getDifferenceTime(recordTime, currentTime);
        // 如果为正数表示还未到达目标时间
        if (differenceTime > 0) {
            return 'text-green-700';
        } else {
            return 'text-green-400';
        }
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
