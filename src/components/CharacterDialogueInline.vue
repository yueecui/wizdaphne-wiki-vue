<template>
    <div>
        <h2 class="py-[15px]">好感度对话</h2>

        <table v-if="hasData" class="wikitable">
            <tbody>
                <tr>
                    <th class="w-16">类型</th>
                    <th class="md:w-32">提问</th>
                    <th>好评选择</th>
                </tr>

                <!-- 酒馆：议题 + 三个候选答复，好评的那个高亮 -->
                <tr v-for="(row, index) in tavern" :key="row.topic">
                    <th v-if="index === 0" :rowspan="tavern.length">酒馆</th>
                    <td class="text-light">{{ row.topic }}</td>
                    <td>
                        <span
                            v-for="(reply, replyIndex) in row.replies"
                            :key="replyIndex"
                            class="mr-3 whitespace-nowrap"
                            :class="replyIndex + 1 === row.order ? 'text-warning' : 'opacity-30'"
                        >
                            {{ reply }}
                        </span>
                    </td>
                </tr>

                <!-- 扎营：角色提问 + 游戏记录的答案 -->
                <template v-for="(item, index) in camp" :key="`camp-${index}`">
                    <tr>
                        <th v-if="index === 0" :rowspan="camp.length * 2">扎营</th>
                        <th colspan="2" class="text-left!">问题：{{ item.question }}</th>
                    </tr>
                    <tr>
                        <td colspan="2"><span class="text-light">回答：</span>{{ item.answer }}</td>
                    </tr>
                </template>
            </tbody>
        </table>

        <div v-else class="py-4 text-sm opacity-50">{{ placeholder }}</div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { buildTavernRows } from '../views/DataV2/tavernTopics';
import { useCharacterPage } from './characterPage';

defineOptions({ name: '好感对话' });

const props = defineProps<{
    /** wiki 页面名（`data-name`）：角色名，或「风格名 + 角色名」 */
    characterName?: string;
    /** 角色 ID（`data-id`）：有就优先按它定位 */
    characterId?: string;
}>();

const { character, placeholder } = useCharacterPage(props);

/** 酒馆议题（数据里只有议题 + 答复序号，文案由固定表展开） */
const tavern = computed(() => buildTavernRows(character.value?.dialogue?.tavern));

/** 营地问答 */
const camp = computed(() => character.value?.dialogue?.camp ?? []);

const hasData = computed(() => tavern.value.length > 0 || camp.value.length > 0);
</script>
