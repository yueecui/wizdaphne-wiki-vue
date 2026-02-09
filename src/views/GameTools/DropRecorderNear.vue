<template>
    <div class="flex flex-col gap-4">
        <!-- Tab 过滤 -->
        <div class="flex gap-2 flex-wrap">
            <NButton :type="activeTab === 'all' ? 'primary' : 'default'" @click="() => (activeTab = 'all')">
                全部
            </NButton>
            <NButton
                v-if="hasFixedNearItems"
                :type="activeTab === 'fixed' ? 'primary' : 'default'"
                @click="() => (activeTab = 'fixed')"
            >
                固定周期
            </NButton>
            <NButton
                v-for="category in filteredDropCategorys"
                :key="category.i"
                :type="activeTab === category.i ? 'primary' : 'default'"
                @click="() => (activeTab = category.i)"
            >
                {{ category.name }}
            </NButton>
            <NButton
                v-if="hasCustomNearItems"
                :type="activeTab === 'custom' ? 'primary' : 'default'"
                @click="() => (activeTab = 'custom')"
            >
                自定义
            </NButton>
        </div>

        <table class="wiztable text-center my-0! w-full" v-if="filteredNearDropConfigs.length > 0">
            <thead>
                <tr>
                    <th colspan="4">重要物品计时</th>
                </tr>
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
                <template v-for="item in filteredNearDropConfigs" :key="item.id">
                    <tr
                        v-if="item instanceof DropConfig"
                        class="hover:bg-trhoverbg cursor-pointer"
                        :class="getNearClass(item)"
                        @click="() => clickItem(item)"
                    >
                        <td>{{ getDropCategoryText(item.category) }}</td>
                        <td class="text-left">
                            <div class="flex justify-between">
                                <div>
                                    {{ item.title }}
                                </div>
                                <div class="hidden md:block!">
                                    <NButton size="tiny" @click.stop="() => saveNewRecord(item)">快速记录</NButton>
                                </div>
                            </div>
                        </td>

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
                        <td class="text-left">
                            <div class="flex justify-between">
                                <div>
                                    {{ item.title }}
                                </div>
                                <div class="hidden md:block!">
                                    <NButton size="tiny" @click.stop="() => saveNewRecord(item)">快速记录</NButton>
                                </div>
                            </div>
                        </td>
                        <td>{{ item.getRefreshTimeText() }}</td>
                        <td>{{ getRemainTimeText(item) }}</td>
                    </tr>
                    <tr
                        v-if="item instanceof CustomConfig"
                        class="hover:bg-trhoverbg cursor-pointer"
                        :class="getNearClass(item)"
                        @click="() => clickItem(item)"
                    >
                        <td>自定义</td>
                        <td class="text-left">
                            <div class="flex justify-between">
                                <div>
                                    {{ item.title }}
                                </div>
                                <div class="hidden md:block!">
                                    <NButton size="tiny" @click.stop="() => saveNewRecord(item)">快速记录</NButton>
                                </div>
                            </div>
                        </td>
                        <td>{{ item.getRefreshTimeText() }}</td>
                        <td>{{ getRemainTimeText(item) }}</td>
                    </tr>
                </template>
            </tbody>
        </table>
        <table class="wiztable text-center my-0! w-full" v-if="filteredNerfJunkDropConfigs.length > 0">
            <thead>
                <tr>
                    <th colspan="4">杂物类计时</th>
                </tr>
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
                <template v-for="item in filteredNerfJunkDropConfigs" :key="item.id">
                    <tr
                        v-if="item instanceof DropConfig"
                        class="hover:bg-trhoverbg cursor-pointer"
                        :class="getNearClass(item)"
                        @click="() => clickItem(item)"
                    >
                        <td>{{ getDropCategoryText(item.category) }}</td>
                        <td class="text-left">
                            <div class="flex justify-between">
                                <div>
                                    {{ item.title }}
                                </div>
                                <div class="hidden md:block!">
                                    <NButton size="tiny" @click.stop="() => saveNewRecord(item)">快速记录</NButton>
                                </div>
                            </div>
                        </td>
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
                        <td class="text-left">
                            <div class="flex justify-between">
                                <div>
                                    {{ item.title }}
                                </div>
                                <div class="hidden md:block!">
                                    <NButton size="tiny" @click.stop="() => saveNewRecord(item)">快速记录</NButton>
                                </div>
                            </div>
                        </td>
                        <td>{{ item.getRefreshTimeText() }}</td>
                        <td>{{ getRemainTimeText(item) }}</td>
                    </tr>
                    <tr
                        v-if="item instanceof CustomConfig"
                        class="hover:bg-trhoverbg cursor-pointer"
                        :class="getNearClass(item)"
                        @click="() => clickItem(item)"
                    >
                        <td>自定义</td>
                        <td class="text-left">
                            <div class="flex justify-between">
                                <div>
                                    {{ item.title }}
                                </div>
                                <div class="hidden md:block!">
                                    <NButton size="tiny" @click.stop="() => saveNewRecord(item)">快速记录</NButton>
                                </div>
                            </div>
                        </td>
                        <td>{{ item.getRefreshTimeText() }}</td>
                        <td>{{ getRemainTimeText(item) }}</td>
                    </tr>
                </template>
            </tbody>
        </table>
        <div
            class="h-[360px] flex items-center justify-center"
            v-if="filteredNearDropConfigs.length === 0 && filteredNerfJunkDropConfigs.length === 0"
        >
            <div class="text-center text-gray-400">暂无一天内会刷新的项目</div>
        </div>
        <div class="text-center text-amber-300 mt-4 text-sm">
            <div>
                刷新时间小于14天的，会在剩余时间小于1天时显示
                <br />
                刷新时间大于等于14天的，会在剩余时间小于3天时显示
            </div>
        </div>
    </div>
</template>

<script setup lang="tsx">
import { QuestionCircle as QuestionIcon } from '@vicons/fa';
import { NButton, NIcon, NTooltip } from 'naive-ui';
import { computed, ref, toRefs } from 'vue';
import { CustomConfig } from './classes/CustomConfig';
import { DropConfig } from './classes/DropConfig';
import { FixedRefreshConfig } from './classes/FixedRefreshConfig';
import { useDropRecordStore } from './dropRecordStore';
import { AbstractRecordConfig } from './type';

const emit = defineEmits<{
    clickItem: [item: AbstractRecordConfig];
}>();

const dropRecordStore = useDropRecordStore();

const { dropConfigs, fixedConfigs, getDropCategoryText, customConfigsData, dropCategorys } = toRefs(dropRecordStore);

// 当前激活的 Tab，不保存，默认显示全部
const activeTab = ref<string | number>('all');

// 自定义项配置
const customConfigs = computed(() => {
    return customConfigsData.value.map((data) => new CustomConfig(data));
});

const nearDropConfigs = computed<AbstractRecordConfig[]>(() => {
    const nearConfigs = [
        // 第一部分是有记录的drop record，并且临期了
        ...dropConfigs.value.filter((config) => config.isNear() && !config.isHidden && !config.isJunk),
        // 第二部分是有记录的固定项目，并且临期了
        ...fixedConfigs.value.filter((config) => config.getLastRecord() !== 0 && config.isNear()),
        // 第三部分是自定义项（非杂物）
        ...customConfigs.value.filter((config) => config.isNear() && !config.isHidden && !config.isJunk),
    ];

    nearConfigs.sort((a, b) => {
        return a.getNextTargetTime() - b.getNextTargetTime();
    });
    return nearConfigs;
});

const nerfJunkDropConfigs = computed(() => {
    const nearJunkConfigs = [
        ...dropConfigs.value.filter((config) => config.isNear() && !config.isHidden && config.isJunk),
        // 自定义项中的杂物
        ...customConfigs.value.filter((config) => config.isNear() && !config.isHidden && config.isJunk),
    ];
    nearJunkConfigs.sort((a, b) => {
        return a.getNextTargetTime() - b.getNextTargetTime();
    });
    return nearJunkConfigs;
});

// 根据 Tab 过滤重要物品
const filteredNearDropConfigs = computed<AbstractRecordConfig[]>(() => {
    if (activeTab.value === 'all') {
        return nearDropConfigs.value;
    }
    if (activeTab.value === 'fixed') {
        return nearDropConfigs.value.filter((item) => item instanceof FixedRefreshConfig);
    }
    if (activeTab.value === 'custom') {
        return nearDropConfigs.value.filter((item) => item instanceof CustomConfig && !item.isJunk);
    }
    // 分类过滤
    return nearDropConfigs.value.filter((item) => item instanceof DropConfig && item.category === activeTab.value);
});

// 根据 Tab 过滤杂物
const filteredNerfJunkDropConfigs = computed<AbstractRecordConfig[]>(() => {
    if (activeTab.value === 'all') {
        return nerfJunkDropConfigs.value;
    }
    if (activeTab.value === 'fixed') {
        return []; // 固定周期没有杂物
    }
    if (activeTab.value === 'custom') {
        return nerfJunkDropConfigs.value.filter((item) => item instanceof CustomConfig);
    }
    // 分类过滤
    return nerfJunkDropConfigs.value.filter((item) => item instanceof DropConfig && item.category === activeTab.value);
});

// 判断固定周期是否有临期项目
const hasFixedNearItems = computed(() => {
    return fixedConfigs.value.some((config) => config.getLastRecord() !== 0 && config.isNear());
});

// 过滤出有临期项目的分类
const filteredDropCategorys = computed(() => {
    return dropCategorys.value.filter((category) =>
        dropConfigs.value.some((config) => config.isNear() && !config.isHidden && config.category === category.i),
    );
});

// 判断自定义项是否有临期项目
const hasCustomNearItems = computed(() => {
    return customConfigs.value.some((config) => config.isNear() && !config.isHidden);
});

const clickItem = (item: AbstractRecordConfig) => {
    emit('clickItem', item);
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

// 刷新说明文本
const refreshText = () => {
    return (
        <div>
            刷新时间根据网络收集和实际测试总结，未必与官方设置相同，仅供参考
            <br />
            有比列表所示时间提前刷新的情况，如果有时间可以提前去看
            <br />
            只有一个时间的也不表示到时肯定刷新，只是目前数据不足，实际应该也是一定时间范围内随机刷新
        </div>
    );
};

const saveNewRecord = (item: AbstractRecordConfig) => {
    item.addNewRecordTime();
};
</script>
