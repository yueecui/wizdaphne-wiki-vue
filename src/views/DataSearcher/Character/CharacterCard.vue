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
                                        红色背景为该职业的该属性可能无法在1级看到个体奖励的1点特性值
                                        <br />
                                        具体可参考
                                        <a href="/wiki/能力值#无法识别的个体" target="_blank">这里</a>
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
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getStatBgColor(false, '力')]">
                                {{ character.stats?.strength || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '力')]" v-if="character.subStats">
                                {{ character.subStats.strength }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">智慧</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getStatBgColor(false, '智慧')]">
                                {{ character.stats?.intelligence || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '智慧')]" v-if="character.subStats">
                                {{ character.subStats.intelligence }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">信仰心</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getStatBgColor(false, '信仰心')]">
                                {{ character.stats?.piety || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '信仰心')]" v-if="character.subStats">
                                {{ character.subStats.piety }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">生命力</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getStatBgColor(false, '生命力')]">
                                {{ character.stats?.vitality || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '生命力')]" v-if="character.subStats">
                                {{ character.subStats.vitality }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">灵巧</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getStatBgColor(false, '灵巧')]">
                                {{ character.stats?.dexterity || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '灵巧')]" v-if="character.subStats">
                                {{ character.subStats.dexterity }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">敏捷</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getStatBgColor(false, '敏捷')]">
                                {{ character.stats?.speed || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '敏捷')]" v-if="character.subStats">
                                {{ character.subStats.speed }}
                            </td>
                        </tr>
                        <tr>
                            <th class="md:w-1/3">运</th>
                            <td :class="[hasSubClass ? 'md:w-1/3' : 'md:w-2/3', getStatBgColor(false, '运')]">
                                {{ character.stats?.luck || 0 }}
                            </td>
                            <td :class="['md:w-1/3', getStatBgColor(true, '运')]" v-if="character.subStats">
                                {{ character.subStats.luck }}
                            </td>
                        </tr>
                    </tbody>
                </table>
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
                                    <div>{{ getSkillDescription(character.data.discipline_skill) }}</div>
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
    </div>
</template>

<script setup lang="ts">
import WikiImg from '@/components/huiji/WikiImg.vue';
import { QuestionCircle as QuestionIcon } from '@vicons/fa';
import { NIcon, NTooltip } from 'naive-ui';
import CharacterItem from './CharacterItem.vue';

import { NButton } from 'naive-ui';
import { computed, inject, ref } from 'vue';
import { useSearcherDataStore } from '../data/searcherDataStore';
import { convertDescription } from '../util/convertDescription';
import { Character } from './Character';

const props = defineProps<{
    character: Character;
    onClose?: () => void;
}>();

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

// 获取1级属性背景色
const redBgMap = ['战士-智慧', '战士-信仰心', '骑士-智慧', '骑士-敏捷', '盗贼-信仰心', '法师-力', '僧侣-敏捷'];

const getStatBgColor = (isSub: boolean, stat: string) => {
    const jobName = isSub ? props.character.data.class[1] : props.character.data.class[0];
    if (!jobName) return '';

    const checkStr = `${jobName}-${stat}`;
    if (redBgMap.includes(checkStr)) {
        return 'bg-red-800/30';
    }
    return '';
};
</script>
