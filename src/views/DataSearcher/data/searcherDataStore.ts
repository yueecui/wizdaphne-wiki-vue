import { useStorage } from '@vueuse/core';
import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import { IS_DEV } from '../../../util';
import type { IAchievementFilter } from '../Achievement/types';
import { Character } from '../Character/Character';
import type { ICharacterFilter } from '../Character/types';
import type { IEquipmentFilter } from '../Equipment/types';
import type { IItemFilter } from '../Item/types';
import type { IJunkFilter } from '../Junk/types';
import type { IRelicBrewFilter } from '../RelicBrew/types';
import { Skill } from '../Skill/Skill';
import type { ISkillFilter } from '../Skill/types';
import type { SimCharacterConfig } from '../StatCalculator/types';
import type { ICharacterStats, ISearcherExposeData } from './SearcherData.types';

// 统一存储键名
export const DATA_SEARCHER_STORAGE_KEY = 'dataSearcherSettings';

// 存储结构定义
export interface DataSearcherSettings {
    // 特典装备显示规则 (all/show/hide)
    soucateFilter: 'all' | 'show' | 'hide';
    // 装备加护排序方式 (attribute/probability)
    equipmentBonusOrder: 'attribute' | 'probability';

    // 角色过滤器
    characterFilter: ICharacterFilter;
    // 技能过滤器
    skillFilter: ISkillFilter;
    // 武器过滤器
    weaponFilter: IEquipmentFilter;
    // 防具过滤器
    armorFilter: IEquipmentFilter;
    // 杂物过滤器
    junkFilter: IJunkFilter;
    // 成就过滤器
    achievementFilter: IAchievementFilter;
    // 物品过滤器
    itemFilter: IItemFilter;
    // 遗物酒过滤器
    relicBrewFilter: IRelicBrewFilter;

    // 特性值配置
    statCalculator: {
        // 角色配置
        characterConfig: SimCharacterConfig;
        // 属性加成
        bonusStats: ICharacterStats;
        // 才能缘等级
        fateLevel: ICharacterStats;
        // 角色等级
        characterLevel: number;
        // 当前属性值
        currentStats: ICharacterStats;
    };

    // 能力值计算器配置
    abilityCalculator: {
        // 基础数值
        baseStats: ICharacterStats;
        // 选择的职业
        selectedJob: string;
    };
}

// 默认设置
export const DEFAULT_SETTINGS: DataSearcherSettings = {
    soucateFilter: 'all',
    equipmentBonusOrder: 'attribute',

    // 角色过滤器默认值
    characterFilter: {
        searchText: '',
        group: '',
        element: '',
        race: '',
        gender: '',
        personality: '',
        rarity: '',
        fate: '',
        class: [],
        onlyPrimary: true,
        discipline_tags: [],
        spFilter: 'all',
    },

    // 技能过滤器默认值
    skillFilter: {
        searchText: '',
        category: '',
        type: '',
    },

    // 武器过滤器默认值
    weaponFilter: {
        searchText: '',
        category: '',
        skill: '',
        showMaxLv: false,
        soucateFilter: 'all',
    },

    // 防具过滤器默认值
    armorFilter: {
        searchText: '',
        category: '',
        skill: '',
        showMaxLv: false,
        soucateFilter: 'all',
    },

    // 杂物过滤器默认值
    junkFilter: {
        searchText: '',
        maxQuality: 0,
        maxGrade: 0,
        maxTier: 0,
        junkAutoLoad: false,
    },

    // 成就过滤器默认值
    achievementFilter: {
        searchText: '',
        category: '',
        subCategory: '',
        completionStatus: 'incomplete',
        achievementAutoLoad: true,
    },

    // 物品过滤器默认值
    itemFilter: {
        searchText: '',
        category: '',
    },

    // 遗物酒过滤器默认值
    relicBrewFilter: {
        searchText: '',
        align: '',
        inc: '',
        dec: '',
        category: '', // 推荐类别过滤默认值为空
        showOnlyDoubleInc: false, // 仅显示双提升遗物过滤器默认关闭
        showBrewName: true, // 默认显示遗物酒名
        showRelicPower: true, // 默认显示遗物之力
    },

    // 特性值配置默认值
    statCalculator: {
        characterConfig: {
            race: '人类',
            gender: '男',
            element: '火',
            class: '战士',
            tier: 0,
        },
        bonusStats: {
            strength: 0,
            intelligence: 0,
            piety: 0,
            vitality: 0,
            dexterity: 0,
            speed: 0,
            luck: 0,
        },
        fateLevel: {
            strength: 0,
            intelligence: 0,
            piety: 0,
            vitality: 0,
            dexterity: 0,
            speed: 0,
            luck: 0,
        },
        characterLevel: 20,
        currentStats: {
            strength: 0,
            intelligence: 0,
            piety: 0,
            vitality: 0,
            dexterity: 0,
            speed: 0,
            luck: 0,
        },
    },

    // 能力值计算器默认值
    abilityCalculator: {
        baseStats: {
            strength: 0,
            intelligence: 0,
            piety: 0,
            vitality: 0,
            dexterity: 0,
            speed: 0,
            luck: 0,
        },
        selectedJob: '战士',
    },
};
export const useSearcherDataStore = defineStore('searcherData', () => {
    // 配置数据
    const data = ref<ISearcherExposeData | null>(null);

    // 使用VueUse的useStorage创建响应式存储
    const settings = useStorage<DataSearcherSettings>(DATA_SEARCHER_STORAGE_KEY, DEFAULT_SETTINGS, localStorage, {
        mergeDefaults: true,
    });
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

        return data.value.character.map((character) => {
            const characterRates = data.value!.characterRates.find((rate) => rate.name === character.name_jp);
            return new Character(character, characterRates);
        });
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

    // 获取默认遗物酒过滤器设置
    const getDefaultRelicBrewFilter = () => {
        return {
            ...DEFAULT_SETTINGS.relicBrewFilter,
        };
    };

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
        // 响应式设置存储
        settings,
        // 获取默认过滤器设置的方法
        getDefaultRelicBrewFilter,
    };
});
