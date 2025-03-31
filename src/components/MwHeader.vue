<template>
    <component :is="headerCompontent">
        <span class="mw-headline"><slot></slot></span>
    </component>
</template>

<script setup lang="ts">
import { computed, h } from 'vue';

const props = withDefaults(
    defineProps<{
        tagName?: string;
    }>(),
    {
        tagName: 'h2',
    },
);

const headerCompontent = computed(() => {
    return h(props.tagName);
});
</script>
