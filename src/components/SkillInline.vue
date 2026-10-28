<template>
    <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">
        {{ label }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useInlineLink } from './inlineLink';

const props = defineProps<{
    /** 模板里的名字：只用于脚本加载前显示（技能重名太多，定位不用它） */
    skillName?: string;
    /** 技能 identification：靠它定位 */
    skillId?: string;
}>();

const link = useInlineLink();

const identification = computed(() => {
    const value = Number((props.skillId ?? '').trim());
    return Number.isFinite(value) && value > 0 ? value : null;
});

const skill = computed(() => (identification.value == null ? null : link.findSkill(identification.value)));

/** 数据没加载时用模板里写的名字（或 ID）兜底 */
const label = computed(() => skill.value?.name || props.skillName || (props.skillId ? `#${props.skillId}` : '技能'));

const handleClick = () => {
    if (identification.value == null) {
        window.wiz.$message.error('技能链接缺少 ID');
        return;
    }
    void link.openSkill(identification.value);
};
</script>
