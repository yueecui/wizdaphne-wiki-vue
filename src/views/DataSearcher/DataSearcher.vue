<template>啊啊啊</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { getData } from '../../module/getData';

onMounted(() => {
    const data = getData('DATA');
    console.log(data);
});
</script>
