<template>
    <InlineLinkBase
        :name="props.junkName"
        :resolved-name="junk?.name"
        :custom-class="props.customClass"
        fallback="杂物"
        @activate="handleClick"
    />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import InlineLinkBase from './InlineLinkBase.vue';
import { useJunkModalStore } from '../views/DataV2/junk/junkModalStore';
import { useJunkStore } from '../views/DataV2/junk/junkStore';

const props = defineProps<{
    junkName?: string;
    junkHash?: string;
    /** 自定义样式类（模板里的 `data-class`）：有值时替换掉默认的蓝色 */
    customClass?: string;
}>();

const junkStore = useJunkStore();
const junkModalStore = useJunkModalStore();

const junk = computed(() => {
    if (props.junkHash) {
        return junkStore.junkItems.find((item) => item.uniqueCode === props.junkHash) ?? null;
    }
    if (props.junkName) {
        return junkStore.junkItems.find((item) => item.name === props.junkName) ?? null;
    }
    return null;
});

// 杂物表是单独的接口（`Api/GetJunkData`），首次点击时才拉（不拖慢正文页加载）
const handleClick = async () => {
    if (!junkStore.isLoaded) {
        if (junkStore.isLoading) {
            window.wiz.$message.info('杂物数据正在加载，请稍后再试');
            return;
        }
        window.wiz.$message.info('正在加载杂物数据…');
        await junkStore.loadJunkData();
    }

    const target = junk.value;
    if (!target) {
        window.wiz.$message.error('杂物不存在');
        return;
    }

    // 掉落明细按需整理，避免页面加载时算整张表
    if (!target.isInit) target.initJunkItem();
    junkModalStore.openModal(target);
};
</script>
