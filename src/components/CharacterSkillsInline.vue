<template>
    <!-- 标题（`==技能概览==`）由 wiki 页面生成，组件只负责表格内容 -->
    <div>
        <table v-if="groups.length" class="wikitable">
            <tbody>
                <tr>
                    <th class="w-28">类型</th>
                    <th>名称</th>
                    <th>技能描述</th>
                </tr>
                <template v-for="group in groups" :key="group.label">
                    <tr v-for="(skill, index) in group.skills" :key="`${group.label}-${skill.identification}`">
                        <th v-if="index === 0" :rowspan="group.skills.length" class="text-center">
                            {{ group.label }}
                            <WikiImg
                                v-if="group.label === PAGE_SKILL_LABELS.potential"
                                imageName="icon_RareSkills.png"
                                class="w-5 h-5 inline-block align-middle"
                            />
                        </th>
                        <td>
                            <span
                                class="text-light cursor-pointer hover:opacity-70"
                                :title="`点击查看「${skill.name}」详情`"
                                @click="openSkill(skill.identification)"
                            >
                                {{ skill.name }}
                            </span>
                        </td>
                        <td class="whitespace-pre-line">{{ descOf(skill.identification) }}</td>
                    </tr>
                </template>
            </tbody>
        </table>

        <div v-else class="py-4 text-sm opacity-50">{{ placeholder }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { buildSkillGroups, PAGE_SKILL_LABELS } from '../views/DataV2/characterSkills';
import { useCharacterPage } from './characterPage';
import WikiImg from './huiji/WikiImg.vue';
import { useInlineLink } from './inlineLink';

defineOptions({ name: '技能概览' });

const props = defineProps<{
    /** wiki 页面名（`data-name`）：角色名，或「风格名 + 角色名」 */
    characterName?: string;
    /** 角色 ID（`data-id`）：有就优先按它定位 */
    characterId?: string;
}>();

const { store, character, placeholder } = useCharacterPage(props);
const link = useInlineLink();

/** 分组沿用旧模板的叫法：固有被动 / 固有主动 / 继承技能 / 潜在继承技能 / 克己被动 */
const groups = computed(() =>
    buildSkillGroups(
        character.value?.skills,
        (identification) => store.skillById.get(identification)?.is_passive ?? false,
        PAGE_SKILL_LABELS,
    ),
);

const descOf = (identification: number) => store.skillById.get(identification)?.description || '技能描述未找到';

/** 点击技能名走全局 modal 宿主（`InlineModalHost` → `SkillModal`） */
const openSkill = (identification: number) => {
    void link.openSkill(identification);
};
</script>
