<template>
    <div class="p-4 bg-[#312721]! border! border-[#463d38]! rounded flex flex-col gap-4" v-if="item">
        <div class="sticky top-0 bg-[#312721] z-10 py-2">
            <div class="text-sm text-light">
                <template v-if="item?.id === 0">Ex</template>
                <template v-else-if="item?.id === -1">Unknown</template>
                <template v-else>No. {{ item?.id }}</template>
            </div>
            <div class="text-3xl text-light font-bold flex items-baseline gap-4">
                <span>{{ item?.name }}</span>
                <span class="text-sm text-gray-400">{{ getCategoryName(item?.cate) }}</span>
            </div>
            <div class="text-sm text-gray-400" v-if="item?.comment">
                <span v-html="formatComment(item.comment)"></span>
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
                            <th>购买价格</th>
                            <td>{{ item?.buy > 0 ? item.buy : '不可购买' }}</td>
                            <th>出售价格</th>
                            <td>{{ item?.sell > 0 ? item.sell : '不可出售' }}</td>
                        </tr>
                        <tr>
                            <th colspan="4">描述</th>
                        </tr>
                        <tr>
                            <td colspan="4" class="text-left">
                                <div class="min-h-[4.5rem]" v-html="convertDescription(item.desc)"></div>
                            </td>
                        </tr>
                        <tr>
                            <th colspan="4">备注</th>
                        </tr>
                        <tr>
                            <td colspan="4" class="text-left">
                                <div class="min-h-[4.5rem]" v-html="convertDescription(item.comment || '')"></div>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <div class="flex justify-end mt-4" v-if="onClose">
            <NButton type="default" @click="onClose">关闭</NButton>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton } from 'naive-ui';
import { onMounted, ref } from 'vue';
import { convertDescription } from '../utils/convertDescription';
import type { Item } from './Item';
import { useItemStore } from './itemStore';

const props = defineProps<{
    itemId: string;
    onClose?: () => void;
}>();

const itemStore = useItemStore();
const item = ref<Item | undefined>();

const categoryMap: Record<number, string> = {
    0: '出售',
    1: '消耗品',
    2: '贵重品',
    4: '其他',
};

const getCategoryName = (cate: number) => {
    return categoryMap[cate] || '其他';
};

const formatComment = (comment: string) => convertDescription(comment);

onMounted(() => {
    item.value = itemStore.itemItems.find((i) => i.id.toString() === props.itemId);
});
</script>
