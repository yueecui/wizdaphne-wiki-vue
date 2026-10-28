<template>
    <ItemModal v-if="kind === 'item'" v-model:show="show" :item="item" />
    <EquipmentModal v-else-if="kind === 'equipment'" v-model:show="show" :identification="id" />
    <EnemyModal v-else-if="kind === 'enemy'" v-model:show="show" :enemy-id="id" />
    <SkillModal v-else-if="kind === 'skill'" v-model:show="show" :identification="id" />
    <MapFloorModal v-else-if="kind === 'mapFloor'" v-model:show="show" :floor-id="id" />
    <ThemeConfigProvider v-else-if="kind === 'character'">
        <NModal v-model:show="show">
            <div
                class="w-[90%] md:w-[min(960px,94vw)] m-auto huiji-css-hook bg-transparent! max-h-[88vh] overflow-y-auto thin-scrollbar md:max-h-none md:overflow-visible"
            >
                <CharacterDetail v-if="id" :id="id" :onClose="close" />
            </div>
        </NModal>
    </ThemeConfigProvider>

    <!-- 杂物 modal 自己读 V2 的 junkModalStore，等有数据了再挂载（关闭后再卸载） -->
    <JunkModal v-if="junkModal.currentJunk" />
</template>

<script setup lang="ts">
import { NModal } from 'naive-ui';
import { storeToRefs } from 'pinia';
import { defineAsyncComponent } from 'vue';
import ThemeConfigProvider from '../layout/ThemeConfigProvider.vue';
import { useJunkModalStore } from '../views/DataV2/junk/junkModalStore';
import { useInlineModalStore } from '../stores/inlineModalStore';

defineOptions({ name: '内联弹窗宿主' });

// 各类 modal 会互相嵌套（物品 → 技能 → 装备 …），用异步组件打断循环引用
const ItemModal = defineAsyncComponent(() => import('../views/DataV2/ItemModal.vue'));
const EquipmentModal = defineAsyncComponent(() => import('../views/DataV2/EquipmentModal.vue'));
const EnemyModal = defineAsyncComponent(() => import('../views/DataV2/EnemyModal.vue'));
const SkillModal = defineAsyncComponent(() => import('../views/DataV2/SkillModal.vue'));
const MapFloorModal = defineAsyncComponent(() => import('../views/DataV2/MapFloorModal.vue'));
const CharacterDetail = defineAsyncComponent(() => import('../views/DataV2/CharacterDetail.vue'));
const JunkModal = defineAsyncComponent(() => import('../views/DataV2/junk/JunkModal.vue'));

const store = useInlineModalStore();
const { show, kind, item, id } = storeToRefs(store);
const { close } = store;

const junkModal = useJunkModalStore();
</script>
