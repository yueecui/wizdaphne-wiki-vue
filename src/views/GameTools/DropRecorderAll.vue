<template>
    <div class="flex flex-col gap-4">
        <div class="text-center text-amber-300 mt-4 text-sm">
            <refreshText />
            <span class="text-red-400 font-bold">
                刷新迷宫的方法请参考
                <a href="/wiki/可刷新奖励">可刷新奖励</a>
                条目获取更多信息
            </span>
        </div>

        <!-- Tab 切换 -->
        <div class="flex gap-2 flex-wrap items-center">
            <NButton :type="activeTab === 'fixed' ? 'primary' : 'default'" @click="() => (activeTab = 'fixed')">
                固定周期
            </NButton>
            <NButton
                v-for="category in dropCategorys"
                :key="category.i"
                :type="activeTab === category.i ? 'primary' : 'default'"
                @click="() => (activeTab = category.i)"
            >
                {{ category.name }}
            </NButton>
            <div class="flex-1"></div>
            <NSwitch v-model:value="hideHiddenItems" :rail-style="railStyle">
                <template #checked>不显示隐藏</template>
                <template #unchecked>显示隐藏</template>
            </NSwitch>
        </div>

        <!-- 固定周期表格 -->
        <table class="wiztable text-center my-0! w-full" v-if="activeTab === 'fixed'">
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
                    :class="getNearClass(item)"
                    @click="() => clickItem(item)"
                >
                    <td class="text-left">
                        <div class="flex justify-between">
                            <div>
                                {{ item.data.title }}
                            </div>
                            <div class="hidden md:block!">
                                <NButton size="tiny" @click.stop="() => saveNewRecord(item)">快速记录</NButton>
                            </div>
                        </div>
                    </td>
                    <td>{{ item.getRefreshTimeText() }}</td>
                    <td>{{ getRemainTimeText(item) }}</td>
                </tr>
            </tbody>
        </table>

        <!-- 分类表格 -->
        <template v-for="category in dropCategorys" :key="category.i">
            <table class="wiztable text-center my-0! w-full" v-if="activeTab === category.i">
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
                        v-for="item in getFilteredConfigsByCategory(category.i)"
                        :key="item.data.id"
                        class="hover:bg-trhoverbg cursor-pointer"
                        :class="getNearClass(item)"
                        @click="() => clickItem(item)"
                    >
                        <td class="text-left">
                            <div class="flex justify-between">
                                <div>
                                    <template v-if="item.isHidden">【隐藏】</template>
                                    {{ item.data.title }}
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
                </tbody>
            </table>
        </template>
    </div>
</template>

<script setup lang="tsx">
import { NButton, NSwitch, NTooltip } from 'naive-ui';
import { ref, toRefs, watch } from 'vue';
import { useDropRecordStore } from './dropRecordStore';
import { AbstractRecordConfig } from './type';

const emit = defineEmits<{
    clickItem: [item: AbstractRecordConfig];
}>();

const dropRecordStore = useDropRecordStore();

const { fixedConfigs, getDropConfigsByCategory, dropCategorys, dropSettings } = toRefs(dropRecordStore);

// 当前激活的 Tab，从配置中读取，默认显示固定周期
const activeTab = ref<string | number>(dropSettings.value.activeAllTab ?? 'fixed');

// 监听 Tab 变化，保存到配置
watch(activeTab, (newTab) => {
    dropSettings.value.activeAllTab = newTab;
});

// 是否隐藏隐藏项目
const hideHiddenItems = ref(dropSettings.value.hideHiddenItems ?? false);
watch(hideHiddenItems, (newValue) => {
    dropSettings.value.hideHiddenItems = newValue;
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

const saveNewRecord = (item: AbstractRecordConfig) => {
    item.addNewRecordTime();
};

// 获取过滤后的配置列表
const getFilteredConfigsByCategory = (categoryIndex: number) => {
    const configs = getDropConfigsByCategory.value(categoryIndex);
    if (hideHiddenItems.value) {
        return configs.filter((item) => !item.isHidden);
    }
    return configs;
};

// 开关样式：开启时为橙色
const railStyle = ({ checked }: { checked: boolean }) => {
    if (checked) {
        return {
            background: '#937302',
        };
    }
    return {};
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
</script>
