import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../../util';
import { Equipment } from './Equpment';
import { IEquipmentSkill, type IEquipmentJson } from './types';

export const useEquipmentStore = defineStore('equipment', () => {
    // 配置数据
    const equipments = ref<Equipment[]>([]);
    const equipmentSkills = ref<IEquipmentSkill[]>([]);

    // 初始化状态
    const isInit = ref(false);

    // 初始化Promise用于等待数据加载完成
    const initPromise = new Promise<void>((resolve, reject) => {
        fetch(IS_DEV ? '/equipment.json' : '/api.php?action=lua&module=Api/GetEquipment&format=json&utf8=1').then(
            (res) => {
                if (res.ok) {
                    res.json().then((data: IEquipmentJson) => {
                        const base = data.equipments;
                        const levels = data.levels;
                        equipmentSkills.value = data.skill;

                        equipments.value = base.map((item) => new Equipment(item, levels[item.ba ?? item.n] ?? []));
                        isInit.value = true;
                        resolve();
                    });
                } else {
                    console.error('获取装备数据失败');
                    reject();
                }
            },
        );
    });

    // 等待初始化完成
    const waitForInit = async () => {
        await initPromise;
    };

    // 根据njp查找装备
    const getEquipmentByNJP = (njp: string) => {
        return equipments.value.find((equipment) => equipment.data.njp === njp);
    };

    return {
        equipments,
        equipmentSkills,
        isInit,
        initPromise,
        waitForInit,
        getEquipmentByNJP,
    };
});
