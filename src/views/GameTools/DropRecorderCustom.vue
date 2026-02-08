<template>
    <div class="flex flex-col gap-4">
        <!-- 操作栏 -->
        <div class="flex gap-2 justify-between items-center">
            <NButton type="primary" @click="showAddModal">
                <template #icon>
                    <span class="text-lg">+</span>
                </template>
                新增自定义项
            </NButton>
            <NSwitch v-model:value="hideHiddenItems" :rail-style="railStyle">
                <template #checked>不显示隐藏</template>
                <template #unchecked>显示隐藏</template>
            </NSwitch>
        </div>

        <!-- 自定义项表格 -->
        <div v-if="customConfigs.length === 0" class="text-center text-gray-400 py-8">
            暂无自定义项，点击上方按钮添加
        </div>
        <table class="wiztable text-center my-0! w-full" v-else>
            <thead>
                <tr>
                    <th colspan="4">自定义项目</th>
                </tr>
                <tr>
                    <th class="w-[2em]">#</th>
                    <th>项目</th>
                    <th class="w-[4em] md:w-[11em]">刷新时间</th>
                    <th class="w-[5.5em] md:w-[11em]">计时</th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="(item, index) in filteredConfigs"
                    :key="item.data.id"
                    class="hover:bg-trhoverbg cursor-pointer"
                    :class="[
                        getNearClass(item),
                        {
                            'border-primary border-dashed': dragOverIndex === index && dragOverIndex !== draggedIndex,
                            'bg-primary/10': draggedIndex === index,
                        },
                    ]"
                    draggable="true"
                    @dragstart="handleDragStart(index, $event)"
                    @dragover.prevent="handleDragOver(index, $event)"
                    @drop="handleDrop(index, $event)"
                    @dragend="handleDragEnd"
                >
                    <!-- 拖拽排序列 -->
                    <td
                        class="cursor-move text-gray-400 hover:text-gray-200"
                        draggable="true"
                        @dragstart="handleDragStart(index, $event)"
                        @click.stop
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="14"
                            height="14"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        >
                            <circle cx="9" cy="12" r="1" />
                            <circle cx="9" cy="5" r="1" />
                            <circle cx="9" cy="19" r="1" />
                            <circle cx="15" cy="12" r="1" />
                            <circle cx="15" cy="5" r="1" />
                            <circle cx="15" cy="19" r="1" />
                        </svg>
                    </td>
                    <!-- 项目信息列 -->
                    <td class="text-left" @click="clickItem(item)">
                        <div class="flex justify-between items-center">
                            <div>
                                <template v-if="item.isHidden">【隐藏】</template>
                                <span>{{ item.data.title }}</span>
                            </div>
                            <div class="flex gap-1">
                                <NButton size="tiny" @click.stop="saveNewRecord(item)">快速记录</NButton>
                                <NButton size="tiny" @click.stop="editItem(item)">编辑</NButton>
                                <NButton size="tiny" @click.stop="copyItem(item)">复制</NButton>
                                <NButton size="tiny" type="error" @click.stop="deleteItem(item)">删除</NButton>
                            </div>
                        </div>
                    </td>
                    <!-- 刷新时间列 -->
                    <td @click="clickItem(item)">{{ item.getRefreshTimeText() }}</td>
                    <!-- 计时列 -->
                    <td @click="clickItem(item)">
                        <div class="flex flex-col">
                            <div>{{ getRemainTimeText(item) }}</div>
                            <div v-if="isItemHasLastCheck(item)" class="text-xs text-gray-400">
                                {{ getLastCheckText(item) }} 检查
                            </div>
                        </div>
                    </td>
                </tr>
            </tbody>
        </table>

        <!-- 新增/编辑弹窗 -->
        <NModal
            v-model:show="isShowModal"
            :title="isEditing ? '编辑自定义项' : '新增自定义项'"
            preset="card"
            style="width: 90%; max-width: 480px"
        >
            <div class="flex flex-col gap-4">
                <div class="flex flex-col gap-2">
                    <label class="text-sm">ID</label>
                    <NInput v-model:value="formData.id" placeholder="唯一标识" :disabled="isEditing" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-sm">标题</label>
                    <NInput v-model:value="formData.title" placeholder="显示名称" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-sm">描述</label>
                    <NInput v-model:value="formData.description" type="textarea" placeholder="可选描述" />
                </div>
                <div class="flex flex-col gap-2">
                    <label class="text-sm">刷新类型</label>
                    <NSelect v-model:value="formData.refreshType" :options="refreshTypeOptions" />
                </div>
                <div v-if="formData.refreshType === '自定义'" class="flex flex-col gap-2">
                    <label class="text-sm">刷新小时数</label>
                    <NInputNumber v-model:value="formData.refreshHours" :min="1" placeholder="如 72 表示72小时" />
                    <div class="flex gap-2">
                        <NButton size="small" @click="formData.refreshHours = 24">24小时</NButton>
                        <NButton size="small" @click="formData.refreshHours = 168">7天</NButton>
                        <NButton size="small" @click="formData.refreshHours = 600">25天</NButton>
                    </div>
                </div>
                <div class="flex items-center gap-2">
                    <NCheckbox v-model:checked="formData.isJunk">标记为杂物</NCheckbox>
                </div>
                <div class="flex justify-end gap-2 mt-4">
                    <NButton @click="isShowModal = false">取消</NButton>
                    <NButton type="primary" @click="saveItem">保存</NButton>
                </div>
            </div>
        </NModal>
    </div>
</template>

<script setup lang="ts">
import { NButton, NCheckbox, NInput, NInputNumber, NModal, NSelect, NSwitch } from 'naive-ui';
import { computed, ref, toRefs } from 'vue';
import { CustomConfig } from './classes/CustomConfig';
import { useDropRecordStore } from './dropRecordStore';
import { AbstractRecordConfig, ICustomConfig } from './type';

const emit = defineEmits<{
    clickItem: [item: AbstractRecordConfig];
}>();

const dropRecordStore = useDropRecordStore();
const { dropSettings, customConfigsData } = toRefs(dropRecordStore);

// 自定义项列表
const customConfigs = computed(() => {
    return customConfigsData.value.map((data) => new CustomConfig(data));
});

// 是否隐藏隐藏项目（与预设页共用同一个配置）
const hideHiddenItems = computed({
    get: () => dropSettings.value.hideHiddenItems ?? false,
    set: (value) => {
        dropSettings.value.hideHiddenItems = value;
    },
});

// 过滤后的列表
const filteredConfigs = computed(() => {
    if (hideHiddenItems.value) {
        return customConfigs.value.filter((item) => !item.isHidden);
    }
    return customConfigs.value;
});

// 开关样式
const railStyle = ({ checked }: { checked: boolean }) => {
    if (checked) {
        return { background: '#f59e0b' };
    }
    return {};
};

// 刷新类型选项
const refreshTypeOptions = [
    { label: '自定义', value: '自定义' },
    { label: '每周六', value: '每周六' },
    { label: '每周日', value: '每周日' },
    { label: '双周六', value: '双周六' },
    { label: '双周日', value: '双周日' },
    { label: '每月', value: '每月' },
];

// 弹窗相关
const isShowModal = ref(false);
const isEditing = ref(false);
const formData = ref<ICustomConfig>({
    id: '',
    title: '',
    description: '',
    refreshType: '自定义',
    refreshHours: 24,
    isJunk: false,
});

// 显示新增弹窗
const showAddModal = () => {
    isEditing.value = false;
    formData.value = {
        id: '',
        title: '',
        description: '',
        refreshType: '自定义',
        refreshHours: 24,
        isJunk: false,
    };
    isShowModal.value = true;
};

// 编辑项目
const editItem = (item: CustomConfig) => {
    isEditing.value = true;
    formData.value = { ...item.data };
    isShowModal.value = true;
};

// 保存项目
const saveItem = () => {
    if (!formData.value.id.trim()) {
        window.wiz.$message.error('ID 不能为空');
        return;
    }
    if (!formData.value.title.trim()) {
        window.wiz.$message.error('标题不能为空');
        return;
    }
    if (formData.value.refreshType === '自定义' && (!formData.value.refreshHours || formData.value.refreshHours <= 0)) {
        window.wiz.$message.error('刷新小时数必须大于0');
        return;
    }

    const configs = [...customConfigsData.value];

    if (isEditing.value) {
        // 编辑模式
        const index = configs.findIndex((c) => c.id === formData.value.id);
        if (index !== -1) {
            configs[index] = { ...formData.value };
        }
    } else {
        // 新增模式
        if (configs.some((c) => c.id === formData.value.id)) {
            window.wiz.$message.error('ID 已存在');
            return;
        }
        configs.push({ ...formData.value });
    }

    customConfigsData.value = configs;
    isShowModal.value = false;
    window.wiz.$message.success(isEditing.value ? '编辑成功' : '添加成功');
};

// 删除项目
const deleteItem = (item: CustomConfig) => {
    window.wiz.$dialog.error({
        title: '删除确认',
        content: `确定要删除 "${item.data.title}" 吗？`,
        positiveText: '删除',
        negativeText: '取消',
        onPositiveClick: () => {
            const configs = [...customConfigsData.value];
            const index = configs.findIndex((c) => c.id === item.data.id);
            if (index !== -1) {
                configs.splice(index, 1);
                customConfigsData.value = configs;
                window.wiz.$message.success('删除成功');
            }
        },
    });
};

// 复制项目
const copyItem = (item: CustomConfig) => {
    const configs = [...customConfigsData.value];
    const newId = `${item.data.id}_copy_${Date.now()}`;
    const newItem: ICustomConfig = {
        ...item.data,
        id: newId,
        title: `${item.data.title} (复制)`,
    };
    configs.push(newItem);
    customConfigsData.value = configs;
    window.wiz.$message.success('复制成功');
};

// 点击项目
const clickItem = (item: CustomConfig) => {
    emit('clickItem', item);
};

// 快速记录
const saveNewRecord = (item: CustomConfig) => {
    item.addNewRecordTime();
};

// 辅助函数
const getNearClass = (item: CustomConfig) => {
    return item.getNearClass();
};

const getRemainTimeText = (item: CustomConfig) => {
    return item.getRemainTimeText();
};

const isItemHasLastCheck = (item: CustomConfig) => {
    return !!item.getLastCheck();
};

const getLastCheckText = (item: CustomConfig) => {
    return item.getLastCheckText();
};

// 拖拽排序
const draggedIndex = ref(-1);
const dragOverIndex = ref(-1);

const handleDragStart = (index: number, event: DragEvent) => {
    draggedIndex.value = index;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
    }
};

const handleDragOver = (index: number, event: DragEvent) => {
    event.preventDefault();
    dragOverIndex.value = index;
};

const handleDrop = (index: number, event: DragEvent) => {
    event.preventDefault();
    const fromIndex = draggedIndex.value;
    const toIndex = index;

    if (fromIndex !== -1 && fromIndex !== toIndex) {
        const configs = [...customConfigsData.value];
        // 考虑过滤后的列表索引需要映射回原始列表
        const filteredList = filteredConfigs.value;
        const fromItem = filteredList[fromIndex];
        const toItem = filteredList[toIndex];

        const originalFromIndex = configs.findIndex((c) => c.id === fromItem.data.id);
        const originalToIndex = configs.findIndex((c) => c.id === toItem.data.id);

        if (originalFromIndex !== -1 && originalToIndex !== -1) {
            const [movedItem] = configs.splice(originalFromIndex, 1);
            configs.splice(originalToIndex, 0, movedItem);
            customConfigsData.value = configs;
        }
    }

    draggedIndex.value = -1;
    dragOverIndex.value = -1;
};

const handleDragEnd = () => {
    draggedIndex.value = -1;
    dragOverIndex.value = -1;
};
</script>
