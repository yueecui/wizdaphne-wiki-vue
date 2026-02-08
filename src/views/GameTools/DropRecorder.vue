<template>
    <div class="flex flex-col gap-4 min-h-[480px]">
        <!-- 加载中界面 -->
        <div v-if="!isInit" class="flex-1 flex items-center justify-center min-h-[400px]">
            <div class="text-center">
                <div class="text-lg text-gray-400">加载数据中...</div>
            </div>
        </div>

        <!-- 主界面 -->
        <template v-else>
            <div class="flex justify-between">
                <div class="flex gap-2">
                    <NButton :type="activeKey === 'Near' ? 'primary' : 'default'" @click="() => (activeKey = 'Near')">
                        临期
                    </NButton>
                    <NButton :type="activeKey === 'All' ? 'primary' : 'default'" @click="() => (activeKey = 'All')">
                        预设
                    </NButton>
                    <NButton
                        :type="activeKey === 'Custom' ? 'primary' : 'default'"
                        @click="() => (activeKey = 'Custom')"
                    >
                        自定义
                    </NButton>
                </div>
                <div class="flex gap-2">
                    <NButton @click="() => showImporter('export')">导出</NButton>
                    <NButton @click="() => showImporter('import')">导入</NButton>
                </div>
            </div>

            <DropRecorderNear v-if="activeKey === 'Near'" @clickItem="clickItem" />
            <DropRecorderAll v-if="activeKey === 'All'" @clickItem="clickItem" />
            <DropRecorderCustom v-if="activeKey === 'Custom'" @clickItem="clickItem" />
        </template>
    </div>

    <div class="md:hidden flex justify-center mt-4 gap-4" v-if="onClose">
        <NButton size="small" type="warning" @click="onClose">关闭</NButton>
    </div>
    <NModal v-model:show="isShowItem">
        <div class="max-w-[90%] mx-auto huiji-css-hook bg-transparent!">
            <DropRecorderItem :item="showItem" :onClose="closeItem" />
        </div>
    </NModal>
    <DropRecorderImporter v-model:show="isShowImporter" :mode="importMode" />
</template>

<script setup lang="tsx">
import { NButton, NModal } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { ref } from 'vue';
import DropRecorderAll from './DropRecorderAll.vue';
import DropRecorderCustom from './DropRecorderCustom.vue';
import DropRecorderImporter from './DropRecorderImporter.vue';
import DropRecorderItem from './DropRecorderItem.vue';
import DropRecorderNear from './DropRecorderNear.vue';
import { useDropRecordStore } from './dropRecordStore';
import { AbstractRecordConfig } from './type';

defineProps<{
    onClose?: () => void;
}>();

const dropRecordStore = useDropRecordStore();
const { isInit } = storeToRefs(dropRecordStore);

const activeKey = ref('Near');

const isShowItem = ref(false);
const showItem = ref<AbstractRecordConfig | null>(null);
const clickItem = (item: AbstractRecordConfig) => {
    isShowItem.value = true;
    showItem.value = item;
};
const closeItem = () => {
    isShowItem.value = false;
};

// 导入导出
const isShowImporter = ref(false);
const importMode = ref<'import' | 'export'>('import');
const showImporter = (mode: 'import' | 'export') => {
    importMode.value = mode;
    isShowImporter.value = true;
};
</script>
