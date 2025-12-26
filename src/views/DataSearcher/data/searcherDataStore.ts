import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { IS_DEV } from '../../../util';
import { Character } from '../Character/Character';
import { Skill } from '../Skill/Skill';
import type { ICharacterStats, ISearcherExposeData } from './SearcherData.types';

export const useSearcherDataStore = defineStore('searcherData', () => {
    // 配置数据
    const data = ref<ISearcherExposeData | null>(null);

    // 初始化状态
    const isInit = ref(false);

    // 异步拉取数据
    const fetchData = async () => {
        if (isInit.value || data.value) {
            return;
        }

        try {
            const response = await fetch(
                IS_DEV ? '/data.json' : '/api.php?action=lua&module=Api/GetSearcherData&format=json&utf8=1',
            );
            if (response.ok) {
                const result = await response.json();
                data.value = result;
                isInit.value = true;
            } else {
                console.error('获取搜索数据失败');
            }
        } catch (error) {
            console.error('获取搜索数据出错:', error);
        }
    };

    // 计算角色属性
    const calculateStats = (charData: { race: string; gender: string; element: string; class: string }) => {
        if (!data.value) {
            console.error('数据未初始化');
            return null;
        }

        const stats: ICharacterStats = {
            strength: 10,
            intelligence: 10,
            piety: 10,
            vitality: 10,
            dexterity: 10,
            speed: 10,
            luck: 10,
        };

        const classStats = data.value.characterConfig.CLASS_STAT_CONFIG[charData.class] ?? {};
        const elementStats = data.value.characterConfig.ELEMNET_STAT_CONFIG[charData.element] ?? {};
        const genderStats = data.value.characterConfig.GENDER_STAT_CONFIG[charData.gender] ?? {};
        const raceStats = data.value.characterConfig.RACE_STAT_CONFIG[charData.race] ?? {};

        // 计算属性
        const result = [classStats, elementStats, genderStats, raceStats].reduce((acc, stat) => {
            Object.keys(stat).forEach((key) => {
                acc[key] = (acc[key] as number) + (stat[key] as number);
            });
            return acc;
        }, stats);

        return result as ICharacterStats;
    };

    // 获取角色列表（计算属性）
    const characterList = computed(() => {
        if (!data.value) {
            return [];
        }
        return data.value.character.map((character) => new Character(character));
    });

    // 获取角色数据
    const getCharacterData = (characterKey: string) => {
        if (!data.value) {
            return undefined;
        }
        return data.value.character.find((character) => character.key === characterKey);
    };

    // 获取技能列表（计算属性）
    const skillList = computed(() => {
        if (!data.value) {
            return [];
        }
        return data.value.skill.map((skill) => new Skill(skill));
    });

    // 获取技能数据
    const getSkillData = (skillName: string) => {
        if (!data.value) {
            return undefined;
        }
        return data.value.skill.find((skill) => skill.name === skillName);
    };

    // 获取属性配置
    const getStatSet = (kind: string) => {
        if (!data.value) {
            return null;
        }

        if (kind === 'race') {
            return data.value.characterConfig.RACE_STAT_CONFIG;
        } else if (kind === 'gender') {
            return data.value.characterConfig.GENDER_STAT_CONFIG;
        } else if (kind === 'element') {
            return data.value.characterConfig.ELEMNET_STAT_CONFIG;
        } else if (kind === 'class') {
            return data.value.characterConfig.CLASS_STAT_CONFIG;
        } else {
            return null;
        }
    };

    // 获取所有职业（计算属性）
    const allClass = computed(() => {
        if (!data.value) {
            return [];
        }

        const classList = [...data.value.standardClass];
        for (const key in data.value.characterConfig.CLASS_STAT_CONFIG) {
            if (!classList.includes(key)) {
                classList.push(key);
            }
        }
        return classList;
    });

    // 响应式的标准职业列表
    const allStandardClass = computed(() => {
        if (!data.value) {
            return [];
        }
        return data.value.standardClass;
    });

    // 自动拉取数据
    fetchData();

    return {
        data,
        isInit,
        calculateStats,
        getCharacterList: characterList,
        getCharacterData,
        getSkillList: skillList,
        getSkillData,
        getStatSet,
        getAllClass: allClass,
        allStandardClass,
    };
});
