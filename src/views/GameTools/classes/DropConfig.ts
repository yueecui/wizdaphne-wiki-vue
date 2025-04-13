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
        return (this.data.min_interval ?? 0) * 60 * 60 * 1000;
    }

    get isCountdown() {
        return this.refreshMilliseconds > 0;
    }

    getRefreshTimeText() {
        const { min_interval, step } = this.data;
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
        if (step) {
            if (step < 96) {
                texts.push(`${step}小时`);
            } else {
                const days = Math.floor(step / 24);
                const hours = step % 24;
                if (hours === 0) {
                    texts.push(`${days}天`);
                } else {
                    texts.push(`${days}天${hours}小时`);
                }
            }
        }
        return texts.join('+');
    }

    getTargetTime(recordTime: number) {
        if (this.isCountdown) {
            return recordTime + this.refreshMilliseconds;
        } else {
            return 0;
        }
    }

    // 根据记录时间和当前时间，参考本掉落的刷新时间配置，给出时间差
    getDifferenceTime(recordTime: number, currentTime: number) {
        if (this.isCountdown) {
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

    getNearClass(recordTime: number, currentTime: number) {
        if (!this.isCountdown) {
            return '';
        }
        const differenceTime = this.getDifferenceTime(recordTime, currentTime);
        // 如果为正数表示还未到达目标时间
        if (differenceTime > 0) {
            return 'text-green-700';
        } else {
            if (this.data.step) {
                // const stepMilliseconds = this.data.step * 60 * 60 * 1000;
                // const step_times = Math.floor(Math.abs(differenceTime) / stepMilliseconds);
                // if (step_times === 0) {
                //     return `text-green-700 level-${step_times}`;
                // } else if (step_times === 1) {
                //     return `text-green-600 level-${step_times}`;
                // } else if (step_times === 2) {
                //     return `text-green-500 level-${step_times}`;
                // } else if (step_times >= 3) {
                //     return `text-green-400 level-${step_times}`;
                // }
                // return `text-green-400 level-${step_times}`;
                return 'text-green-400';
            } else {
                return 'text-green-400';
            }
        }
    }
}
