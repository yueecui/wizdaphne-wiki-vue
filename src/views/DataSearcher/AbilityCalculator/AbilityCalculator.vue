<template>
    <div class="flex flex-col gap-4">
        <div class="bg-[#312721]">
            <table class="wiztable text-center text-sm">
                <thead>
                    <tr>
                        <th colspan="9" class="text-base">特性值和职业</th>
                    </tr>
                    <tr class="text-base">
                        <th class="md:w-[8em]">属性</th>
                        <th class="md:w-[5em]">力量</th>
                        <th class="md:w-[5em]">智慧</th>
                        <th class="md:w-[5em]">信仰心</th>
                        <th class="md:w-[5em]">生命力</th>
                        <th class="md:w-[5em]">敏捷</th>
                        <th class="md:w-[5em]">灵巧</th>
                        <th class="md:w-[5em]">运</th>
                        <th class="md:w-[12em]">职业</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <th class="text-base">数值</th>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="store.settings.abilityCalculator.baseStats.strength"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="store.settings.abilityCalculator.baseStats.intelligence"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="store.settings.abilityCalculator.baseStats.piety"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="store.settings.abilityCalculator.baseStats.vitality"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="store.settings.abilityCalculator.baseStats.speed"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="store.settings.abilityCalculator.baseStats.dexterity"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="store.settings.abilityCalculator.baseStats.luck"
                                :showButton="false"
                                :min="0"
                            ></NInputNumber>
                        </td>
                        <td>
                            <NSelect
                                :options="jobOptions"
                                v-model:value="store.settings.abilityCalculator.selectedJob"
                                class="w-full!"
                                placeholder="请选择职业"
                            ></NSelect>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="flex gap-4">
            <NButton type="error" @click="resetStats">重置</NButton>
            <NButton type="primary" @click="showSaveModal = true">保存配置</NButton>
            <NButton type="info" @click="showLoadModal = true">读取配置</NButton>
        </div>
        <div class="bg-[#312721]">
            <table class="wiztable text-center text-sm">
                <thead>
                    <tr>
                        <th colspan="7" class="text-base">能力值计算结果</th>
                    </tr>
                    <tr class="text-base">
                        <th class="md:w-[8em]">能力</th>
                        <th class="md:w-[12em]">计算公式</th>
                        <th class="md:w-[8em]">计算值</th>
                        <th class="md:w-[8em]">职业系数</th>
                        <th class="md:w-[8em]">最终值</th>
                        <th class="md:w-[8em]">加护%</th>
                        <th class="md:w-[8em]">加护值</th>
                    </tr>
                </thead>
                <tbody class="ability-table-body">
                    <tr>
                        <th class="text-base">攻击力</th>
                        <td>力量×1</td>
                        <td>{{ formatNumber(baseAbilities.atk) }}</td>
                        <td>{{ getJobMultiplier('atk') }}</td>
                        <td>{{ formatNumber(finalStats.atk) }}</td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="bonusPercentages.atk"
                                :showButton="false"
                                :min="0"
                                :max="100"
                            ></NInputNumber>
                        </td>
                        <td>{{ formatNumber(calculateBonusValue(finalStats.atk, bonusPercentages.atk)) }}</td>
                    </tr>
                    <tr>
                        <th class="text-base">魔力</th>
                        <td>智慧×1</td>
                        <td>{{ formatNumber(baseAbilities.mag) }}</td>
                        <td>{{ getJobMultiplier('mag') }}</td>
                        <td>{{ formatNumber(finalStats.mag) }}</td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="bonusPercentages.mag"
                                :showButton="false"
                                :min="0"
                                :max="100"
                            ></NInputNumber>
                        </td>
                        <td>{{ formatNumber(calculateBonusValue(finalStats.mag, bonusPercentages.mag)) }}</td>
                    </tr>
                    <tr>
                        <th class="text-base">神力</th>
                        <td>信仰心×1</td>
                        <td>{{ formatNumber(baseAbilities.div) }}</td>
                        <td>{{ getJobMultiplier('div') }}</td>
                        <td>{{ formatNumber(finalStats.div) }}</td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="bonusPercentages.div"
                                :showButton="false"
                                :min="0"
                                :max="100"
                            ></NInputNumber>
                        </td>
                        <td>{{ formatNumber(calculateBonusValue(finalStats.div, bonusPercentages.div)) }}</td>
                    </tr>
                    <tr>
                        <th class="text-base">防御力</th>
                        <td>生命力×1</td>
                        <td>{{ formatNumber(baseAbilities.def) }}</td>
                        <td>{{ getJobMultiplier('def') }}</td>
                        <td>{{ formatNumber(finalStats.def) }}</td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="bonusPercentages.def"
                                :showButton="false"
                                :min="0"
                                :max="100"
                            ></NInputNumber>
                        </td>
                        <td>{{ formatNumber(calculateBonusValue(finalStats.def, bonusPercentages.def)) }}</td>
                    </tr>
                    <tr>
                        <th class="text-base">法术防御力</th>
                        <td>信仰心×1</td>
                        <td>{{ formatNumber(baseAbilities.mdef) }}</td>
                        <td>{{ getJobMultiplier('mdef') }}</td>
                        <td>{{ formatNumber(finalStats.mdef) }}</td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="bonusPercentages.mdef"
                                :showButton="false"
                                :min="0"
                                :max="100"
                            ></NInputNumber>
                        </td>
                        <td>{{ formatNumber(calculateBonusValue(finalStats.mdef, bonusPercentages.mdef)) }}</td>
                    </tr>
                    <tr>
                        <th class="text-base">会心</th>
                        <td>灵巧×0.2</td>
                        <td>{{ formatNumber(baseAbilities.sur) }}</td>
                        <td>{{ getJobMultiplier('sur') }}</td>
                        <td>{{ formatNumber(finalStats.sur) }}</td>
                        <td class="text-gray-500">-</td>
                        <td class="text-gray-500">-</td>
                    </tr>
                    <tr>
                        <th class="text-base">探知</th>
                        <td>智慧×0.7+运×0.3</td>
                        <td>{{ formatNumber(baseAbilities.det) }}</td>
                        <td>{{ getJobMultiplier('det') }}</td>
                        <td>{{ formatNumber(finalStats.det) }}</td>
                        <td class="text-gray-500">-</td>
                        <td class="text-gray-500">-</td>
                    </tr>
                    <tr>
                        <th class="text-base">陷阱解除</th>
                        <td>灵巧×0.7+运×0.3</td>
                        <td>{{ formatNumber(baseAbilities.dtrap) }}</td>
                        <td>{{ getJobMultiplier('dtrap') }}</td>
                        <td>{{ formatNumber(finalStats.dtrap) }}</td>
                        <td class="text-gray-500">-</td>
                        <td class="text-gray-500">-</td>
                    </tr>
                    <tr>
                        <th class="text-base">陷阱回避</th>
                        <td>敏捷×0.7+运×0.3</td>
                        <td>{{ formatNumber(baseAbilities.etrap) }}</td>
                        <td>{{ getJobMultiplier('etrap') }}</td>
                        <td>{{ formatNumber(finalStats.etrap) }}</td>
                        <td class="text-gray-500">-</td>
                        <td class="text-gray-500">-</td>
                    </tr>
                    <tr>
                        <th class="text-base">行动速度</th>
                        <td>敏捷×1</td>
                        <td>{{ formatNumber(baseAbilities.speed) }}</td>
                        <td>{{ getJobMultiplier('speed') }}</td>
                        <td>{{ formatNumber(finalStats.speed) }}</td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="bonusPercentages.speed"
                                :showButton="false"
                                :min="0"
                                :max="100"
                            ></NInputNumber>
                        </td>
                        <td>{{ formatNumber(calculateBonusValue(finalStats.speed, bonusPercentages.speed)) }}</td>
                    </tr>
                    <tr>
                        <th class="text-base">命中</th>
                        <td>灵巧×0.7+运×0.3</td>
                        <td>{{ formatNumber(baseAbilities.acc) }}</td>
                        <td>{{ getJobMultiplier('acc') }}</td>
                        <td>{{ formatNumber(finalStats.acc) }}</td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="bonusPercentages.acc"
                                :showButton="false"
                                :min="0"
                                :max="100"
                            ></NInputNumber>
                        </td>
                        <td>{{ formatNumber(calculateBonusValue(finalStats.acc, bonusPercentages.acc)) }}</td>
                    </tr>
                    <tr>
                        <th class="text-base">回避</th>
                        <td>敏捷×0.7+运×0.3</td>
                        <td>{{ formatNumber(baseAbilities.eva) }}</td>
                        <td>{{ getJobMultiplier('eva') }}</td>
                        <td>{{ formatNumber(finalStats.eva) }}</td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="bonusPercentages.eva"
                                :showButton="false"
                                :min="0"
                                :max="100"
                            ></NInputNumber>
                        </td>
                        <td>{{ formatNumber(calculateBonusValue(finalStats.eva, bonusPercentages.eva)) }}</td>
                    </tr>
                    <tr>
                        <th class="text-base">抵抗</th>
                        <td>信仰心×0.65+生命力×0.35</td>
                        <td>{{ formatNumber(baseAbilities.res) }}</td>
                        <td>{{ getJobMultiplier('res') }}</td>
                        <td>{{ formatNumber(finalStats.res) }}</td>
                        <td>
                            <NInputNumber
                                size="tiny"
                                v-model:value="bonusPercentages.res"
                                :showButton="false"
                                :min="0"
                                :max="100"
                            ></NInputNumber>
                        </td>
                        <td>{{ formatNumber(calculateBonusValue(finalStats.res, bonusPercentages.res)) }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
        <div class="text-sm text-gray-400">
            <div>※ 表中数据保留两位小数，游戏中实际属性会向上取整，因此可能会存在1的显示误差。</div>
            <div>
                ※
                「力量适应+」技能会在加护的百分比和固定值后进行计算，因此装备具有该特性的武器时，攻击力%加护的效果要比显示的更好。
            </div>
            <div>※ 特性值转换的属性除会心外，都不会显示在括号里。所以会心数据不一定准确，谨慎参考。</div>
        </div>

        <NModal v-model:show="showSaveModal">
            <div class="bg-[#312721] p-6 w-[90%] max-w-[600px]">
                <div class="text-lg font-bold mb-4">保存配置</div>
                <div class="mb-4">
                    <NInput v-model:value="saveName" placeholder="请输入配置名称" @keydown.enter="saveConfig"></NInput>
                </div>
                <div class="flex gap-2 justify-end">
                    <NButton @click="showSaveModal = false">取消</NButton>
                    <NButton type="primary" @click="saveConfig">保存</NButton>
                </div>
            </div>
        </NModal>

        <NModal v-model:show="showLoadModal">
            <div class="bg-[#312721] p-6 w-[90%] max-w-[900px] max-h-[80vh] overflow-auto">
                <div class="text-lg font-bold mb-4">读取配置</div>
                <div v-if="savedConfigs.length === 0" class="text-gray-400 text-center py-4">暂无保存的配置</div>
                <table v-else class="wiztable text-center text-sm w-full">
                    <thead>
                        <tr>
                            <th>名称</th>
                            <th>力量</th>
                            <th>智慧</th>
                            <th>信仰心</th>
                            <th>生命力</th>
                            <th>敏捷</th>
                            <th>灵巧</th>
                            <th>运</th>
                            <th>职业</th>
                            <th>操作</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(config, index) in savedConfigs" :key="config.id">
                            <td>{{ config.name }}</td>
                            <td>{{ config.baseStats.strength }}</td>
                            <td>{{ config.baseStats.intelligence }}</td>
                            <td>{{ config.baseStats.piety }}</td>
                            <td>{{ config.baseStats.vitality }}</td>
                            <td>{{ config.baseStats.speed }}</td>
                            <td>{{ config.baseStats.dexterity }}</td>
                            <td>{{ config.baseStats.luck }}</td>
                            <td>{{ config.selectedJob }}</td>
                            <td>
                                <div class="flex gap-1 justify-center flex-wrap">
                                    <NButton size="tiny" @click="loadConfig(config)">读取</NButton>
                                    <NButton size="tiny" @click="editConfig(config)">编辑</NButton>
                                    <NButton size="tiny" @click="deleteConfig(config.id)">删除</NButton>
                                    <NButton size="tiny" @click="moveToTop(index)" :disabled="index === 0">
                                        置顶
                                    </NButton>
                                    <NButton size="tiny" @click="moveUp(index)" :disabled="index === 0">上移</NButton>
                                    <NButton
                                        size="tiny"
                                        @click="moveDown(index)"
                                        :disabled="index === savedConfigs.length - 1"
                                    >
                                        下移
                                    </NButton>
                                    <NButton
                                        size="tiny"
                                        @click="moveToBottom(index)"
                                        :disabled="index === savedConfigs.length - 1"
                                    >
                                        置底
                                    </NButton>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="flex gap-2 justify-end mt-4">
                    <NButton @click="showLoadModal = false">关闭</NButton>
                </div>
            </div>
        </NModal>

        <NModal v-model:show="showEditModal">
            <div class="bg-[#312721] p-6 w-[90%] max-w-[400px]">
                <div class="text-lg font-bold mb-4">编辑配置</div>
                <table class="wiztable text-center text-sm">
                    <tbody>
                        <tr>
                            <th class="md:w-[10em]">配置名称</th>
                            <td>
                                <NInput
                                    v-model:value="editName"
                                    placeholder="请输入配置名称"
                                    @keydown.enter="updateConfig"
                                ></NInput>
                            </td>
                        </tr>
                        <tr>
                            <th>职业</th>
                            <td>
                                <NSelect
                                    :options="jobOptions"
                                    v-model:value="editJob"
                                    class="w-full"
                                    placeholder="请选择职业"
                                ></NSelect>
                            </td>
                        </tr>
                        <tr>
                            <th>力量</th>
                            <td>
                                <NInputNumber
                                    size="tiny"
                                    v-model:value="editStats.strength"
                                    :showButton="false"
                                    :min="0"
                                    class="w-full"
                                ></NInputNumber>
                            </td>
                        </tr>
                        <tr>
                            <th>智慧</th>
                            <td>
                                <NInputNumber
                                    size="tiny"
                                    v-model:value="editStats.intelligence"
                                    :showButton="false"
                                    :min="0"
                                    class="w-full"
                                ></NInputNumber>
                            </td>
                        </tr>
                        <tr>
                            <th>信仰心</th>
                            <td>
                                <NInputNumber
                                    size="tiny"
                                    v-model:value="editStats.piety"
                                    :showButton="false"
                                    :min="0"
                                    class="w-full"
                                ></NInputNumber>
                            </td>
                        </tr>
                        <tr>
                            <th>生命力</th>
                            <td>
                                <NInputNumber
                                    size="tiny"
                                    v-model:value="editStats.vitality"
                                    :showButton="false"
                                    :min="0"
                                    class="w-full"
                                ></NInputNumber>
                            </td>
                        </tr>
                        <tr>
                            <th>敏捷</th>
                            <td>
                                <NInputNumber
                                    size="tiny"
                                    v-model:value="editStats.speed"
                                    :showButton="false"
                                    :min="0"
                                    class="w-full"
                                ></NInputNumber>
                            </td>
                        </tr>
                        <tr>
                            <th>灵巧</th>
                            <td>
                                <NInputNumber
                                    size="tiny"
                                    v-model:value="editStats.dexterity"
                                    :showButton="false"
                                    :min="0"
                                    class="w-full"
                                ></NInputNumber>
                            </td>
                        </tr>
                        <tr>
                            <th>运</th>
                            <td>
                                <NInputNumber
                                    size="tiny"
                                    v-model:value="editStats.luck"
                                    :showButton="false"
                                    :min="0"
                                    class="w-full"
                                ></NInputNumber>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="flex gap-2 justify-end mt-4">
                    <NButton @click="showEditModal = false">取消</NButton>
                    <NButton type="primary" @click="updateConfig">保存</NButton>
                </div>
            </div>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput, NInputNumber, NModal, NSelect, SelectOption } from 'naive-ui';

import { computed, ref, watch } from 'vue';
import type { IJobMultiplier } from '../data/SearcherData.types';
import { useSearcherDataStore } from '../data/searcherDataStore';

const store = useSearcherDataStore();

interface SavedConfig {
    id: string;
    name: string;
    baseStats: {
        strength: number;
        intelligence: number;
        piety: number;
        vitality: number;
        dexterity: number;
        speed: number;
        luck: number;
    };
    selectedJob: string;
}

const STORAGE_KEY = 'abilityCalculatorConfigs';

const showSaveModal = ref(false);
const showLoadModal = ref(false);
const showEditModal = ref(false);
const saveName = ref('');
const editName = ref('');
const editJob = ref('');
const editStats = ref({
    strength: 0,
    intelligence: 0,
    piety: 0,
    vitality: 0,
    dexterity: 0,
    speed: 0,
    luck: 0,
});
const editingConfigId = ref<string | null>(null);
const savedConfigs = ref<SavedConfig[]>([]);

const loadSavedConfigs = () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
        try {
            savedConfigs.value = JSON.parse(stored);
        } catch (e) {
            console.error('Failed to load saved configs:', e);
            savedConfigs.value = [];
        }
    }
};

const saveSavedConfigs = () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(savedConfigs.value));
};

watch([showLoadModal], () => {
    if (showLoadModal.value) {
        loadSavedConfigs();
    }
});

const saveConfig = () => {
    if (!saveName.value.trim()) {
        return;
    }

    const newConfig: SavedConfig = {
        id: Date.now().toString(),
        name: saveName.value.trim(),
        baseStats: { ...store.settings.abilityCalculator.baseStats },
        selectedJob: store.settings.abilityCalculator.selectedJob,
    };

    savedConfigs.value.push(newConfig);
    saveSavedConfigs();
    saveName.value = '';
    showSaveModal.value = false;
};

const loadConfig = (config: SavedConfig) => {
    store.settings.abilityCalculator.baseStats = { ...config.baseStats };
    store.settings.abilityCalculator.selectedJob = config.selectedJob;
    showLoadModal.value = false;
};

const editConfig = (config: SavedConfig) => {
    editingConfigId.value = config.id;
    editName.value = config.name;
    editJob.value = config.selectedJob;
    editStats.value = { ...config.baseStats };
    showEditModal.value = true;
};

const updateConfig = () => {
    if (!editName.value.trim() || !editingConfigId.value) {
        return;
    }

    const index = savedConfigs.value.findIndex((c) => c.id === editingConfigId.value);
    if (index !== -1) {
        savedConfigs.value[index].name = editName.value.trim();
        savedConfigs.value[index].selectedJob = editJob.value;
        savedConfigs.value[index].baseStats = { ...editStats.value };
        saveSavedConfigs();
    }

    editName.value = '';
    editJob.value = '';
    editStats.value = {
        strength: 0,
        intelligence: 0,
        piety: 0,
        vitality: 0,
        dexterity: 0,
        speed: 0,
        luck: 0,
    };
    editingConfigId.value = null;
    showEditModal.value = false;
};

const deleteConfig = (id: string) => {
    savedConfigs.value = savedConfigs.value.filter((c) => c.id !== id);
    saveSavedConfigs();
};

const moveToTop = (index: number) => {
    if (index === 0) return;
    const [item] = savedConfigs.value.splice(index, 1);
    savedConfigs.value.unshift(item);
    saveSavedConfigs();
};

const moveUp = (index: number) => {
    if (index === 0) return;
    const item = savedConfigs.value[index];
    savedConfigs.value[index] = savedConfigs.value[index - 1];
    savedConfigs.value[index - 1] = item;
    saveSavedConfigs();
};

const moveDown = (index: number) => {
    if (index === savedConfigs.value.length - 1) return;
    const item = savedConfigs.value[index];
    savedConfigs.value[index] = savedConfigs.value[index + 1];
    savedConfigs.value[index + 1] = item;
    saveSavedConfigs();
};

const moveToBottom = (index: number) => {
    if (index === savedConfigs.value.length - 1) return;
    const [item] = savedConfigs.value.splice(index, 1);
    savedConfigs.value.push(item);
    saveSavedConfigs();
};

const bonusPercentages = ref<Record<string, number>>({
    atk: 0,
    mag: 0,
    div: 0,
    acc: 0,
    def: 0,
    mdef: 0,
    eva: 0,
    res: 0,
    speed: 0,
});

const jobOptions = computed<SelectOption[]>(() => {
    if (!store.data) {
        return [];
    }

    const standardJobs = store.data.standardClass.map((job) => ({
        label: job,
        value: job,
    }));

    const specialJobs = store.data.jobMultiplier
        .filter((job) => !store.data?.standardClass.includes(job.job))
        .map((job) => ({
            label: job.job,
            value: job.job,
        }));

    return [...standardJobs, ...specialJobs];
});

const baseAbilities = computed(() => {
    const s = store.settings.abilityCalculator.baseStats;
    return {
        atk: s.strength * 1,
        mag: s.intelligence * 1,
        div: s.piety * 1,
        acc: s.dexterity * 0.7 + s.luck * 0.3,
        sur: s.dexterity * 0.2,
        def: s.vitality * 1,
        mdef: s.piety * 1,
        eva: s.speed * 0.7 + s.luck * 0.3,
        res: s.piety * 0.65 + s.vitality * 0.35,
        det: s.intelligence * 0.7 + s.luck * 0.3,
        dtrap: s.dexterity * 0.7 + s.luck * 0.3,
        etrap: s.speed * 0.7 + s.luck * 0.3,
        speed: s.speed * 1,
    };
});

const finalStats = computed(() => {
    if (!store.settings.abilityCalculator.selectedJob || !store.data) {
        return baseAbilities.value;
    }

    const jobMultiplier = store.data.jobMultiplier.find(
        (job) => job.job === store.settings.abilityCalculator.selectedJob,
    );
    if (!jobMultiplier) {
        return baseAbilities.value;
    }

    const base = baseAbilities.value;
    return {
        atk: base.atk * jobMultiplier.atk,
        mag: base.mag * jobMultiplier.mag,
        div: base.div * jobMultiplier.div,
        acc: base.acc * jobMultiplier.acc,
        sur: base.sur * jobMultiplier.sur,
        def: base.def * jobMultiplier.def,
        mdef: base.mdef * jobMultiplier.mdef,
        eva: base.eva * jobMultiplier.eva,
        res: base.res * jobMultiplier.res,
        det: base.det * jobMultiplier.det,
        dtrap: base.dtrap * jobMultiplier.dtrap,
        etrap: base.etrap * jobMultiplier.etrap,
        speed: base.speed * jobMultiplier.speed,
    };
});

const resetStats = () => {
    store.settings.abilityCalculator.baseStats = {
        strength: 0,
        intelligence: 0,
        piety: 0,
        vitality: 0,
        dexterity: 0,
        speed: 0,
        luck: 0,
    };
    store.settings.abilityCalculator.selectedJob = '战士';
};

const formatNumber = (value: number) => {
    return value.toFixed(2);
};

const getJobMultiplier = (stat: keyof IJobMultiplier) => {
    if (!store.settings.abilityCalculator.selectedJob || !store.data) {
        return '-';
    }
    const jobMultiplier = store.data.jobMultiplier.find(
        (job) => job.job === store.settings.abilityCalculator.selectedJob,
    );
    if (!jobMultiplier) {
        return '-';
    }
    return jobMultiplier[stat];
};

const calculateBonusValue = (finalValue: number, percentage: number) => {
    return finalValue * (percentage / 100);
};
</script>

<style scoped>
.ability-table-body tr:hover {
    background-color: rgba(255, 255, 255, 0.1);
}
</style>
