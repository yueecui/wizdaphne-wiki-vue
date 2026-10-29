<template>
    <div class="w-[200px] mx-auto mt-5 flex flex-col gap-4 md:mx-0 md:mt-0 md:float-right md:ml-8 md:mb-8">
        <template v-if="character">
            <!-- 立绘 + 名字 + 种族 / 性格 / 职业 -->
            <div>
                <div class="relative overflow-hidden rounded bg-black/40">
                    <WikiImg v-if="portrait" :imageName="portrait" :isLazy="true" class="block w-full" />
                    <div
                        v-else
                        class="w-full aspect-[200/260] flex items-center justify-center text-xs opacity-50"
                    >
                        无立绘
                    </div>
                    <div
                        v-if="character.rarity.id === 300"
                        class="absolute right-1 top-1 text-xs text-light bg-black/70 border! border-solid border-black/40 rounded-sm px-1 py-0.5 shadow"
                    >
                        传说
                    </div>
                    <div class="absolute left-1 bottom-1">
                        <ElementIcon :element="elementOf(character.attribute.name)" class="w-6 h-6 drop-shadow-1px" />
                    </div>
                </div>
                <div class="bg-black/50 py-1 text-center text-light">{{ character.name }}</div>
                <div class="bg-black/30 text-center text-sm flex">
                    <div class="flex-1">{{ character.race.name }} / {{ character.alignment.name }}</div>
                    <div class="flex-1">{{ jobNames }}</div>
                </div>
            </div>

            <!-- 情报 / 基本信息 / 1 级属性 -->
            <table class="wikitable my-0! w-full text-center">
                <tbody>
                    <tr>
                        <th colspan="3">情报</th>
                    </tr>
                    <tr>
                        <th class="w-1/3">日文名</th>
                        <td colspan="2" class="w-2/3">{{ character.name_jp || '—' }}</td>
                    </tr>
                    <tr>
                        <th>英文名</th>
                        <td colspan="2">{{ character.name_en || '—' }}</td>
                    </tr>
                    <tr v-if="releaseDate">
                        <th>上线</th>
                        <td colspan="2">{{ releaseDate }}</td>
                    </tr>
                    <tr>
                        <th>声优</th>
                        <td colspan="2">{{ character.character_voice || '—' }}</td>
                    </tr>

                    <tr>
                        <th colspan="3">基本信息</th>
                    </tr>
                    <tr>
                        <th>风格</th>
                        <td colspan="2">{{ character.style || '基本' }}</td>
                    </tr>
                    <tr>
                        <th>种族</th>
                        <td colspan="2">{{ character.race.name }}</td>
                    </tr>
                    <tr>
                        <th>性别</th>
                        <td colspan="2">{{ character.gender.name }}</td>
                    </tr>
                    <tr>
                        <th>性格</th>
                        <td colspan="2">{{ character.alignment.name }}</td>
                    </tr>
                    <tr>
                        <th>缘类型</th>
                        <td colspan="2">{{ fateText }}</td>
                    </tr>

                    <tr>
                        <th>属性</th>
                        <th colspan="2">1级 数值</th>
                    </tr>
                    <tr>
                        <th>职业</th>
                        <th :class="subJob ? 'w-1/3' : ''" :colspan="subJob ? undefined : 2">
                            {{ primaryJob?.name ?? '—' }}
                        </th>
                        <th v-if="subJob" class="w-1/3">{{ subJob.name }}</th>
                    </tr>
                    <tr v-for="row in PAGE_STAT_ROWS" :key="row.key">
                        <th>{{ row.label }}</th>
                        <td
                            :class="[statBgClass(primaryJob?.name, row.label), subJob ? 'w-1/3' : '']"
                            :colspan="subJob ? undefined : 2"
                        >
                            {{ statValue(row.key, primaryJob) }}
                        </td>
                        <td v-if="subJob" :class="statBgClass(subJob.name, row.label)">
                            {{ statValue(row.key, subJob) }}
                        </td>
                    </tr>
                </tbody>
            </table>
        </template>

        <div v-else class="w-full min-h-[120px] flex items-center justify-center rounded border! border-dashed border-white/20 text-xs opacity-50 text-center p-2">
            {{ placeholder }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { ELEMENT_TYPE } from '../views/DataSearcher/data/enum';
import type { JobRef, StatKey } from '../views/DataV2/types';
import ElementIcon from './ElementIcon.vue';
import WikiImg from './huiji/WikiImg.vue';
import {
    fateTextOf,
    levelStat,
    PAGE_STAT_ROWS,
    portraitFile,
    primaryJobOf,
    statBgClass,
    subJobOf,
    useCharacterPage,
} from './characterPage';

defineOptions({ name: '角色基本信息' });

const props = defineProps<{
    /** wiki 页面名（`data-name`）：角色名，或「风格名 + 角色名」 */
    characterName?: string;
    /** 角色 ID（`data-id`）：有就优先按它定位 */
    characterId?: string;
}>();

const { store, character, placeholder } = useCharacterPage(props);

const portrait = computed(() => (character.value ? portraitFile(character.value) : null));
const primaryJob = computed<JobRef | null>(() => (character.value ? primaryJobOf(character.value) : null));
const subJob = computed<JobRef | null>(() => (character.value ? subJobOf(character.value) : null));
const fateText = computed(() => (character.value ? fateTextOf(character.value) : '—'));
const releaseDate = computed(() => character.value?.release_date?.date ?? '');
const jobNames = computed(() =>
    (character.value?.jobs ?? [])
        .map((job) => job.name)
        .filter(Boolean)
        .join(' / '),
);

const elementOf = (name?: string | null) => (name ?? '') as ELEMENT_TYPE;

/** 1 级数值：与角色 modal 的算法一致 */
const statValue = (key: StatKey, job: JobRef | null) =>
    character.value ? levelStat(character.value, key, job, store.jobById) : 0;
</script>
