import { defineStore } from 'pinia';
import { ref } from 'vue';
import { IS_DEV } from '../../../util';
import { Equipment } from './Equipment';
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

    // 更新装备强化属性
    const updateEquipmentEnhancedStats = (equipmentIdentifier: string, levelData: any[]) => {
        // 查找所有需要更新的装备
        const equipmentsToUpdate = equipments.value.filter((equipment) => {
            // 如果标识是ba，则查找所有ba相同的装备
            // 如果标识不是ba，则查找所有n或ba等于标识的装备
            return equipment.data.ba === equipmentIdentifier || equipment.data.n === equipmentIdentifier;
        });

        // 对每个找到的装备应用更新
        equipmentsToUpdate.forEach((equipment) => {
            // 遍历强化等级数据，更新装备的levels属性
            levelData.forEach((record) => {
                const level = record[1]; // 记录中的第二个元素是等级
                const stats = {
                    atk: record[2],
                    c: record[3],
                    mag: record[4],
                    div: record[5],
                    def: record[6],
                    mdef: record[7],
                    spe: record[8],
                    acc: record[9],
                    sur: record[10],
                    eva: record[11],
                    res: record[12],
                    lv: level,
                };

                // 查找是否已存在该等级的记录
                const existingIndex = equipment.levels.findIndex((item) => item.lv === level);
                if (existingIndex !== -1) {
                    // 如果存在，更新记录
                    equipment.levels[existingIndex] = stats;
                } else {
                    // 如果不存在，添加新记录
                    equipment.levels.push(stats);
                }
            });
        });
    };

    return {
        equipments,
        equipmentSkills,
        isInit,
        initPromise,
        waitForInit,
        getEquipmentByNJP,
        updateEquipmentEnhancedStats,
    };
});
