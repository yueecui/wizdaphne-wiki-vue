<template>
    <div
        v-if="show"
        class="fixed z-50 bg-[#312721] border! border-[#463d38]! rounded shadow-lg"
        :style="{ left: `${x}px`, top: `${y}px` }"
    >
        <div class="px-4 py-2 hover:bg-[#463d38] cursor-pointer select-none" @click="emit('copy')">
            {{ label }}
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
    /** wiki 模板名：物品 / 遗物 / 敌人 / 地图 */
    template: string;
}>();

const emit = defineEmits<{ copy: [] }>();

/** 「复制 {{物品}}」：花括号在模板里不好直接写，这里拼好 */
const label = computed(() => `复制 {{${props.template}}}`);
</script>
