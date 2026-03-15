<template>
    <span @click="handleClick" class="cursor-pointer text-blue-200 hover:text-blue-400">
        {{ monster?.name || monsterName }}
    </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useMonsterModalStore } from '../stores/monsterModalStore';
import { useMonsterStore } from '../views/DataSearcher/Monster/monsterStore';

const props = defineProps<{
    monsterName: string;
}>();

const monsterStore = useMonsterStore();
const monsterModalStore = useMonsterModalStore();
const monster = computed(() => {
    // 如果monsterName是数字，则按id查询，否则按名称查询
    if (/^\d+$/.test(props.monsterName)) {
        const monsterId = parseInt(props.monsterName, 10);
        return monsterStore.monsters.find((m) => m.id === monsterId);
    } else {
        return monsterStore.monsters.find((m) => m.name === props.monsterName);
    }
});

const handleClick = () => {
    if (monster.value) {
        monsterModalStore.openMonsterModal(monster.value);
    } else if (!monsterStore.isInit) {
        window.wiz.$message.info('敌人数据正在加载，请稍后再试');
    } else {
        window.wiz.$message.error('敌人不存在');
    }
};
</script>
