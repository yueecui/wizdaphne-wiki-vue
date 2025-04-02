<template>
    <WikiImg :imageName="imageName" :class="imageClass" :isLazy="isLazy"></WikiImg>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ELEMENT_TYPE } from '../views/DataSearcher/data/enum';
import WikiImg from './huiji/WikiImg.vue';

const props = withDefaults(
    defineProps<{
        element: ELEMENT_TYPE;
        class?: string | string[];
        isLazy?: boolean;
    }>(),
    {
        isLazy: true,
    },
);

const imageName = computed(() => {
    switch (props.element) {
        case ELEMENT_TYPE.无:
            return 'Element_icon_1.png';
        case ELEMENT_TYPE.暗:
            return 'Element_icon_2.png';
        case ELEMENT_TYPE.光:
            return 'Element_icon_3.png';
        case ELEMENT_TYPE.火:
            return 'Element_icon_4.png';
        case ELEMENT_TYPE.水:
            return 'Element_icon_5.png';
        case ELEMENT_TYPE.风:
            return 'Element_icon_6.png';
        case ELEMENT_TYPE.土:
            return 'Element_icon_7.png';
    }
});

const imageClass = computed(() => {
    if (props.class) {
        return props.class;
    }
    return 'w-8 h-8';
});
</script>
