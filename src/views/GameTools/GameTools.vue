<template>
    <ThemeConfigProvider>
        <div class="fixed top-32 right-0 hidden md:block!">
            <div
                class="w-12 py-1 flex flex-col items-center bg-card border-cardborder border-solid border-l! rounded-l-2xl container-shadow"
            >
                <div
                    class="w-8 h-8 relative group cursor-pointer flex items-center justify-center"
                    @click="showDropRecorder"
                >
                    <NIcon class="text-white">
                        <DropRecorderIcon></DropRecorderIcon>
                    </NIcon>
                    <div
                        class="hidden md:group-hover:!block absolute z-10 -translate-x-full! w-max px-2 bg-black/70 text-white rounded text-center drop-shadow-inline"
                    >
                        掉落计时器
                    </div>
                </div>
                <div
                    class="w-8 h-8 relative group cursor-pointer flex items-center justify-center"
                    @click="showCounter"
                >
                    <NIcon class="text-white">
                        <SomethingCounterIcon></SomethingCounterIcon>
                    </NIcon>
                    <div
                        class="hidden md:group-hover:!block absolute z-10 -translate-x-full! w-max px-2 bg-black/70 text-white rounded text-center drop-shadow-inline"
                    >
                        计数器
                    </div>
                </div>
                <div
                    class="w-8 h-8 relative group cursor-pointer flex items-center justify-center"
                    @click="showHPCalculator"
                >
                    <NIcon class="text-white">
                        <CalculatorIcon></CalculatorIcon>
                    </NIcon>
                    <div
                        class="hidden md:group-hover:!block absolute z-10 -translate-x-full! w-max px-2 bg-black/70 text-white rounded text-center drop-shadow-inline"
                    >
                        伤害记录
                    </div>
                </div>
            </div>
            <NModal v-model:show="isShowDropRecorder">
                <div class="w-[90%] md:h-auto md:max-w-[960px] m-auto huiji-css-hook bg-transparent!">
                    <div class="p-4 my-4 bg-card! border! border-cardborder! rounded">
                        <DropRecorder :onClose="closeDropRecorder" />
                    </div>
                </div>
            </NModal>
            <NModal v-model:show="isShowCounter">
                <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                    <SomethingCounter :onClose="closeCounter" />
                </div>
            </NModal>
            <NModal v-model:show="isShowHPCalculator">
                <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                    <HPCalculator :onClose="closeHPCalculator" />
                </div>
            </NModal>
        </div>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import {
    Calculator as CalculatorIcon,
    Clock as DropRecorderIcon,
    ShoppingBag as SomethingCounterIcon,
} from '@vicons/fa';
import { NIcon, NModal } from 'naive-ui';
import ThemeConfigProvider from '../../layout/ThemeConfigProvider.vue';
import DropRecorder from './DropRecorder.vue';
import HPCalculator from './HPCalculator.vue';
import SomethingCounter from './SomethingCounter.vue';

import { ref } from 'vue';

defineOptions({
    // name: '侧边工具栏',
});

const isShowDropRecorder = ref(false);
const showDropRecorder = () => {
    isShowDropRecorder.value = true;
};
const closeDropRecorder = () => {
    isShowDropRecorder.value = false;
};

const isShowCounter = ref(false);
const showCounter = () => {
    isShowCounter.value = true;
};
const closeCounter = () => {
    isShowCounter.value = false;
};

const isShowHPCalculator = ref(false);
const showHPCalculator = () => {
    isShowHPCalculator.value = true;
};
const closeHPCalculator = () => {
    isShowHPCalculator.value = false;
};
</script>

<style scoped lang="less">
.container-shadow {
    box-shadow:
        rgb(0 0 0/ 60%) -1px 1px 1px,
        rgb(0 0 0/ 60%) -1px 0px 1px,
        rgb(0 0 0 / 60%) -1px -1px 1px;
}
</style>
