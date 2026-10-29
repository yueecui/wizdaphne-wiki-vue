import { computed, onMounted } from 'vue';
import { useWikiDataStore } from '../stores/wikiData';
import { useDataV2Store } from '../views/DataV2/dataV2Store';
import type { CharacterDetail, JobDetail, JobRef, StatKey } from '../views/DataV2/types';
import { findCharacter, parseId } from './inlineLink';

/** 角色页三个区块共用的 props（来自挂载元素的 `data-name` / `data-id`） */
export interface CharacterPageProps {
    /** wiki 页面名（`{{PAGENAME}}`）：角色名，或「风格名 + 角色名」 */
    characterName?: string;
    /** 有 ID 时优先按 ID 定位 */
    characterId?: string;
}

/**
 * wiki 角色页的三个区块（基本信息 / 技能概览 / 好感对话）共用：
 * 定位角色 + 触发 V2 整库数据加载。
 *
 * 定位规则与内联组件一致：有 `data-id` 按 ID，否则按页面名匹配
 * （三语名，或「风格名 + 角色名」，同名时优先默认风格）。
 */
export const useCharacterPage = (props: CharacterPageProps) => {
    const wiki = useWikiDataStore();
    const store = useDataV2Store();

    const character = computed<CharacterDetail | null>(() => {
        const id = parseId(props.characterId);
        if (id != null) return store.characterById.get(id) ?? null;

        const name = (props.characterName ?? '').trim();
        if (!name) return null;
        const raw = findCharacter(wiki.characters, name);
        return raw ? (store.characterById.get(raw.id) ?? null) : null;
    });

    /** 占位文案：数据没加载好 / 页面名对不上角色时显示 */
    const placeholder = computed(() => {
        if (wiki.status === 'error') return wiki.error ? `加载失败：${wiki.error}` : '数据加载失败';
        return wiki.ready ? '未找到角色数据' : '加载中…';
    });

    // 三个区块共用同一次加载（`wiki.init` 幂等，有 IndexedDB 缓存时很快）
    onMounted(() => {
        void wiki.init();
    });

    return { wiki, store, character, placeholder };
};

/** 属性行，顺序与旧模板一致（力 / 智慧 / 信仰心 / 生命力 / 灵巧 / 敏捷 / 运） */
export const PAGE_STAT_ROWS: Array<{ key: StatKey; label: string }> = [
    { key: 'str', label: '力' },
    { key: 'int', label: '智慧' },
    { key: 'pie', label: '信仰心' },
    { key: 'vit', label: '生命力' },
    { key: 'dex', label: '灵巧' },
    { key: 'agi', label: '敏捷' },
    { key: 'luk', label: '运' },
];

/**
 * 头像：与角色 modal 的卡片一致，用解包数据里的缩略立绘
 * （`images.thumbnail` 是 sprite 的 stem，wiki 上带 `_s` 后缀、首字母大写）。
 * 旧模板用的 `Character_<页面名>.png` 是 wiki 上的 V1 图，不再使用。
 */
export const portraitFile = (character: Pick<CharacterDetail, 'images'>) => {
    const stem = character.images?.thumbnail;
    if (!stem) return null;
    return `${stem.charAt(0).toUpperCase()}${stem.slice(1)}_s.png`;
};

/**
 * 1 级数值 = 基础值（种族 + 属性 + 性别 + 阶级）+ 职业基础 + ⌈成长率⌉。
 * 算法与角色 modal 的 `levelStat` 相同。
 */
export const levelStat = (
    character: CharacterDetail,
    key: StatKey,
    job: JobRef | null,
    jobById: Map<number, JobDetail>,
): number => {
    const jobDetail = job ? jobById.get(job.id) : undefined;
    const base = (character.stats.base[key] ?? 0) + (jobDetail?.base[key] ?? 0);
    const growth = (character.stats.growth[key] ?? 0) + (jobDetail?.growth[key] ?? 0);
    return base + Math.ceil(growth / 100);
};

/** 旧模板的红底：该属性低于职业标准值，1 级时看不出来 */
const RED_STAT_BG: Record<string, string> = {
    '战士-智慧': 'bg-red-800/30',
    '战士-信仰心': 'bg-red-800/30',
    '骑士-智慧': 'bg-red-800/30',
    '骑士-敏捷': 'bg-red-800/30',
    '盗贼-信仰心': 'bg-red-800/30',
    '法师-力': 'bg-red-800/30',
    '僧侣-敏捷': 'bg-red-800/30',
};

export const statBgClass = (jobName: string | null | undefined, label: string) =>
    RED_STAT_BG[`${jobName ?? ''}-${label}`] ?? '';

export const primaryJobOf = (character: CharacterDetail): JobRef | null =>
    character.jobs.find((job) => job.primary) ?? character.jobs[0] ?? null;

export const subJobOf = (character: CharacterDetail): JobRef | null => {
    const jobs = character.jobs ?? [];
    if (jobs.length < 2) return null;
    return jobs.find((job) => job !== primaryJobOf(character)) ?? null;
};

/** 缘类型：数据里是「缘技能」的类型名 */
export const fateTextOf = (character: CharacterDetail) => {
    const fate = character.fate;
    if (!fate) return '—';
    return fate.type ?? fate.name ?? '—';
};
