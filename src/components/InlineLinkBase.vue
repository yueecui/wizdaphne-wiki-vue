<template>
    <!-- 传了 customClass 时默认蓝色（普通 / hover）不再生效，文字颜色等完全由它决定 -->
    <span class="cursor-pointer" :class="customClass || 'text-blue-200 hover:text-blue-400'" @click="emit('activate')">
        {{ label }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';

/**
 * 正文内联链接（`*Inline`）的公共外壳：只负责显示文案与点击。
 *
 * 各类数据怎么查、点了打开哪个 modal，仍由各自的组件处理（`useInlineLink`）。
 */
defineOptions({ name: '内联链接基础' });

const props = defineProps<{
    /** 模板里写的名字：只用于脚本加载前显示 */
    name?: string;
    /** 数据里的名字：脚本加载后优先显示它 */
    resolvedName?: string;
    /** 模板里写的 ID：没有名字时兜底显示 `#ID` */
    id?: string;
    /** 页面上原本的显示文本（可选，最优先） */
    showName?: string;
    /** 自定义样式类（模板里的 `data-class`）：有值时替换掉默认的蓝色 */
    customClass?: string;
    /** 什么都查不到时的占位文案 */
    fallback: string;
}>();

const emit = defineEmits<{ activate: [] }>();

/** 显示优先级：原显示文本 -> 数据里的名字 -> 模板名字 -> `#ID` -> 占位文案 */
const label = computed(
    () =>
        props.showName ||
        props.resolvedName ||
        props.name ||
        (props.id ? `#${props.id}` : '') ||
        props.fallback,
);
</script>
