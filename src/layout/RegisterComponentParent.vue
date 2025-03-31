<template>
    <AppProvider>
        <RegisterComponentChildren />
    </AppProvider>
</template>

<script setup lang="ts">
import AppProvider from './AppProvider.vue';
import RegisterComponentChildren from './RegisterComponentChildren.vue';
</script>

<style lang="less">
@font-face {
    font-family: 'Dincond-bold';
    src: url('@{ImageUrl}/starrail/uploads/6/64/DINCOND-BOLD.otf') format('opentype');
}

.number {
    font-family: 'Dincond-bold';
    letter-spacing: 1px;
}

@font-face {
    font-family: 'FirstWorld';
    src: url('@{ImageUrl}/starrail/uploads/4/47/FirstWorld.ttf') format('truetype');
}

.world1-font {
    -webkit-user-select: none;
    user-select: none;
    font-family: 'FirstWorld', sans-serif;
}

@font-face {
    font-family: 'SecondWorld';
    src: url('@{ImageUrl}/starrail/uploads/2/22/SecondWorld.ttf') format('truetype');
}

.world2-font {
    -webkit-user-select: none;
    user-select: none;
    font-family: 'SecondWorld', sans-serif;
}
</style>
