<template>
    <ThemeConfigProvider>
        <NModal v-model:show="showModal">
            <template v-if="currentItem">
                <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4">
                        <div class="sticky top-0 bg-[#312721] z-10 py-2">
                            <div class="text-sm text-light">
                                <template v-if="currentItem?.id === 0">Ex</template>
                                <template v-else-if="currentItem?.id === -1">Unknown</template>
                                <template v-else>No. {{ currentItem?.idText }}</template>
                            </div>
                            <div class="text-3xl text-light font-bold flex items-baseline gap-4">
                                <span>{{ currentItem?.name }}</span>
                                <span class="text-sm text-gray-400">{{ currentItem?.cateStr }}</span>
                            </div>
                        </div>

                        <div class="flex flex-row gap-4">
                            <div class="flex-1">
                                <table class="wikitable w-full text-center m-0!">
                                    <tbody>
                                        <tr>
                                            <th colspan="4">物品信息</th>
                                        </tr>
                                        <tr>
                                            <th class="w-1/4">购买价格</th>
                                            <td class="w-1/4">
                                                {{ currentItem?.buy > 0 ? currentItem.buy : '不可购买' }}
                                            </td>
                                            <th class="w-1/4">出售价格</th>
                                            <td class="w-1/4">
                                                {{ currentItem?.sell > 0 ? currentItem.sell : '不可出售' }}
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colspan="4">描述</th>
                                        </tr>
                                        <tr>
                                            <td colspan="4" class="text-left">
                                                <div
                                                    class="min-h-[4.5rem]"
                                                    v-html="convertDescription(currentItem.desc)"
                                                ></div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <th colspan="4">备注</th>
                                        </tr>
                                        <tr>
                                            <td colspan="4" class="text-left">
                                                <div
                                                    class="min-h-[4.5rem]"
                                                    v-html="convertDescription(currentItem.comment || '')"
                                                ></div>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        <div class="flex justify-center gap-4 mt-4">
                            <NButton size="small" type="error" @click="openEditorModal" v-if="canEdit">
                                编辑备注
                            </NButton>
                            <NButton size="small" type="warning" @click="closeModal">关闭</NButton>
                        </div>

                        <NModal v-model:show="editorModalVisible">
                            <div class="w-[90%] md:h-auto md:w-[400px] m-auto huiji-css-hook bg-transparent!">
                                <ItemEditor
                                    :itemId="currentItem.id.toString()"
                                    @cancel="closeEditorModal"
                                    @submit="onEditorSubmit"
                                />
                            </div>
                        </NModal>
                    </div>
                </div>
            </template>
        </NModal>
    </ThemeConfigProvider>
</template>

<script setup lang="ts">
import { NButton, NModal } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { computed, ref } from 'vue';
import { MwConfig } from '../huiji/MwConfig';
import ThemeConfigProvider from '../layout/ThemeConfigProvider.vue';
import { useItemModalStore } from '../stores/itemModalStore';
import { convertDescription } from '../views/DataSearcher/utils/convertDescription';
import ItemEditor from './ItemEditor.vue';

const store = useItemModalStore();
const { showModal, currentItem } = storeToRefs(store);
const { closeModal } = store;

const mwConfig = MwConfig.getInstance();
const canEdit = computed(() => {
    return mwConfig.canEdit;
});

const editorModalVisible = ref(false);

const openEditorModal = () => {
    editorModalVisible.value = true;
};

const closeEditorModal = () => {
    editorModalVisible.value = false;
};

const onEditorSubmit = () => {
    closeEditorModal();
};
</script>

<style scoped></style>
