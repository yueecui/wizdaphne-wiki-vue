import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../../util';
import { Equipment } from './Equpment';
import type { IEquipmentJson } from './types';

export const useEquipmentStore = defineStore('equipment', () => {
    // 配置数据
    const equipments = ref<Equipment[]>([]);

    // 初始化
    const isInit = ref(false);
    fetch(IS_DEV ? '/equipment.json' : '/api.php?action=lua&module=Api/GetEquipment&format=json&utf8=1').then((res) => {
        if (res.ok) {
            res.json().then((data: IEquipmentJson) => {
                const baseEquipments = data.equipments.filter((item) => item.enhance_level === 0);
                const equipmentsWithEnhance = data.equipments.filter((item) => item.enhance_level > 0);

                equipments.value = baseEquipments.map(
                    (item) =>
                        new Equipment(
                            item,
                            item.name ? equipmentsWithEnhance.filter((enhance) => enhance.name === item.name) : [],
                        ),
                );
                isInit.value = true;
            });
        } else {
            console.error('获取装备数据失败');
        }
    });

    return {
        equipments,
    };
});
