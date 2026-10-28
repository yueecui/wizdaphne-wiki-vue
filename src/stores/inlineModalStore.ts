import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { ItemDoc } from '../views/DataV2/itemTypes';

/** 正文内联组件（`*Inline`）能打开的 V2 modal 类型 */
export type InlineModalKind = 'item' | 'equipment' | 'character' | 'enemy' | 'skill' | 'mapFloor';

/**
 * 正文内联组件与全局 modal 宿主（`components/InlineModalHost.vue`）之间的状态。
 *
 * V2 的 modal 都是 props 驱动的，所以由这里记住「点开了谁」：
 * 物品（含遗物）直接给文档，其余给 id，由各 modal 自己从 `dataV2Store` 里取详情。
 *
 * 用的是同一个 pinia（见 `stores/index.ts`）：内联组件和宿主虽然是分开
 * `createApp` 挂载的，状态仍然共享。
 */
export const useInlineModalStore = defineStore('inline-modal-v2', () => {
    const show = ref(false);
    const kind = ref<InlineModalKind | null>(null);

    /** 物品 / 遗物：直接给 `ItemDoc`（`ItemModal` 按文档渲染） */
    const item = ref<ItemDoc | null>(null);

    /** 装备 / 角色 / 敌人分类 / 技能 identification / 地图层：给 id */
    const id = ref<number | null>(null);

    const open = (payload: { kind: InlineModalKind; item?: ItemDoc; id?: number }) => {
        kind.value = payload.kind;
        item.value = payload.item ?? null;
        id.value = payload.id ?? null;
        show.value = true;
    };

    const close = () => {
        show.value = false;
    };

    return {
        show,
        kind,
        item,
        id,
        open,
        close,
    };
});
