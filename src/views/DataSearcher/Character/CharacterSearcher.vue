<template>
    <div class="flex flex-col gap-4 px-2 -mx-2">
        <div class="flex flex-col gap-2">
            <CharacterFilter v-model:filter="filter" />
            <div><NButton size="small" type="error" @click="onFilterReset">重置</NButton></div>
        </div>
        <div>共有 {{ filteredCharacterList.length }} 个符合条件的角色</div>
        <div class="flex flex-wrap -mx-2">
            <template v-for="char in filteredCharacterList" :key="char.data.key">
                <div
                    class="cursor-pointer relative p-2 group w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 3xl:w-1/6 select-none"
                    @click="() => showDetail(char)"
                    @contextmenu.prevent="showContextMenu($event, char)"
                >
                    <div
                        class="hidden group-hover:block! absolute border! border-solid border-light! bg-light/10 rounded top-0 left-0 bottom-0 right-0"
                    ></div>
                    <CharacterItem :character="char"></CharacterItem>
                </div>
            </template>
        </div>
        <NModal v-model:show="isShowDetail">
            <template v-if="showDetailCharacter">
                <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                    <CharacterCard :character="showDetailCharacter" :onClose="closeDetail" />
                </div>
            </template>
        </NModal>

        <!-- 右键菜单 -->
        <div
            v-if="contextMenu.show"
            class="fixed z-50 bg-[#312721] border border-[#463d38] rounded shadow-lg"
            :style="{
                left: contextMenu.x + 'px',
                top: contextMenu.y + 'px',
            }"
        >
            <div
                class="px-4 py-2 hover:bg-[#463d38] cursor-pointer"
                @click="openCharacterDetail(contextMenu.character)"
            >
                查看角色详情
            </div>
            <div
                class="px-4 py-2 hover:bg-[#463d38] cursor-pointer"
                @click="copyCharacterTemplate(contextMenu.character, false)"
            >
                复制 &#123;&#123;角色&#125;&#125;
            </div>
            <div
                class="px-4 py-2 hover:bg-[#463d38] cursor-pointer"
                @click="copyCharacterTemplate(contextMenu.character, true)"
            >
                复制 &#123;&#123;角色大&#125;&#125;
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { NButton, NModal } from 'naive-ui';
import CharacterCard from './CharacterCard.vue';
import CharacterFilter from './CharacterFilter.vue';
import CharacterItem from './CharacterItem.vue';

import { computed, ref, toRefs } from 'vue';
import { useSearcherDataStore } from '../data/searcherDataStore';
import { Character } from './Character';

// 使用searcherDataStore的settings
const { settings } = toRefs(useSearcherDataStore());

// 使用计算属性获取和设置角色过滤器
const filter = computed({
    get: () => settings.value.characterFilter,
    set: (newFilter) => (settings.value.characterFilter = newFilter),
});

const store = useSearcherDataStore();

// 使用computed属性获取角色列表，确保数据变化时自动更新
const characterList = computed(() => {
    const chars = store.getCharacterList;
    // 按发布时间倒序排列
    return chars.sort((a, b) => {
        // 如果发布时间不同，晚发布的靠前
        if (a.releaseDate.getTime() !== b.releaseDate.getTime()) {
            return b.releaseDate.getTime() - a.releaseDate.getTime();
        }

        // 如果稀有度不同，稀有度高的靠前
        if (a.rarityNumber !== b.rarityNumber) {
            return b.rarityNumber - a.rarityNumber;
        }
        // 否则按中文名排序
        return a.data.name.localeCompare(b.data.name);
    });
});

const filteredCharacterList = computed(() => characterList.value.filter((char) => char.isMatch(filter.value)));

const showDetailCharacter = ref<Character | null>(null);
const isShowDetail = ref(false);
const showDetail = (character: Character) => {
    showDetailCharacter.value = character;
    isShowDetail.value = true;
};
const closeDetail = () => {
    isShowDetail.value = false;
};

// 右键菜单状态
const contextMenu = ref({
    show: false,
    x: 0,
    y: 0,
    character: null as Character | null,
});

// 显示右键菜单
const showContextMenu = (event: MouseEvent, character: Character) => {
    contextMenu.value = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        character,
    };

    // 点击其他地方关闭菜单
    setTimeout(() => {
        document.addEventListener('click', closeContextMenu);
    }, 0);
};

// 关闭右键菜单
const closeContextMenu = () => {
    contextMenu.value.show = false;
    document.removeEventListener('click', closeContextMenu);
};

// 打开角色详情页
const openCharacterDetail = (character: Character | null) => {
    if (character) {
        const url = `/wiki/${character.data.key}`;
        window.open(url, '_blank');
        closeContextMenu();
    }
};

// 复制角色模板
const copyCharacterTemplate = (character: Character | null, isLarge: boolean) => {
    if (character) {
        const charKey = character.data.key;
        const templateName = isLarge ? '角色大' : '角色';

        const template = `{{${templateName}|${charKey}}}`;

        // 复制到剪贴板
        navigator.clipboard
            .writeText(template)
            .then(() => {
                // 显示复制成功的提示
                window.wiz.$message.success(`已复制 ${template} 模板到剪贴板`);
            })
            .catch((err) => {
                window.wiz.$message.error('复制失败，请手动复制');
            });

        closeContextMenu();
    }
};

const onFilterReset = () => {
    filter.value = {
        searchText: '',
        element: '',
        race: '',
        gender: '',
        personality: '',
        rarity: '',
        group: '',
        fate: '',
        class: [''],
        onlyPrimary: true,
        discipline_tags: [],
        spFilter: 'all',
    };
};
</script>
