<template>
    <ThemeConfigProvider>
        <div class="mt-8">
            <DropRecorder />
        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import DropRecorder from './DropRecorder.vue';
</script>
