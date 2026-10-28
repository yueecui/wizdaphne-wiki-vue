<template>
    <div class="relative">
        <!-- 悬停高亮：放在卡片内部，外面只要有 `group` 类即可 -->
        <div
            class="hidden group-hover:block! absolute border! border-solid border-light! bg-light/10 rounded inset-0 z-20 pointer-events-none"
        ></div>

        <div class="relative w-full aspect-[484/224] overflow-hidden rounded bg-black/40">
            <WikiImg
                v-if="thumb"
                :imageName="thumb"
                :isLazy="true"
                class="block w-full h-full object-cover"
            />
            <div v-else class="w-full h-full flex items-center justify-center text-xs opacity-40">无图</div>

            <div class="absolute right-1 top-1 flex gap-1">
                <div
                    v-if="!character.is_default_style"
                    class="text-xs text-blue-300 bg-black/70 border! border-solid border-black/40 rounded-sm px-1 py-0.5 shadow"
                >
                    SP
                </div>
                <div
                    v-if="character.rarity.id === 300"
                    class="text-xs text-orange-300 bg-black/70 border! border-solid border-black/40 rounded-sm px-1 py-0.5 shadow"
                >
                    传说
                </div>
            </div>

            <div v-if="pool.text" class="absolute right-1 bottom-1 flex gap-1">
                <div
                    class="text-xs bg-black/70 border! border-solid border-black/40 rounded-sm px-1 py-0.5 shadow"
                    :class="pool.color"
                >
                    {{ pool.text }}
                </div>
            </div>

            <div class="absolute left-1 bottom-1">
                <ElementIcon :element="elementOf(character.attribute.name)" class="w-6 h-6 drop-shadow-1px" />
            </div>
        </div>

        <div class="bg-black/50 py-1 text-center text-light truncate">
            {{ character.name }}
        </div>
        <div class="bg-black/30 text-sm flex">
            <div class="flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                {{ character.race.name }} / {{ character.alignment.name || '—' }}
            </div>
            <div class="flex-1 text-center whitespace-nowrap overflow-hidden text-ellipsis">
                {{ jobText }}
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import ElementIcon from '../../components/ElementIcon.vue';
import WikiImg from '../../components/huiji/WikiImg.vue';
import type { ELEMENT_TYPE } from '../DataSearcher/data/enum';
import type { CharacterListItem } from './types';

/** 角色卡片（角色面板与正文 `.character-item` 共用） */
defineOptions({ name: '角色卡片V2' });

const props = defineProps<{
    character: CharacterListItem;
}>();

/** 卡片小图：wiki 上为 `thumbnail` + `_s`，首字母大写（例如 Tmb_chara_01001_00_02_s.png） */
const thumb = computed(() => {
    const stem = props.character.images?.thumbnail;
    if (!stem) return null;
    return `${stem.charAt(0).toUpperCase()}${stem.slice(1)}_s.png`;
});

const elementOf = (name?: string | null) => (name ?? '') as ELEMENT_TYPE;

/** 卡池组标记：-1 限定 / -2 联动 / 1 Ⅰ组 / 2 Ⅱ组（0 共用不显示） */
const POOL_BADGE: Record<string, { text: string; color: string }> = {
    '-1': { text: '限', color: 'text-orange-300' },
    '-2': { text: '联动', color: 'text-orange-300' },
    '1': { text: 'Ⅰ', color: 'text-green-300' },
    '2': { text: 'Ⅱ', color: 'text-blue-300' },
};

const pool = computed(() => POOL_BADGE[String(props.character.pool_group)] ?? { text: '', color: '' });

/** 主职业在前，第二职业在后（与 V1 的 class[] 一致） */
const jobText = computed(() => props.character.jobs.map((job) => job.name).join(' / '));
</script>
