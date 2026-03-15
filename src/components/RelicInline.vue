<template>
    <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">
        {{ relic?.name || relicName }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMonsterModalStore } from '../stores/monsterModalStore';
import { useMonsterStore } from '../views/DataSearcher/Monster/monsterStore';
import type { RelicBrew } from '../views/DataSearcher/RelicBrew/RelicBrew';

const props = defineProps<{
    relicName: string;
}>();

const monsterStore = useMonsterStore();
const monsterModalStore = useMonsterModalStore();
const relic = computed(() => {
    return monsterStore.relicBrews.find((r) => r.name === props.relicName) as RelicBrew | undefined;
});

const handleClick = () => {
    if (relic.value) {
        monsterModalStore.openRelicModal(relic.value);
    } else if (!monsterStore.isInit) {
        window.wiz.$message.info('遗物数据正在加载，请稍后再试');
    } else {
        window.wiz.$message.error('遗物不存在');
    }
};
</script>