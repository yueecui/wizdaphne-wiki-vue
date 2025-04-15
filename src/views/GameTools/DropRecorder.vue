<template>
    <div class="flex flex-col gap-4 min-h-[480px]">
        <div class="flex justify-between">
            <div class="flex gap-2">
                <NButton :type="activeKey === 'Near' ? 'primary' : 'default'" @click="() => (activeKey = 'Near')">
                    待办项目
                </NButton>
                <NButton :type="activeKey === 'All' ? 'primary' : 'default'" @click="() => (activeKey = 'All')">
                    全部
                </NButton>
            </div>
            <div class="flex gap-2">
                <NButton @click="() => showImporter('export')">导出</NButton>
                <NButton @click="() => showImporter('import')">导入</NButton>
            </div>
        </div>

        <div v-if="activeKey === 'Near'">
            <table class="wiztable text-center my-0! w-full" v-if="nearDropConfigs.length > 0">
                <thead>
                    <tr>
                        <th class="w-[4em] md:w-[8em]">类型</th>
                        <th>项目</th>
                        <th class="w-[4em] md:w-[11em]">
                            <NTooltip trigger="hover">
                                <template #trigger>
                                    <div class="flex items-center justify-center gap-1 leading-none">
                                        刷新时间
                                        <NIcon><QuestionIcon /></NIcon>
                                    </div>
                                </template>
                                <component :is="refreshText" />
                            </NTooltip>
                        </th>
                        <th class="w-[5.5em] md:w-[11em]">计时</th>
                    </tr>
                </thead>
                <tbody>
                    <template v-for="item in nearDropConfigs" :key="item.id">
                        <tr
                            v-if="item instanceof DropConfig"
                            class="hover:bg-trhoverbg cursor-pointer"
                            :class="getNearClass(item)"
                            @click="() => clickItem(item)"
                        >
                            <td>{{ getDropCategoryText(item.category) }}</td>
                            <td class="text-left">{{ item.title }}</td>
                            <td>
                                <NTooltip trigger="hover" v-if="item.hasMaxInterval()">
                                    <template #trigger>
                                        <div class="w-full h-full">{{ item.getRefreshTimeText() }}</div>
                                    </template>
                                    <div>{{ item.getRefreshTimeText('plus') }}</div>
                                </NTooltip>
                                <template v-else>
                                    {{ item.getRefreshTimeText() }}
                                </template>
                            </td>
                            <td>
                                <div class="flex flex-col">
                                    <div>
                                        {{ getRemainTimeText(item) }}
                                    </div>
                                    <div v-if="isItemHasLastCheck(item)" class="text-xs text-gray-400">
                                        {{ getLastCheckText(item) }} 检查
                                    </div>
                                </div>
                            </td>
                        </tr>
                        <tr
                            v-if="item instanceof FixedRefreshConfig"
                            class="hover:bg-trhoverbg cursor-pointer"
                            :class="getNearClass(item)"
                            @click="() => clickItem(item)"
                        >
                            <td>固定周期</td>
                            <td class="text-left">{{ item.title }}</td>
                            <td>{{ item.getRefreshTimeText() }}</td>
                            <td>{{ getRemainTimeText(item) }}</td>
                        </tr>
                    </template>
                </tbody>
            </table>
            <div class="h-[360px] flex items-center justify-center" v-else>
                <div class="text-center text-gray-400">暂无一天内会刷新的项目</div>
            </div>
        </div>
        <div v-if="activeKey === 'All'" class="flex flex-col gap-4">
            <div class="text-center text-amber-300 mt-4 text-sm">
                <refreshText />
                <span>
                    还可参阅
                    <a href="/wiki/可刷新奖励">可刷新奖励</a>
                    条目获取更多信息
                </span>
            </div>
            <table class="wiztable text-center my-0! w-full">
                <thead>
                    <tr>
                        <th colspan="3">固定周期</th>
                    </tr>
                    <tr>
                        <th>项目</th>
                        <th class="w-[4em] md:w-[11em]">刷新时间</th>
                        <th class="w-[5.5em] md:w-[11em]">计时</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in fixedConfigs"
                        :key="item.data.id"
                        class="hover:bg-trhoverbg cursor-pointer"
                        :class="isNear(item) ? 'text-green-400' : ''"
                        @click="() => clickItem(item)"
                    >
                        <td class="text-left">{{ item.data.title }}</td>
                        <td>{{ item.getRefreshTimeText() }}</td>
                        <td>{{ getRemainTimeText(item) }}</td>
                    </tr>
                </tbody>
            </table>
            <table class="wiztable text-center my-0! w-full" v-for="category in dropCategorys" :key="category.i">
                <thead>
                    <tr>
                        <th colspan="3">{{ category.name }}</th>
                    </tr>
                    <tr>
                        <th>项目</th>
                        <th class="w-[4em] md:w-[11em]">刷新时间</th>
                        <th class="w-[5.5em] md:w-[11em]">计时</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in getDropConfigsByCategory(category.i)"
                        :key="item.data.id"
                        class="hover:bg-trhoverbg cursor-pointer"
                        :class="isNear(item) ? 'text-green-400' : ''"
                        @click="() => clickItem(item)"
                    >
                        <td class="text-left">{{ item.data.title }}</td>
                        <td>
                            <NTooltip trigger="hover" v-if="item.hasMaxInterval()">
                                <template #trigger>
                                    <div class="w-full h-full">{{ item.getRefreshTimeText() }}</div>
                                </template>
                                <div>{{ item.getRefreshTimeText('plus') }}</div>
                            </NTooltip>
                            <template v-else>
                                {{ item.getRefreshTimeText() }}
                            </template>
                        </td>
                        <td>
                            <div class="flex flex-col">
                                <div>
                                    {{ getRemainTimeText(item) }}
                                </div>
                                <div v-if="isItemHasLastCheck(item)" class="text-xs text-gray-400">
                                    {{ getLastCheckText(item) }} 检查
                                </div>
                            </div>
                        </td>
                    </tr>
                </tbody>
            </table>
        </div>
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
import { QuestionCircle as QuestionIcon } from '@vicons/fa';
import { NButton, NIcon, NTooltip } from 'naive-ui';
import DropRecorderImporter from './DropRecorderImporter.vue';
import DropRecorderItem from './DropRecorderItem.vue';

import { NModal } from 'naive-ui';
import { computed, ref, toRefs, watch } from 'vue';
import { DropConfig } from './classes/DropConfig';
import { FixedRefreshConfig } from './classes/FixedRefreshConfig';
import { useDropRecordStore } from './dropRecordStore';
import { AbstractRecordConfig } from './type';

defineProps<{
    onClose?: () => void;
}>();

const dropRecordStore = useDropRecordStore();

const { dropConfigs, fixedConfigs, getDropConfigsByCategory, dropCategorys, getDropCategoryText } =
    toRefs(dropRecordStore);

const activeKey = ref('Near');
watch(
    () => dropRecordStore.isInit,
    (isInit) => {
        if (isInit) {
            if (nearDropConfigs.value.length === 0) {
                activeKey.value = 'All';
            }
        }
    },
);

const nearDropConfigs = computed<AbstractRecordConfig[]>(() => {
    const nearConfigs = [
        // 第一部分是有记录的drop record，并且临期了
        ...dropConfigs.value.filter((config) => config.isNear()),
        // 第二部分是检查所有固定项目，临期或是没记录的都要
        ...fixedConfigs.value.filter((config) => config.isNear()),
    ];

    nearConfigs.sort((a, b) => {
        return a.getNextTargetTime() - b.getNextTargetTime();
    });
    return nearConfigs;
});

const isShowItem = ref(false);
const showItem = ref<AbstractRecordConfig | null>(null);
const clickItem = (item: AbstractRecordConfig) => {
    isShowItem.value = true;
    showItem.value = item;
};
const closeItem = () => {
    isShowItem.value = false;
};

const isNear = (item: AbstractRecordConfig) => {
    return item.isNear();
};

const getNearClass = (item: AbstractRecordConfig) => {
    return item.getNearClass();
};

const getRemainTimeText = (item: AbstractRecordConfig) => {
    return item.getRemainTimeText();
};

const isItemHasLastCheck = (item: AbstractRecordConfig) => {
    return !!item.getLastCheck();
};

const getLastCheckText = (item: AbstractRecordConfig) => {
    return item.getLastCheckText();
};

// 导入导出
const isShowImporter = ref(false);
const importMode = ref<'import' | 'export'>('import');
const showImporter = (mode: 'import' | 'export') => {
    importMode.value = mode;
    isShowImporter.value = true;
};

// 刷新说明文本
const refreshText = () => {
    return (
        <div>
            刷新时间根据网络收集和实际测试总结，未必与官方设置相同，仅供参考
            <br />
            只有一个时间的也不表示到时肯定刷新，只是目前数据不足，实际应该也是一定时间范围内随机刷新
        </div>
    );
};
</script>
