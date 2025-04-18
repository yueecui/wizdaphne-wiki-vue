import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../../util';
import { Equipment } from './Equpment';
import { IEquipmentSkill, type IEquipmentJson } from './types';

export const useEquipmentStore = defineStore('equipment', () => {
    // 配置数据
    const equipments = ref<Equipment[]>([]);
    const equipmentSkills = ref<IEquipmentSkill[]>([]);

    // 初始化
    const isInit = ref(false);
    fetch(IS_DEV ? '/equipment.json' : '/api.php?action=lua&module=Api/GetEquipment&format=json&utf8=1').then((res) => {
        if (res.ok) {
            res.json().then((data: IEquipmentJson) => {
                const base = data.equipments;
                const levels = data.levels;
                equipmentSkills.value = data.skill;

                equipments.value = base.map((item) => new Equipment(item, levels[item.n] ?? []));
                isInit.value = true;
            });
        } else {
            console.error('获取装备数据失败');
        }
    });

    return {
        equipments,
        equipmentSkills,
    };
});
