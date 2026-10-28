import { onBeforeUnmount, shallowRef } from 'vue';

/**
 * 模板正文：`名字|ID`。
 *
 * 有 ID 时内联组件按 ID 定位，名字只负责脚本加载前显示；
 * ID 缺失时只留名字（老连接仍然按名字匹配）。
 */
export const templateBody = (name?: string | null, id?: number | string | null) => {
    const text = (name ?? '').trim();
    const key = id == null || id === '' ? '' : String(id);
    if (!key) return text;
    return text ? `${text}|${key}` : key;
};

export interface CopyMenuState<T> {
    show: boolean;
    x: number;
    y: number;
    item: T | null;
}

/**
 * 列表页「右击 → 复制 wiki 模板」，与 V1 各查询页的行为一致（`{{物品|名字}}` 等）。
 *
 * 菜单是个固定在鼠标位置的 div（见 `CopyTemplateMenu.vue`），打开后点任意位置关闭。
 *
 * @param templateName wiki 模板名：物品 / 遗物 / 敌人 / 地图 / 技能
 * @param bodyOf 模板正文（`|` 之后的部分）。多数类型只有名字；
 *   技能重名太多，写成 `名字|ID`，让模板按 ID 定位、名字只负责脚本加载前显示
 */
export const useCopyMenu = <T>(templateName: string, bodyOf: (item: T) => string | null | undefined) => {
    // shallowRef + 整体替换：菜单里只有一层状态，不需要深层响应
    const menu = shallowRef<CopyMenuState<T>>({ show: false, x: 0, y: 0, item: null });

    const closeMenu = () => {
        menu.value = { ...menu.value, show: false };
        document.removeEventListener('click', closeMenu);
    };

    const showMenu = (event: MouseEvent, item: T) => {
        menu.value = { show: true, x: event.clientX, y: event.clientY, item };
        document.addEventListener('click', closeMenu);
    };

    /** 复制 `{{模板|正文}}` */
    const copyTemplate = () => {
        const item = menu.value.item;
        const body = item ? (bodyOf(item) ?? '').trim() : '';
        closeMenu();

        if (!body) {
            window.wiz.$message.error('没有可复制的名称');
            return;
        }

        const text = `{{${templateName}|${body}}}`;
        navigator.clipboard
            .writeText(text)
            .then(() => window.wiz.$message.success(`已复制 ${text} 模板到剪贴板`))
            .catch(() => window.wiz.$message.error('复制失败，请手动复制'));
    };

    onBeforeUnmount(() => document.removeEventListener('click', closeMenu));

    return { menu, showMenu, copyTemplate };
};
