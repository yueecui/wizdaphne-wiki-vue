<template>
    <div
        v-if="show"
        class="fixed z-50 bg-[#312721] border! border-[#463d38]! rounded shadow-lg"
        :style="{ left: `${x}px`, top: `${y}px` }"
    >
        <div
            v-for="name in labels"
            :key="name"
            class="px-4 py-2 hover:bg-[#463d38] cursor-pointer select-none whitespace-nowrap"
            @click="emit('copy', name)"
        >
            {{ labelOf(name) }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

defineOptions({ name: '复制模板右键菜单' });

const props = defineProps<{
    show: boolean;
    x: number;
    y: number;
    /** wiki 模板名（单个）：物品 / 遗物 / 敌人 / 地图 */
    template?: string;
    /** 多个模板名：商店这种一行能复制成两种模板的场合 */
    templates?: string[];
}>();

const emit = defineEmits<{ copy: [template: string] }>();

/** 「复制 {{物品}}」：花括号在模板里不好直接写，这里拼好 */
const labels = computed(() =>
    props.templates?.length ? props.templates : props.template ? [props.template] : [],
);

const labelOf = (template: string) => `复制 {{${template}}}`;
</script>
