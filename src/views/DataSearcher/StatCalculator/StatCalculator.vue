<template>
    <div class="flex flex-col gap-4">
        <div>
            <table class="wiztable text-center text-sm">
                <thead>
                    <tr class="text-base">
                        <th class="md:w-[8em]">项目</th>
                        <th class="md:w-[5em]">力</th>
                        <th class="md:w-[5em]">智慧</th>
                        <th class="md:w-[5em]">信仰心</th>
                        <th class="md:w-[5em]">生命力</th>
                        <th class="md:w-[5em]">灵巧</th>
                        <th class="md:w-[5em]">敏捷</th>
                        <th class="md:w-[5em]">幸运</th>
                    </tr>
                </thead>
                <tbody>
                    <tr class="bg-yellow-800">
                        <th class="text-base">基础</th>
                        <td>10</td>
                        <td>10</td>
                        <td>10</td>
                        <td>10</td>
                        <td>10</td>
                        <td>10</td>
                        <td>10</td>
                    </tr>
                    <tr class="bg-amber-700">
                        <th colspan="8"></th>
                    </tr>
                    <tr
                        v-for="(race, i) in RACE_TYPE"
                        :key="i"
                        :class="
                            race === simCharacterConfig.race ? 'bg-yellow-800' : ' cursor-pointer hover:bg-yellow-700'
                        "
                        @click="() => (simCharacterConfig.race = race)"
                    >
                        <th class="text-base">{{ race }}</th>
                        <td>{{ getStatSet('race', race, 'strength') }}</td>
                        <td>{{ getStatSet('race', race, 'intelligence') }}</td>
                        <td>{{ getStatSet('race', race, 'piety') }}</td>
                        <td>{{ getStatSet('race', race, 'vitality') }}</td>
                        <td>{{ getStatSet('race', race, 'dexterity') }}</td>
                        <td>{{ getStatSet('race', race, 'speed') }}</td>
                        <td>{{ getStatSet('race', race, 'luck') }}</td>
                    </tr>
                    <tr class="bg-amber-700">
                        <th colspan="8"></th>
                    </tr>
                    <tr
                        v-for="(gender, i) in GENDER_TYPE"
                        :key="i"
                        :class="
                            gender === simCharacterConfig.gender
                                ? 'bg-yellow-800'
                                : ' cursor-pointer hover:bg-yellow-700'
                        "
                        @click="() => (simCharacterConfig.gender = gender)"
                    >
                        <th class="text-base">{{ gender }}</th>
                        <td>{{ getStatSet('gender', gender, 'strength') }}</td>
                        <td>{{ getStatSet('gender', gender, 'intelligence') }}</td>
                        <td>{{ getStatSet('gender', gender, 'piety') }}</td>
                        <td>{{ getStatSet('gender', gender, 'vitality') }}</td>
                        <td>{{ getStatSet('gender', gender, 'dexterity') }}</td>
                        <td>{{ getStatSet('gender', gender, 'speed') }}</td>
                        <td>{{ getStatSet('gender', gender, 'luck') }}</td>
                    </tr>
                    <tr class="bg-amber-700">
                        <th colspan="8"></th>
                    </tr>
                    <tr
                        v-for="(element, i) in ELEMENT_TYPE"
                        :key="i"
                        :class="
                            element === simCharacterConfig.element
                                ? 'bg-yellow-800'
                                : ' cursor-pointer hover:bg-yellow-700'
                        "
                        @click="() => (simCharacterConfig.element = element)"
                    >
                        <th class="text-base">{{ element }}</th>
                        <td>{{ getStatSet('element', element, 'strength') }}</td>
                        <td>{{ getStatSet('element', element, 'intelligence') }}</td>
                        <td>{{ getStatSet('element', element, 'piety') }}</td>
                        <td>{{ getStatSet('element', element, 'vitality') }}</td>
                        <td>{{ getStatSet('element', element, 'dexterity') }}</td>
                        <td>{{ getStatSet('element', element, 'speed') }}</td>
                        <td>{{ getStatSet('element', element, 'luck') }}</td>
                    </tr>
                    <tr class="bg-amber-700">
                        <th colspan="8"></th>
                    </tr>
                    <tr
                        v-for="(className, i) in exposeData.getAllClass()"
                        :key="i"
                        :class="
                            className === simCharacterConfig.class
                                ? 'bg-yellow-800'
                                : ' cursor-pointer hover:bg-yellow-700'
                        "
                        @click="() => (simCharacterConfig.class = className)"
                    >
                        <th class="text-base">{{ className }}</th>
                        <td>{{ getStatSet('class', className, 'strength') }}</td>
                        <td>{{ getStatSet('class', className, 'intelligence') }}</td>
                        <td>{{ getStatSet('class', className, 'piety') }}</td>
                        <td>{{ getStatSet('class', className, 'vitality') }}</td>
                        <td>{{ getStatSet('class', className, 'dexterity') }}</td>
                        <td>{{ getStatSet('class', className, 'speed') }}</td>
                        <td>{{ getStatSet('class', className, 'luck') }}</td>
                    </tr>
                    <tr class="bg-amber-700">
                        <th colspan="8"></th>
                    </tr>
                    <tr class="bg-yellow-800">
                        <th class="text-base">
                            <NSelect
                                size="small"
                                :options="tierOptions"
                                :value="simCharacterConfig.tier"
                                :onUpdate:value="updateTier"
                            ></NSelect>
                        </th>
                        <td>{{ simCharacterConfig.tier }}</td>
                        <td>{{ simCharacterConfig.tier }}</td>
                        <td>{{ simCharacterConfig.tier }}</td>
                        <td>{{ simCharacterConfig.tier }}</td>
                        <td>{{ simCharacterConfig.tier }}</td>
                        <td>{{ simCharacterConfig.tier }}</td>
                        <td>{{ simCharacterConfig.tier }}</td>
                    </tr>
                    <tr class="bg-amber-700">
                        <th colspan="8"></th>
                    </tr>
                    <tr class="bg-amber-300 text-black">
                        <th class="text-base">1级属性</th>
                        <td>{{ characterLevel1Stats.strength }}</td>
                        <td>{{ characterLevel1Stats.intelligence }}</td>
                        <td>{{ characterLevel1Stats.piety }}</td>
                        <td>{{ characterLevel1Stats.vitality }}</td>
                        <td>{{ characterLevel1Stats.dexterity }}</td>
                        <td>{{ characterLevel1Stats.speed }}</td>
                        <td>{{ characterLevel1Stats.luck }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="bg-[#312721]">
            <table class="wiztable text-center text-sm w-[50em] md:w-auto">
                <thead>
                    <tr>
                        <th colspan="8" class="text-base">
                            {{
                                `${simCharacterConfig.element}属性${simCharacterConfig.race}${simCharacterConfig.gender}${simCharacterConfig.class}`
                            }}
                        </th>
                    </tr>
                    <tr class="text-base">
                        <th class="md:w-[8em]">项目</th>
                        <th class="md:w-[5em]">力</th>
                        <th class="md:w-[5em]">智慧</th>
                        <th class="md:w-[5em]">信仰心</th>
                        <th class="md:w-[5em]">生命力</th>
                        <th class="md:w-[5em]">灵巧</th>
                        <th class="md:w-[5em]">敏捷</th>
                        <th class="md:w-[5em]">幸运</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th class="text-base">1级属性</th>
                        <td>{{ characterLevel1Stats.strength }}</td>
                        <td>{{ characterLevel1Stats.intelligence }}</td>
                        <td>{{ characterLevel1Stats.piety }}</td>
                        <td>{{ characterLevel1Stats.vitality }}</td>
                        <td>{{ characterLevel1Stats.dexterity }}</td>
                        <td>{{ characterLevel1Stats.speed }}</td>
                        <td>{{ characterLevel1Stats.luck }}</td>
                    </tr>
                    <tr>
                        <th class="text-base">个体 + 加点</th>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterBonus.strength"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterBonus.intelligence"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterBonus.piety"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterBonus.vitality"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterBonus.dexterity"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterBonus.speed"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterBonus.luck"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                    </tr>
                    <tr>
                        <th class="text-base">才能缘等级</th>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterFateLevel.strength"
                                :showButton="false"
                                :min="0"
                                :max="5"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterFateLevel.intelligence"
                                :showButton="false"
                                :min="0"
                                :max="5"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterFateLevel.piety"
                                :showButton="false"
                                :min="0"
                                :max="5"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterFateLevel.vitality"
                                :showButton="false"
                                :min="0"
                                :max="5"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterFateLevel.dexterity"
                                :showButton="false"
                                :min="0"
                                :max="5"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterFateLevel.speed"
                                :showButton="false"
                                :min="0"
                                :max="5"
                            ></NInputNumber>
                        </td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <th class="text-base">才能缘数值</th>
                        <td>{{ simCharacterFateBonus.strength }}</td>
                        <td>{{ simCharacterFateBonus.intelligence }}</td>
                        <td>{{ simCharacterFateBonus.piety }}</td>
                        <td>{{ simCharacterFateBonus.vitality }}</td>
                        <td>{{ simCharacterFateBonus.dexterity }}</td>
                        <td>{{ simCharacterFateBonus.speed }}</td>
                        <td>-</td>
                    </tr>
                    <tr>
                        <th class="text-base">
                            <div class="flex gap-2 items-center">
                                <div class="w-[3em]">等级</div>
                                <div class="flex-1">
                                    <NInputNumber
                                        size="tiny"
                                        v-model:value="simCharacterLevel"
                                        :showButton="false"
                                        :min="0"
                                    ></NInputNumber>
                                </div>
                            </div>
                        </th>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterCurrentStats.strength"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterCurrentStats.intelligence"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterCurrentStats.piety"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterCurrentStats.vitality"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterCurrentStats.dexterity"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterCurrentStats.speed"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="simCharacterCurrentStats.luck"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                    </tr>
                    <tr class="bg-amber-300 text-black">
                        <th class="text-base">成长率</th>
                        <td>{{ characterStatGrowthRate.strength }}</td>
                        <td>{{ characterStatGrowthRate.intelligence }}</td>
                        <td>{{ characterStatGrowthRate.piety }}</td>
                        <td>{{ characterStatGrowthRate.vitality }}</td>
                        <td>{{ characterStatGrowthRate.dexterity }}</td>
                        <td>{{ characterStatGrowthRate.speed }}</td>
                        <td>{{ characterStatGrowthRate.luck }}</td>
                    </tr>
                    <tr class="bg-amber-300 text-black">
                        <th class="text-base">总属性</th>
                        <td colspan="3">{{ characterTotalStats.totalStats }}</td>
                        <th class="text-base" colspan="2">总成长</th>
                        <td colspan="2">{{ characterTotalStats.totalGrowthRate }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="flex gap-4">
            <NButton type="primary" @click="copyToExcelHeader">复制 Excel 表头</NButton>
            <NButton type="primary" @click="copyToExcelRow">复制 Excel 行</NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NInputNumber, NSelect } from 'naive-ui';

import { computed, onMounted, ref } from 'vue';
import { ELEMENT_TYPE, GENDER_TYPE, RACE_TYPE } from '../data/enum';
import { SearcherExposeData } from '../data/SearcherExposeData';
import { ICharacterStats } from '../data/SearcherExposeData.types';

const character = defineModel<string | null>('character', {
    default: null,
});

const exposeData = SearcherExposeData.getInstance();

const getStatSet = (kind: string, key: string, stat: string) => {
    const data = exposeData.getStatSet(kind);
    if (data) {
        if (data[key]) {
            return data[key][stat] ?? 0;
        }
    }
};

const simCharacterConfig = ref({
    race: '人类',
    gender: '男',
    element: '火',
    class: '战士',
    tier: 0,
});

const tierOptions = ref([
    {
        label: '无阶(20)',
        value: 0,
    },
    {
        label: '铅阶(30)',
        value: 1,
    },
    {
        label: '青铜阶(40)',
        value: 2,
    },
    {
        label: '铁阶(50)',
        value: 3,
    },
    {
        label: '钢阶(60)',
        value: 4,
    },
]);
const updateTier = (tier: number) => {
    simCharacterConfig.value.tier = tier;
    simCharacterLevel.value = tier * 10 + 20;
};

const characterLevel1Stats = computed(() => {
    const params = exposeData.calculateStats(simCharacterConfig.value);
    for (const key in params) {
        params[key] = params[key] + simCharacterConfig.value.tier;
    }
    return params;
});

const simCharacterBonus = ref<ICharacterStats>({
    strength: 0,
    intelligence: 0,
    piety: 0,
    vitality: 0,
    dexterity: 0,
    speed: 0,
    luck: 0,
});

const simCharacterFateLevel = ref<ICharacterStats>({
    strength: 0,
    intelligence: 0,
    piety: 0,
    vitality: 0,
    dexterity: 0,
    speed: 0,
    luck: 0,
});
const simCharacterFateBonus = computed<ICharacterStats>(() => {
    const params = {
        strength: 0,
        intelligence: 0,
        piety: 0,
        vitality: 0,
        dexterity: 0,
        speed: 0,
        luck: 0,
    };
    for (const key in params) {
        params[key] = Math.floor((simCharacterFateLevel.value[key] * 2 * simCharacterLevel.value) / 100);
    }
    return params;
});

const simCharacterLevel = ref(1);
const simCharacterCurrentStats = ref<ICharacterStats>({
    strength: 0,
    intelligence: 0,
    piety: 0,
    vitality: 0,
    dexterity: 0,
    speed: 0,
    luck: 0,
});

// 刨除缘的干扰因素的最终属性
const simCharacterFinalStats = computed<ICharacterStats>(() => {
    const params = {
        strength: 0,
        intelligence: 0,
        piety: 0,
        vitality: 0,
        dexterity: 0,
        speed: 0,
        luck: 0,
    };
    for (const key in params) {
        params[key] = simCharacterCurrentStats.value[key] - simCharacterFateBonus.value[key];
    }
    return params;
});

const characterStatGrowthRate = computed(() => {
    const growthRate = {
        strength: 0,
        intelligence: 0,
        piety: 0,
        vitality: 0,
        dexterity: 0,
        speed: 0,
        luck: 0,
    };
    for (const key in growthRate) {
        if (simCharacterLevel.value === 1) {
            growthRate[key] = 0;
            continue;
        }
        const value =
            simCharacterFinalStats.value[key] - characterLevel1Stats.value[key] - simCharacterBonus.value[key];
        growthRate[key] = value / (simCharacterLevel.value - 1);
        if (growthRate[key] < 0) {
            growthRate[key] = 0;
        }
        // 保留三位小数
        growthRate[key] = Math.round(growthRate[key] * 1000) / 1000;
    }
    return growthRate;
});

const characterTotalStats = computed(() => {
    let totalStats = 0;
    for (const key in simCharacterFinalStats.value) {
        totalStats += simCharacterFinalStats.value[key];
    }
    let totalGrowthRate = 0;
    for (const key in characterStatGrowthRate.value) {
        totalGrowthRate += characterStatGrowthRate.value[key];
    }
    totalGrowthRate = Math.round(totalGrowthRate * 1000) / 1000;
    return {
        totalStats,
        totalGrowthRate,
    };
});

onMounted(() => {
    if (character.value) {
        console.log(character.value);
        const data = exposeData.getCharacterData(character.value);
        if (data) {
            simCharacterConfig.value = {
                race: data.race,
                gender: data.gender,
                element: data.element,
                class: data.class[0],
                tier: 0,
            };
        }
        character.value = null;
    }
});

const copyToExcelHeader = () => {
    navigator.clipboard
        .writeText(
            '等级\t力\t智慧\t信仰心\t生命力\t灵巧\t敏捷\t幸运\t总属性\t力成长\t智慧成长\t信仰心成长\t生命力成长\t灵巧成长\t敏捷成长\t幸运成长\t总成长',
        )
        .then(
            () => {
                window.$message.success('复制 Excel表头 成功');
            },
            () => {
                window.$message.error('复制 Excel表头 失败');
            },
        );
};

const copyToExcelRow = () => {
    navigator.clipboard
        .writeText(
            `${simCharacterLevel.value}\t${simCharacterFinalStats.value.strength}\t${simCharacterFinalStats.value.intelligence}\t${simCharacterFinalStats.value.piety}\t${simCharacterFinalStats.value.vitality}\t${simCharacterFinalStats.value.dexterity}\t${simCharacterFinalStats.value.speed}\t${simCharacterFinalStats.value.luck}\t${characterTotalStats.value.totalStats}\t${characterStatGrowthRate.value.strength}\t${characterStatGrowthRate.value.intelligence}\t${characterStatGrowthRate.value.piety}\t${characterStatGrowthRate.value.vitality}\t${characterStatGrowthRate.value.dexterity}\t${characterStatGrowthRate.value.speed}\t${characterStatGrowthRate.value.luck}\t${characterTotalStats.value.totalGrowthRate}`,
        )
        .then(
            () => {
                window.$message.success('复制 Excel行 成功');
            },
            () => {
                window.$message.error('复制 Excel行 失败');
            },
        );
};
</script>
