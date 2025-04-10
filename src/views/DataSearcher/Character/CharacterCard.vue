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
                            <th colspan="2" class="w-1/2">信息</th>
                        </tr>
                        <tr>
                            <th>风格</th>
                            <td>{{ character.data.style ? character.data.style : '基本' }}</td>
                        </tr>
                        <tr>
                            <th>种族</th>
                            <td>{{ character.data.race }}</td>
                        </tr>
                        <tr>
                            <th>性格</th>
                            <td>{{ character.data.personality }}</td>
                        </tr>
                        <tr>
                            <th>缘类型</th>
                            <td>{{ character.data.fate_type }}</td>
                        </tr>
                        <tr>
                            <th class="w-1/2">属性</th>
                            <th class="w-1/2">数值</th>
                        </tr>
                        <tr>
                            <th>力</th>
                            <td>{{ character.stats.strength }}</td>
                        </tr>
                        <tr>
                            <th>智慧</th>
                            <td>{{ character.stats.intelligence }}</td>
                        </tr>
                        <tr>
                            <th>信仰心</th>
                            <td>{{ character.stats.piety }}</td>
                        </tr>
                        <tr>
                            <th>生命力</th>
                            <td>{{ character.stats.vitality }}</td>
                        </tr>
                        <tr>
                            <th>灵巧</th>
                            <td>{{ character.stats.dexterity }}</td>
                        </tr>
                        <tr>
                            <th>敏捷</th>
                            <td>{{ character.stats.speed }}</td>
                        </tr>
                        <tr>
                            <th>运</th>
                            <td>{{ character.stats.luck }}</td>
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
        <div class="flex justify-center mt-4 gap-4" v-if="onClose">
            <NButton size="small" type="warning" @click="onClose">关闭</NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import CharacterItem from './CharacterItem.vue';

import { NButton } from 'naive-ui';
import { computed, ref } from 'vue';
import { MwConfig } from '../../../huiji/MwConfig';
import { SearcherExposeData } from '../data/SearcherExposeData';
import { convertDescription } from '../util/convertDescription';
import { Character } from './Character';

const props = defineProps<{
    character: Character;
    onClose?: () => void;
}>();

const mwConfig = MwConfig.getInstance();

const getSkillDescription = (skillName: string) => {
    const data = SearcherExposeData.getInstance().getSkillData(skillName);
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
</script>
