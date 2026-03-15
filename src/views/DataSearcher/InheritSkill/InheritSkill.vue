<template>
    <div>
        <table class="wikitable text-sm select-none">
            <thead>
                <tr>
                    <th>角色</th>
                    <th>继承技能</th>
                    <th>
                        潜在继承技能
                        <WikiImg imageName="icon_RareSkills.png" class="w-5 h-5" />
                    </th>
                </tr>
            </thead>
            <tbody>
                <tr
                    v-for="character in characterList"
                    :key="character.data.key"
                    class="hover:bg-black/30 hover:cursor-pointer"
                    @click="() => openModal(character)"
                >
                    <td class="text-light">
                        {{ character.data.key }}
                    </td>
                    <td>{{ character.data.inherit_skill }}</td>
                    <td>{{ character.data.inherit_skill2 ?? '' }}</td>
                </tr>
            </tbody>
        </table>
    </div>
</template>

<script setup lang="ts">
import WikiImg from '@/components/huiji/WikiImg.vue';

import { computed, onMounted, watch } from 'vue';
import { useCharacterModalStore } from '../../../stores/characterModalStore';
import { useSearcherDataStore } from '../data/searcherDataStore';

const store = useSearcherDataStore();
const { openModal } = useCharacterModalStore();

// 使用computed属性响应store数据变化
const characterList = computed(() => {
    const chars = store.getCharacterList;
    // 按发布时间倒序排列
    return [...chars].sort((a, b) => {
        // 如果稀有度不同，稀有度高的靠前
        if (a.rarityNumber !== b.rarityNumber) {
            return b.rarityNumber - a.rarityNumber;
        }
        // 按职业顺位排
        let aClassIndex = store.allStandardClass.indexOf(a.data.class[0]);
        let bClassIndex = store.allStandardClass.indexOf(b.data.class[0]);
        aClassIndex = aClassIndex === -1 ? store.allStandardClass.length : aClassIndex;
        bClassIndex = bClassIndex === -1 ? store.allStandardClass.length : bClassIndex;
        if (aClassIndex !== bClassIndex) {
            return aClassIndex - bClassIndex;
        }

        // 如果发布时间不同，晚发布的靠前
        if (a.releaseDate.getTime() !== b.releaseDate.getTime()) {
            return b.releaseDate.getTime() - a.releaseDate.getTime();
        }
        // 否则按中文名排序
        return a.data.name.localeCompare(b.data.name);
    });
});

onMounted(async () => {
    // 无需手动初始化，store会自动加载数据
});

// 监听store初始化完成，然后初始化所有角色
watch(
    () => store.isInit,
    async (newVal) => {
        if (newVal) {
            // 初始化所有角色
            for (const character of characterList.value) {
                await character.initialize();
            }
        }
    },
    { immediate: true },
);
</script>
