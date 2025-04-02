<template>
    <template v-if="imageUri">
        <img :class="imageClass" v-lazy="imageUri" v-if="isLazy" />
        <img :class="imageClass" :src="imageUri" v-else />
    </template>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { getImageUrl } from '../../util/getImageUrl';

const props = withDefaults(
    defineProps<{
        imageName: string | null;
        class?: string | string[];
        isLazy?: boolean;
    }>(),
    {
        isLazy: false,
    },
);

const imageUri = computed(() => {
    if (props.imageName) {
        return getImageUrl(props.imageName);
    }
    return null;
});

const imageClass = computed(() => {
    if (props.class) {
        return props.class;
    }
    return 'max-w-full';
});
</script>
