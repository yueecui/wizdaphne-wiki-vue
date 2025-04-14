import { toRefs } from 'vue';
import { useUtilStore } from '../../../stores/util';
import { useDropRecordStore } from '../dropRecordStore';

export const NEAR_TIME = 24 * 60 * 60 * 1000 * 1; // 1天内视为临期

// 写入操作需要拿到引用对象
export const updateLastRecordTime = (id: string, timestamp?: number) => {
    timestamp = timestamp ?? useUtilStore().currentTime;
    const { dropRecords } = toRefs(useDropRecordStore());
    const recordData = dropRecords.value.find((record) => record.id === id);
    if (recordData) {
        if (recordData.r.length > 0) {
            recordData.r[recordData.r.length - 1] = timestamp;
        } else {
            recordData.r.push(timestamp);
        }
    } else {
        dropRecords.value.push({
            id: id,
            r: [timestamp],
        });
    }
};

export const addNewRecordTime = (id: string, timestamp?: number) => {
    timestamp = timestamp ?? useUtilStore().currentTime;
    const { dropRecords } = toRefs(useDropRecordStore());
    const recordData = dropRecords.value.find((record) => record.id === id);
    if (recordData) {
        recordData.r.push(timestamp);
        recordData.lt = undefined;
    } else {
        dropRecords.value.push({
            id: id,
            r: [timestamp],
        });
    }
};

export const clearRecord = (id: string) => {
    const { dropRecords } = toRefs(useDropRecordStore());
    const recordIndex = dropRecords.value.findIndex((record) => record.id === id);
    if (recordIndex !== -1) {
        dropRecords.value.splice(recordIndex, 1);
    }
};
