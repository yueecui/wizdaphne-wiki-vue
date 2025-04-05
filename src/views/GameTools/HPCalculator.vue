<template>
    <div class="p-4 bg-card! border! border-cardborder! rounded flex flex-col gap-4">
        <div class="text-xl">
            <template v-if="totalDamage > 0">总伤害：{{ totalDamage }}</template>
            <template v-else>伤害记录</template>
        </div>
        <div class="">
            <div class="">
                <NInput
                    v-model:value="data"
                    class="w-full"
                    placeholder="每行一个数字"
                    type="textarea"
                    :rows="10"
                    :autosize="{ minRows: 10, maxRows: 10 }"
                ></NInput>
            </div>
        </div>
        <div class="flex justify-center">
            <NButton size="small" class="" @click="reset">重置</NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NInput } from 'naive-ui';

import { useLocalStorage } from '@vueuse/core';
import { computed } from 'vue';

const data = useLocalStorage<string>('hp_calculator', '');

const totalDamage = computed(() => {
    const lines = data.value.split('\n');
    let total = 0;
    for (const line of lines) {
        const num = parseFloat(line);
        if (!isNaN(num)) {
            total += num;
        }
    }
    return total;
});

const reset = () => {
    data.value = '';
};
</script>
