<template>
    <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">
        {{ showName || mapName }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMonsterModalStore } from '../stores/monsterModalStore';
import { useMonsterStore } from '../views/DataSearcher/Monster/monsterStore';

const props = defineProps<{
    mapName: string;
    showName: string;
}>();

const monsterStore = useMonsterStore();
const monsterModalStore = useMonsterModalStore();
const map = computed(() => {
    return (
        monsterStore.maps.find((m) => m.name === props.mapName) ||
        monsterStore.maps.find((m) => m.shortName === props.mapName)
    );
});

const handleClick = () => {
    if (map.value) {
        monsterModalStore.openMapModal(map.value);
    } else if (!monsterStore.isInit) {
        window.wiz.$message.info('地图数据正在加载，请稍后再试');
    } else {
        window.wiz.$message.error('地图不存在');
    }
};
</script>
