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

export const addNewRecordTime = (id: string) => {
    const timestamp = useUtilStore().currentTime;
    const { dropRecords } = toRefs(useDropRecordStore());
    const recordData = dropRecords.value.find((record) => record.id === id);
    if (recordData) {
        recordData.r.push(timestamp);
        // 如果记录数超过100，则从前面删除
        if (recordData.r.length > 100) {
            recordData.r.splice(0, recordData.r.length - 100);
        }
        recordData.lt = undefined;
        recordData.h = undefined;
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

export const removeRecord = (id: string, index: number) => {
    const { dropRecords } = toRefs(useDropRecordStore());
    const recordData = dropRecords.value.find((record) => record.id === id);
    if (recordData) {
        recordData.r.splice(index, 1);
        if (recordData.r.length === 0) {
            clearRecord(id);
        }
    }
};

export const toggleHidden = (id: string) => {
    const { dropRecords } = toRefs(useDropRecordStore());
    const recordData = dropRecords.value.find((record) => record.id === id);
    if (recordData) {
        // 已有记录，切换隐藏状态
        recordData.h = recordData.h ? undefined : true;
    } else {
        // 没有记录，创建一条空记录用于存储隐藏状态
        dropRecords.value.push({
            id: id,
            r: [],
            h: true,
        });
    }
};
