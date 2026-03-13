<template>
    <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">
        {{ junk?.name || junkName }}
    </span>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useJunkModalStore } from '../stores/junkModalStore';
import { useJunkStore } from '../views/DataSearcher/Junk/junkStore';

const props = defineProps<{
    junkName?: string;
    junkHash?: string;
}>();

const junkStore = useJunkStore();
const junkModalStore = useJunkModalStore();
const junk = computed(() => {
    if (props.junkHash) {
        return junkStore.junkItems.find((j) => j.uniqueCode === props.junkHash);
    } else if (props.junkName) {
        return junkStore.junkItems.find((j) => j.name === props.junkName);
    }
    return null;
});

onMounted(async () => {
    await junkStore.loadJunkData();
    if (props.junkHash) {
        await junkStore.initJunkItemDetailByHash(props.junkHash);
    } else if (props.junkName) {
        await junkStore.initJunkItemDetailByName(props.junkName);
    }
});

const handleClick = () => {
    if (junk.value) {
        junkModalStore.openModal(junk.value);
    } else if (!junkStore.isLoaded) {
        window.wiz.$message.info('杂物数据正在加载，请稍后再试');
    } else {
        window.wiz.$message.error('杂物不存在');
    }
};
</script>
