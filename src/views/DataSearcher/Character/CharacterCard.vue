<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded">
        <div
            class="grid md:grid-flow-col grid-rows-[127px_auto] grid-cols-[128px_auto] md:grid-cols-[200px_auto] gap-4"
        >
            <div class="col-span-2 md:col-auto flex justify-center items-center">
                <CharacterItem :character="character"></CharacterItem>
            </div>
            <div>
                <table class="wikitable my-0! w-full text-center">
                    <tbody>
                        <tr>
                            <th colspan="3">信息</th>
                        </tr>
                        <tr>
                            <th class="w-20 md:w-1/3">风格</th>
                            <td colspan="2" class="md:w-2/3">
                                {{ character.data.style ? character.data.style : '基本' }}
                            </td>
                        </tr>
                        <tr>
                            <th>种族</th>
                            <td colspan="2">{{ character.data.race }}</td>
                        </tr>
                        <tr>
                            <th>性别</th>
                            <td colspan="2">{{ character.data.gender }}</td>
                        </tr>
                        <tr>
                            <th>性格</th>
                            <td colspan="2">{{ character.data.personality }}</td>
                        </tr>
                        <tr>
                            <th>缘类型</th>
                            <td colspan="2">{{ character.data.fate_type }}</td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">特性</th>
                            <th colspan="2" class="md:w-2/3">
                                <div class="flex gap-1 justify-center">
                                    <div>
                                        1级
                                        <span class="hidden md:inline!">数值</span>
                                    </div>
                                    <NTooltip trigger="hover">
                                        <template #trigger>
                                            <div class="hidden md:flex! items-center justify-center gap-1 leading-none">
                                                <NIcon><QuestionIcon /></NIcon>
                                            </div>
                                        </template>
                                        1级基准特性值是用来对比检查角色的个体情况
                                        <br />
                                        <span>
                                            <span class="bg-red-800/70 font-bold">亮红色背景</span>
                                            为根据官方数据，该特性个体，确定无法在1级看出
                                        </span>
                                        <br />
                                        <span>
                                            <span class="bg-violet-800/70 font-bold">亮紫色背景</span>
                                            为根据官方数据，该特性个体，有一部分无法在1级时看出
                                        </span>
                                        <br />
                                        <span>
                                            <span class="bg-red-800/30 font-bold">暗红色背景</span>
                                            为根据其他数据推断，该特性个体，可能无法在1级看出
                                        </span>
                                        <br />
                                        <span>
                                            <span class="bg-violet-800/30 font-bold">暗紫色背景</span>
                                            为根据其他数据推断，该特性个体，有一部分可能无法在1级看出
                                        </span>
                                        <br />
                                        具体可参考
                                        <a href="/wiki/能力值#个体的识别" target="_blank">这里</a>
                                    </NTooltip>
                                </div>
                            </th>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">职业</th>
                            <th :class="hasSubClass ? 'md:w-1/3' : 'md:w-2/3'">{{ character.data.class[0] }}</th>
                            <th class="md:w-1/3" v-if="hasSubClass">{{ character.data.class[1] }}</th>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">力</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getMainBgColor(false, '力')]">
                                {{ character.stats?.strength || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '力')]" v-if="character.subStats">
                                {{ character.subStats.strength }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">智慧</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getMainBgColor(false, '智慧')]">
                                {{ character.stats?.intelligence || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '智慧')]" v-if="character.subStats">
                                {{ character.subStats.intelligence }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">信仰心</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getMainBgColor(false, '信仰心')]">
                                {{ character.stats?.piety || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '信仰心')]" v-if="character.subStats">
                                {{ character.subStats.piety }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">生命力</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getMainBgColor(false, '生命力')]">
                                {{ character.stats?.vitality || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '生命力')]" v-if="character.subStats">
                                {{ character.subStats.vitality }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">灵巧</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getMainBgColor(false, '灵巧')]">
                                {{ character.stats?.dexterity || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '灵巧')]" v-if="character.subStats">
                                {{ character.subStats.dexterity }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">敏捷</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getMainBgColor(false, '敏捷')]">
                                {{ character.stats?.speed || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '敏捷')]" v-if="character.subStats">
                                {{ character.subStats.speed }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">运</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getMainBgColor(false, '运')]">
                                {{ character.stats?.luck || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '运')]" v-if="character.subStats">
                                {{ character.subStats.luck }}
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div class="mt-2 flex items-center justify-center" v-if="showRateButton">
                    <NButton size="tiny" @click="openModal">查看个体概率</NButton>
                </div>
            </div>
            <div class="row-span-2 md:col-auto">
                <table class="wikitable my-0! w-full">
                    <tbody>
                        <tr>
                            <th class="text-center">固有技能</th>
                        </tr>
                        <tr>
                            <td>
                                <div class="p-2">
                                    <div class="text-light pb-0.5 border-b! mb-2 relative">
                                        {{ character.data.passive_skill }}
                                    </div>
                                    <div v-html="getSkillDescription(character.data.passive_skill)"></div>
                                </div>
                            </td>
                        </tr>
                        <template v-if="uniqueSkills.length > 0" v-for="skill in uniqueSkills">
                            <tr>
                                <th class="text-center">角色专用技能</th>
                            </tr>
                            <tr>
                                <td>
                                    <div class="p-2">
                                        <div class="text-light pb-0.5 border-b! mb-2 relative">
                                            {{ skill }}
                                        </div>
                                        <div v-html="getSkillDescription(skill)"></div>
                                    </div>
                                </td>
                            </tr>
                        </template>
                        <tr>
                            <th class="text-center">继承技能</th>
                        </tr>
                        <tr>
                            <td>
                                <div class="p-2">
                                    <div class="text-light pb-0.5 border-b! mb-2 relative">
                                        {{ character.data.inherit_skill }}
                                    </div>
                                    <div v-html="getSkillDescription(character.data.inherit_skill)"></div>
                                </div>
                            </td>
                        </tr>
                        <template v-if="character.data.inherit_skill2">
                            <tr>
                                <th class="text-center">
                                    潜在继承技能
                                    <WikiImg imageName="icon_RareSkills.png" class="w-5 h-5" />
                                </th>
                            </tr>
                            <tr>
                                <td>
                                    <div class="p-2">
                                        <div class="text-light pb-0.5 border-b! mb-2 relative">
                                            {{ character.data.inherit_skill2 }}
                                        </div>
                                        <div v-html="getSkillDescription(character.data.inherit_skill2)"></div>
                                    </div>
                                </td>
                            </tr>
                        </template>
                        <tr>
                            <th class="text-center">克己技能</th>
                        </tr>
                        <tr>
                            <td>
                                <div class="p-2">
                                    <div class="text-light pb-0.5 border-b! mb-2 relative">
                                        {{ character.data.discipline_skill }}
                                    </div>
                                    <div v-html="getSkillDescription(character.data.discipline_skill)"></div>
                                </div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
        <div class="flex flex-wrap justify-center mt-4 gap-4" v-if="onClose">
            <NButton size="small" type="primary" @click="gotoDetail">查看详情页</NButton>
            <NButton size="small" type="warning" @click="() => startCalcCharacter(false)" v-if="startCalcStat">
                计算属性({{ character.data.class[0] }})
            </NButton>
            <NButton
                size="small"
                type="warning"
                @click="() => startCalcCharacter(true)"
                v-if="startCalcStat && hasSubClass"
            >
                计算属性({{ character.data.class[1] }})
            </NButton>
            <NButton size="small" type="warning" @click="onClose">关闭</NButton>
        </div>

        <!-- 概率查看模态框 -->
        <NModal v-model:show="showModal">
            <div class="w-[90%] md:h-auto md:w-[400px] m-auto huiji-css-hook bg-transparent!">
                <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
                    <div class="flex justify-between items-center">
                        <div class="text-xl text-light font-bold">角色个体出现几率</div>
                    </div>
                    <p>该角色的个体抽出概率不是均等，具体参考下表</p>
                    <table class="wikitable w-full text-center border-collapse m-0!">
                        <thead>
                            <tr class="border-b">
                                <th class="p-2 text-left pl-4">属性</th>
                                <th class="p-2 text-left">几率 (%)</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="row in rateData" :key="row.key" class="border-b">
                                <td class="p-2 pl-4">{{ row.name }}</td>
                                <td class="p-2">
                                    <div
                                        :class="
                                            row.value > 12.5
                                                ? 'text-green-500 font-bold'
                                                : row.value < 12.5
                                                  ? 'text-red-500 font-bold'
                                                  : ''
                                        "
                                    >
                                        {{ row.value }}%
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                    <div class="flex justify-center">
                        <NButton size="tiny" type="warning" @click="showModal = false" class="mt-0">关闭</NButton>
                    </div>
                </div>
            </div>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import WikiImg from '@/components/huiji/WikiImg.vue';
import { QuestionCircle as QuestionIcon } from '@vicons/fa';
import { NIcon, NModal, NTooltip } from 'naive-ui';
import CharacterItem from './CharacterItem.vue';

import { NButton } from 'naive-ui';
import { computed, inject, ref } from 'vue';
import { useSearcherDataStore } from '../data/searcherDataStore';
import { convertDescription } from '../utils/convertDescription';
import { Character } from './Character';

const props = defineProps<{
    character: Character;
    onClose?: () => void;
}>();

// 模态框相关
const showModal = ref(false);

// 格式化概率数据
const rateData = computed(() => {
    if (!props.character.characterRates) return [];

    const { rstr, riq, rpie, rvit, rspe, rdex, rluck, rbase } = props.character.characterRates;

    return [
        { name: '力', value: rstr, key: 'rstr' },
        { name: '智慧', value: riq, key: 'riq' },
        { name: '信仰心', value: rpie, key: 'rpie' },
        { name: '生命力', value: rvit, key: 'rvit' },
        { name: '敏捷', value: rspe, key: 'rspe' },
        { name: '灵巧', value: rdex, key: 'rdex' },
        { name: '运', value: rluck, key: 'rluck' },
        { name: '无', value: rbase, key: 'rbase' },
    ];
});

// 打开模态框
const openModal = () => {
    showModal.value = true;
};

// 是否显示概率按钮
const showRateButton = computed(() => {
    if (!props.character.characterRates) return false;

    const { rstr, riq, rpie, rvit, rspe, rdex, rluck, rbase } = props.character.characterRates;
    const rates = [rstr, riq, rpie, rvit, rspe, rdex, rluck, rbase];

    // 检查是否所有值都是12.5
    const allSame = rates.every((rate) => rate === 12.5);

    return !allSame;
});

const getSkillDescription = (skillName: string) => {
    const store = useSearcherDataStore();
    const data = store.getSkillData(skillName);
    if (data) {
        return convertDescription(data.description);
    } else {
        return '技能描述未找到';
    }
};

// 需要过滤掉继承技能
const uniqueSkills = computed(() => {
    return props.character.data.unique_skill.filter((skill) => {
        return skill !== props.character.data.inherit_skill;
    });
});

// 是否有副职业
const hasSubClass = computed(() => {
    return props.character.data.class.length > 1;
});

// 编辑链接
const gotoEditCharacterData = () => {
    const url = `/wiki/Data:Character.schema?target=Data:Character/${props.character.data.key}.json`;
    window.open(url, '_blank');
};

const showEditSkillButton = ref(true);
const toggleEditSkillButton = () => {
    showEditSkillButton.value = !showEditSkillButton.value;
};

const gotoEditSkillData = (skillName: string) => {
    const url = `/wiki/Data:Skill.schema?target=Data:Skill/${skillName}.json`;
    window.open(url, '_blank');
};

const gotoDetail = () => {
    const url = `/wiki/${props.character.data.key}`;
    window.open(url, '_blank');
};

const startCalcStat = inject<(characterName: string, sub?: boolean) => void>('startCalcStat');
// 计算该角色的属性
const startCalcCharacter = (sub: boolean) => {
    if (startCalcStat) {
        startCalcStat(props.character.data.key, sub);
    }
    if (props.onClose) {
        props.onClose();
    }
};

const STAT_KEY_MAP = {
    力: 'str',
    智慧: 'iq',
    信仰心: 'pie',
    生命力: 'vit',
    灵巧: 'dex',
    敏捷: 'spe',
    运: 'luck',
};

const getMainBgColor = (isSub: boolean, stat: string) => {
    const jobName = isSub ? props.character.data.class[1] : props.character.data.class[0];
    if (!jobName) return '';

    if (!props.character.characterRates) return getStatBgColor(isSub, stat);

    const value = props.character.characterRates[STAT_KEY_MAP[stat]];
    if (value === 0) {
        return 'bg-red-800/70';
    } else if (value < 1) {
        return 'bg-violet-800/70';
    }
    return '';
};

// 获取1级属性背景色
const bgMapByRace = {
    '矮人-战士-敏捷': 'bg-violet-800/30',
    '矮人-骑士-运': 'bg-violet-800/30',
    '精灵-盗贼-力': 'bg-violet-800/30',
    '精灵-盗贼-智慧': '',
    '精灵-盗贼-生命力': 'bg-violet-800/30',
    '人类-法师-生命力': '',
    '精灵-法师-运': 'bg-violet-800/30',
};
const bgMap = {
    '战士-智慧': 'bg-red-800/30',
    '战士-信仰心': 'bg-red-800/30',
    '骑士-智慧': 'bg-red-800/30',
    '骑士-敏捷': 'bg-red-800/30',
    '盗贼-智慧': 'bg-red-800/30',
    '盗贼-信仰心': 'bg-red-800/30',
    '法师-力': 'bg-red-800/30',
    '法师-生命力': 'bg-red-800/30',
    '僧侣-敏捷': 'bg-red-800/30',
    '忍者-信仰心': 'bg-red-800/30',
    // '武士-敏捷': 'bg-red-800/30', // 不好说，现在只有一个SR矮人武士
    '游侠-信仰心': 'bg-red-800/30', // 现在只有一个游侠
};

const getStatBgColor = (isSub: boolean, stat: string) => {
    const jobName = isSub ? props.character.data.class[1] : props.character.data.class[0];
    if (!jobName) return '';

    let checkStr = `${props.character.data.race}-${jobName}-${stat}`;
    if (bgMapByRace[checkStr]) {
        return bgMapByRace[checkStr];
    }

    checkStr = `${jobName}-${stat}`;
    if (bgMap[checkStr]) {
        return bgMap[checkStr];
    }
    return '';
};
</script>
