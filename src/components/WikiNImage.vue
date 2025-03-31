<template>
    <template v-if="imageUri && thumbImageNameUri">
        <NImage :imgProps="imageClass" :previewSrc="imageUri" :src="thumbImageNameUri" :width="width" :lazy="isLazy" />
    </template>
</template>

<script setup lang="ts">
import { getImageUrl } from '@/module/getImageUrl';
import { NImage } from 'naive-ui';
import { computed } from 'vue';

const props = withDefaults(
    defineProps<{
        imageName: string | null;
        thumbImageName?: string;
        class?: string | string[];
        isLazy?: boolean;
        width?: string | number;
    }>(),
    {
        isLazy: true,
    },
);

const imageUri = computed(() => {
    if (props.imageName) {
        return getImageUrl(props.imageName);
    }
    return null;
});

const thumbImageNameUri = computed(() => {
    if (props.thumbImageName) {
        return getImageUrl(props.thumbImageName);
    }
    return imageUri.value;
});

const imageClass = computed(() => {
    if (props.class) {
        return {
            class: props.class,
        };
    }
    return {
        class: 'max-w-full',
    };
});
</script>
