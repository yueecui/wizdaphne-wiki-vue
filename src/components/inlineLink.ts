import { useWikiDataStore } from '../stores/wikiData';
import type { MapCategory, RawCharacter, RawEnemy, RawEquipment, RawMapFloor } from '../stores/wikiData';
import { useInlineModalStore } from '../stores/inlineModalStore';
import type { ItemDoc } from '../views/DataV2/itemTypes';
import type { RelicDoc } from '../views/DataV2/relicTypes';

/**
 * 正文内联组件（`*Inline`）的公共逻辑。
 *
 * 模板统一带上名字与 ID（`data-name` / `data-id`）：**有 ID 时按 ID 定位**，
 * 名字只负责脚本加载前显示；老链接只有名字时再走名字匹配。
 */

/** 内联组件类型（与 `InlineModalKind` 不完全一样：遗物借用物品 modal） */
export type InlineLinkKind = 'item' | 'equipment' | 'character' | 'enemy' | 'relic' | 'map';

/** 模板里带的信息：`id` 优先，`name` 只用于显示 / 兜底 */
export interface InlineLinkRef {
    id?: string | number | null;
    name?: string | null;
}

const LABEL: Record<InlineLinkKind, string> = {
    item: '物品',
    equipment: '装备',
    character: '角色',
    enemy: '敌人',
    relic: '遗物',
    map: '地图',
};

/** 名字比对：忽略大小写与首尾空白 */
const normalize = (value?: string | null) => (value ?? '').trim().toLowerCase();

type NameRow = { name?: string; name_jp?: string | null; name_en?: string | null };

/** 中文名 / 日文名 / 英文名任一相同即命中 */
const hitName = (row: NameRow, name: string) => {
    const target = normalize(name);
    if (!target) return false;
    return [row.name, row.name_jp, row.name_en].some((value) => normalize(value) === target);
};

/** 比对时忽略所有空白（「悠远的夏影 叶卡捷琳娜」也当成同一个名字） */
const squeeze = (value?: string | null) => normalize(value).replace(/\s+/g, '');

/**
 * 有风格的角色在 wiki 上写作「风格名 + 角色名」，例如「悠远的夏影叶卡捷琳娜」。
 * 默认风格（`基本`）不带前缀。
 */
export const styledName = (row: { name?: string; style?: string | null }) => {
    const style = (row.style ?? '').trim();
    const name = row.name ?? '';
    return style && style !== '基本' ? `${style}${name}` : name;
};

/** 地图层比对：忽略空白与连接号（「B1F -巨坑-」≈「B1F-巨坑-」） */
const normalizeMap = (value?: string | null) => (value ?? '').replace(/[\s\-－ー・]/g, '').toUpperCase();

/** 是否是纯数字（可以按 id / 编号查） */
const isNumeric = (value: string) => /^\d+$/.test(value);

/** `data-id` -> 数字 id；空值 / 非数字 / 0 一律当没有 */
export const parseId = (value?: string | number | null): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) && value > 0 ? value : null;
    const raw = (value ?? '').trim();
    if (!/^\d+$/.test(raw)) return null;
    const id = Number(raw);
    return id > 0 ? id : null;
};

// ---------- 按名字查（只有名字的老链接用） ----------

export const findItem = (items: ItemDoc[], name: string): ItemDoc | null => {
    const raw = (name ?? '').trim();
    if (!raw) return null;
    if (isNumeric(raw)) return itemById(items, Number(raw));
    return items.find((item) => hitName(item, raw)) ?? null;
};

export const findEquipment = (equipments: RawEquipment[], name: string): RawEquipment | null => {
    const raw = (name ?? '').trim();
    if (!raw) return null;
    if (isNumeric(raw)) return equipmentById(equipments, Number(raw));
    return equipments.find((row) => hitName(row, raw)) ?? null;
};

export const findEnemy = (enemies: RawEnemy[], name: string): RawEnemy | null => {
    const raw = (name ?? '').trim();
    if (!raw) return null;
    if (isNumeric(raw)) {
        const number = Number(raw);
        // 数字优先当图鉴编号（V1 的怪物 id 就是图鉴编号）
        return enemies.find((row) => row.no === number) ?? enemies.find((row) => row.id === number) ?? null;
    }
    return enemies.find((row) => hitName(row, raw)) ?? null;
};

export const findCharacter = (characters: RawCharacter[], name: string): RawCharacter | null => {
    const raw = (name ?? '').trim();
    if (!raw) return null;
    if (isNumeric(raw)) return characterById(characters, Number(raw));

    // 先按三语名对；同名时优先默认风格（没有风格的角色直接命中）
    const byName = characters.filter((row) => hitName(row, raw));
    if (byName.length) {
        return byName.find((row) => row.default || row.style === '基本') ?? byName[0];
    }

    // 有风格的角色：旧链接是「风格名 + 角色名」（如「悠远的夏影叶卡捷琳娜」）
    const target = squeeze(raw);
    return characters.find((row) => squeeze(styledName(row)) === target) ?? null;
};

/** 遗物：名字 / 酒名 / 遗物之力名都能对上 */
export const findRelic = (relics: RelicDoc[], name: string): RelicDoc | null => {
    const target = normalize(name);
    if (!target) return null;
    return (
        relics.find((relic) =>
            [relic.name, relic.brew, relic.power].some((value) => normalize(value) === target),
        ) ?? null
    );
};

/**
 * 地图名 -> V2 的「层」（`MapFloorModal`）。
 *
 * V2 没有地图级的 modal，只有层详情；V1 手工数据里的「地图」大部分直接对应一层，
 * 顺序尝试：层名全等 -> 「地图名 + 层标记」（如 `光之魔窟B1F`）-> 地图分类的第一层。
 */
export const findMapFloor = (
    floors: RawMapFloor[],
    categories: MapCategory[],
    name: string,
): RawMapFloor | null => {
    const target = normalizeMap(name);
    if (!target) return null;

    const exact = floors.find((floor) => normalizeMap(floor.name) === target);
    if (exact) return exact;

    // 「光之魔窟」+「B1F -巨坑-」这类拼写
    const byMapTag = floors.find((floor) => {
        const tag = (floor.name ?? '').split(/[\s\-－]/)[0];
        if (!tag) return false;
        return normalizeMap(`${floor.map_name ?? ''}${tag}`) === target;
    });
    if (byMapTag) return byMapTag;

    const category = categories.find((item) => normalizeMap(item.name) === target);
    if (category) return floors.find((floor) => floor.map_id === category.id) ?? null;

    return null;
};

// ---------- 按 ID 查（模板里带了 ID 时走这里） ----------

export const itemById = (items: ItemDoc[], id: number): ItemDoc | null =>
    // 内部的 identification，也兼容图鉴编号
    items.find((item) => item.id === id) ?? items.find((item) => item.collection?.no === id) ?? null;

export const equipmentById = (equipments: RawEquipment[], id: number) =>
    equipments.find((row) => row.id === id) ?? null;

export const enemyById = (enemies: RawEnemy[], id: number) =>
    enemies.find((row) => row.id === id) ?? enemies.find((row) => row.no === id) ?? null;

export const characterById = (characters: RawCharacter[], id: number) =>
    characters.find((row) => row.id === id) ?? null;

/** 遗物的 `id` 就是它作为道具的 identification */
export const relicById = (relics: RelicDoc[], id: number) => relics.find((relic) => relic.id === id) ?? null;

export const mapFloorById = (floors: RawMapFloor[], id: number) => floors.find((floor) => floor.id === id) ?? null;

const toast = () => window.wiz?.$message;

export const useInlineLink = () => {
    const wiki = useWikiDataStore();
    const modal = useInlineModalStore();

    /**
     * V2 整库数据是一次性拉全量的，进页面就先拉会很重：
     * 改为第一次点击时才初始化（有 IndexedDB 缓存时很快）。
     */
    const ensureWikiData = async (): Promise<boolean> => {
        if (wiki.ready) return true;
        if (wiki.status === 'loading') {
            toast()?.info('数据正在加载，请稍后再试');
            return false;
        }

        const loading = toast()?.loading('数据正在加载…', { duration: 0 });
        await wiki.init();
        loading?.destroy();

        if (wiki.ready) return true;
        toast()?.error(wiki.error ? `数据加载失败：${wiki.error}` : '数据加载失败');
        return false;
    };

    // ---------- 显示 / 定位：ID 优先，ID 查不到再退回名字（老模板只写名字也能用） ----------

    const findItemLink = (ref: InlineLinkRef): ItemDoc | null => {
        const id = parseId(ref.id);
        const byId = id == null ? null : itemById(wiki.items, id);
        return byId ?? findItem(wiki.items, ref.name ?? '');
    };

    const findEquipmentLink = (ref: InlineLinkRef): RawEquipment | null => {
        const id = parseId(ref.id);
        const byId = id == null ? null : equipmentById(wiki.equipments, id);
        return byId ?? findEquipment(wiki.equipments, ref.name ?? '');
    };

    const findEnemyLink = (ref: InlineLinkRef): RawEnemy | null => {
        const id = parseId(ref.id);
        const byId = id == null ? null : enemyById(wiki.enemies, id);
        return byId ?? findEnemy(wiki.enemies, ref.name ?? '');
    };

    const findCharacterLink = (ref: InlineLinkRef): RawCharacter | null => {
        const id = parseId(ref.id);
        const byId = id == null ? null : characterById(wiki.characters, id);
        return byId ?? findCharacter(wiki.characters, ref.name ?? '');
    };

    const findRelicLink = (ref: InlineLinkRef): RelicDoc | null => {
        const id = parseId(ref.id);
        const byId = id == null ? null : relicById(wiki.relics, id);
        return byId ?? findRelic(wiki.relics, ref.name ?? '');
    };

    const findMapFloorLink = (ref: InlineLinkRef): RawMapFloor | null => {
        const id = parseId(ref.id);
        const byId = id == null ? null : mapFloorById(wiki.mapFloors, id);
        return byId ?? findMapFloor(wiki.mapFloors, wiki.mapCategories, ref.name ?? '');
    };

    /** 遗物在 V2 是道具的一种（`Item::Relic`），借 `ItemModal` 展示 */
    const relicItemLink = (ref: InlineLinkRef): ItemDoc | null => {
        const id = parseId(ref.id);
        const byId = id == null ? null : itemById(wiki.items, id);
        if (byId) return byId;

        const relic = findRelic(wiki.relics, ref.name ?? '');
        if (relic?.id != null) {
            const doc = itemById(wiki.items, relic.id);
            if (doc) return doc;
        }
        return findItem(wiki.items, ref.name ?? '');
    };

    // ---------- 打开 modal ----------

    /**
     * 内联组件统一入口：有 ID 优先按 ID 定位，只有名字时才走名字匹配。
     * 名字（`{{物品|名字|ID}}` 的第一段）只用于脚本加载前显示。
     */
    const openLink = async (kind: InlineLinkKind, ref: InlineLinkRef) => {
        if (!(await ensureWikiData())) return;

        const fail = () => toast()?.error(`${LABEL[kind]}不存在`);

        switch (kind) {
            case 'item':
            case 'relic': {
                const doc = kind === 'item' ? findItemLink(ref) : relicItemLink(ref);
                if (!doc) return fail();
                modal.open({ kind: 'item', item: doc });
                return;
            }
            case 'equipment': {
                const row = findEquipmentLink(ref);
                if (!row) return fail();
                modal.open({ kind: 'equipment', id: row.id });
                return;
            }
            case 'character': {
                const row = findCharacterLink(ref);
                if (!row) return fail();
                modal.open({ kind: 'character', id: row.id });
                return;
            }
            case 'enemy': {
                const row = findEnemyLink(ref);
                if (!row) return fail();
                modal.open({ kind: 'enemy', id: row.id });
                return;
            }
            case 'map': {
                const row = findMapFloorLink(ref);
                if (!row) return fail();
                modal.open({ kind: 'mapFloor', id: row.id });
                return;
            }
        }
    };

    /** 技能：V2 才有内联，按 identification 定位（名字只负责显示） */
    const openSkill = async (identification: number) => {
        if (!Number.isFinite(identification)) {
            toast()?.error('技能 ID 无效');
            return;
        }
        if (!(await ensureWikiData())) return;

        if (!wiki.skills.some((skill) => skill.id === identification)) {
            toast()?.error('技能不存在');
            return;
        }
        modal.open({ kind: 'skill', id: identification });
    };

    return {
        openLink,
        openSkill,
        ensureWikiData,
        findSkill: (identification: number) => wiki.skills.find((skill) => skill.id === identification) ?? null,
        findItemLink,
        findEquipmentLink,
        findEnemyLink,
        findCharacterLink,
        findRelicLink,
        findMapFloorLink,
    };
};
