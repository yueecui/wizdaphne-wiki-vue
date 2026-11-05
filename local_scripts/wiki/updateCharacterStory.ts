/**
 * updateCharacterStory.ts —— 角色背景故事（``CharacterStory``）→ wiki。
 *
 * 两种用法：
 *   1. 独立运行：``npx tsx local_scripts/wiki/updateCharacterStory.ts [--dry-run] [--only 名字]``
 *   2. 被 ``uploadDataToWiki.ts`` import，跟随 character 阶段自动上传。
 *
 * 目标页面：``Data:角色故事/<角色风格><角色名>.json``
 *   * 角色风格为「基本」（普通）时省略风格前缀；
 *   * 角色名 / 风格全部使用简中译名（``name.zhs`` / ``caption_name.zhs``）；
 *   * 风格名本身已含角色名时（如「纯洁之觉醒爱丽丝」）不再重复拼接；
 *   * 觉醒版（``before_awakening_character_id`` 非 0）没有专属故事，跳过。
 *
 * 页面内容：该角色该风格的全部故事，按 ``reliability`` 升序；
 *   每条保留 ``message`` 多语言（ja / zhs / zht / en）与 ``reliability``，
 *   并附带 ``character_id`` / ``style`` / ``character_name``。
 *
 * 需要 .env：VITE_WIKI_PREFIX / WIKI_AUTHKEY / WIKI_USERNAME / WIKI_PASSWORD
 * 解包路径可用 ``WIZDAPHNE_UNPACK`` 覆盖（默认 D:\WizardyDaphne\WizardyDaphneUnpack）。
 */
import dotenv from 'dotenv';
import { HuijiWiki } from 'huijiwiki-api';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

dotenv.config();

const UNPACK = process.env.WIZDAPHNE_UNPACK ?? 'D:\\WizardyDaphne\\WizardyDaphneUnpack';
const MASTER = path.join(UNPACK, 'out', 'masterdata');
/** 页面前缀：``Data:角色故事`` */
export const STORY_PAGE_PREFIX = 'Data:角色故事';
/** 普通（默认）风格名，页面标题里省略 */
const DEFAULT_STYLE = '基本';
const EDIT_DELAY_MS = 50;

const WIKI_PREFIX = process.env.VITE_WIKI_PREFIX;
const WIKI_AUTHKEY = process.env.WIKI_AUTHKEY;
const WIKI_USERNAME = process.env.WIKI_USERNAME;
const WIKI_PASSWORD = process.env.WIKI_PASSWORD;

export interface LocalizedText {
    ja?: string;
    zhs?: string;
    zht?: string;
    en?: string;
}

interface RawStory {
    character_id: number;
    id: number;
    message: LocalizedText;
    reliability: number;
    story_condition_id?: number;
}

interface RawCharacter {
    id: number;
    name?: LocalizedText;
    caption_name?: LocalizedText;
    /** 非 0 表示这是觉醒版（值为其基础版 id） */
    before_awakening_character_id?: number;
}

export interface StoryEntry {
    reliability: number;
    message: LocalizedText;
}

export interface StoryPage {
    character_id: number;
    style: string;
    character_name: string;
    stories: StoryEntry[];
}

export interface StoryPageEntry {
    title: string;
    page: StoryPage;
}

const textOf = (value: LocalizedText | undefined): string =>
    (value?.zhs ?? value?.ja ?? value?.en ?? '').trim();

/** 页面标题：基本风格省略；风格名已含角色名时不重复拼接 */
function titleOf(characterName: string, style: string): string {
    if (!style || style === DEFAULT_STYLE) return characterName;
    return style.includes(characterName) ? style : `${style}${characterName}`;
}

async function loadJson<T>(file: string): Promise<T> {
    return JSON.parse(await fs.readFile(file, 'utf8')) as T;
}

async function login(): Promise<HuijiWiki> {
    if (!WIKI_PREFIX || !WIKI_AUTHKEY) {
        throw new Error('缺少环境变量 VITE_WIKI_PREFIX / WIKI_AUTHKEY（见 .env）');
    }
    if (!WIKI_USERNAME || !WIKI_PASSWORD) {
        throw new Error('缺少环境变量 WIKI_USERNAME / WIKI_PASSWORD（见 .env）');
    }
    const bot = new HuijiWiki(WIKI_PREFIX, WIKI_AUTHKEY);
    if (!(await bot.apiLogin(WIKI_USERNAME, WIKI_PASSWORD))) {
        throw new Error(`wiki 登录失败：${bot.getLastErrorMessage() || '未知原因'}`);
    }
    return bot;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** 组装所有角色故事页面（一个角色风格一个页面；觉醒版跳过） */
export async function buildStoryPages(): Promise<StoryPageEntry[]> {
    const stories = await loadJson<RawStory[]>(path.join(MASTER, 'CharacterStory.json'));
    const characters = await loadJson<RawCharacter[]>(path.join(MASTER, 'Character.json'));
    const charById = new Map(characters.map((c) => [c.id, c]));

    const grouped = new Map<number, RawStory[]>();
    for (const story of stories) {
        const list = grouped.get(story.character_id) ?? [];
        list.push(story);
        grouped.set(story.character_id, list);
    }

    const pages: StoryPageEntry[] = [];
    for (const [characterId, rows] of grouped) {
        const character = charById.get(characterId);
        if (!character) continue;
        // 觉醒版没有专属故事（与基础版重复），跳过不生成页面
        if (character.before_awakening_character_id) continue;
        const characterName = textOf(character.name);
        if (!characterName) continue;
        const style = textOf(character.caption_name) || DEFAULT_STYLE;
        const sorted = [...rows].sort((a, b) => (a.reliability ?? 0) - (b.reliability ?? 0));
        pages.push({
            title: `${STORY_PAGE_PREFIX}/${titleOf(characterName, style)}.json`,
            page: {
                character_id: characterId,
                style,
                character_name: characterName,
                stories: sorted.map((story) => ({
                    reliability: story.reliability,
                    message: story.message,
                })),
            },
        });
    }

    pages.sort((a, b) => a.title.localeCompare(b.title, 'zh-Hans-CN'));
    return pages;
}

/**
 * 上传（或 dry-run 打印）角色故事页面。
 * ``dryRun`` 时只打印、不访问 wiki（此时 ``bot`` 可为 ``null``）。
 */
export async function publishStoryPages(
    bot: HuijiWiki | null,
    pages: StoryPageEntry[],
    options: { dryRun?: boolean; delayMs?: number } = {},
): Promise<{ uploaded: number; skipped: number; failed: number }> {
    if (options.dryRun) {
        for (const item of pages) {
            console.log(`\n=== ${item.title} ===`);
            console.log(JSON.stringify(item.page, null, 2));
        }
        return { uploaded: 0, skipped: 0, failed: 0 };
    }
    if (!bot) throw new Error('publishStoryPages 需要已登录的 bot');

    const delay = options.delayMs ?? EDIT_DELAY_MS;
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    for (let i = 0; i < pages.length; i++) {
        const { title, page } = pages[i];
        const content = JSON.stringify(page);
        try {
            const existing = await bot.getPageRawTextByTitle(title);
            if (existing?.content?.trim() === content.trim()) {
                skipped++;
                continue;
            }
            const res = await bot.editPage(title, content, { summary: '更新角色背景故事' });
            if (res.error) throw new Error(res.error.info ?? JSON.stringify(res.error));
            uploaded++;
            console.log(`[${i + 1}/${pages.length}] ${title}`);
            await sleep(delay);
        } catch (err) {
            failed++;
            console.error(`[${i + 1}/${pages.length}] 失败 ${title}:`, err instanceof Error ? err.message : err);
        }
    }

    return { uploaded, skipped, failed };
}

async function main(): Promise<void> {
    const dryRun = process.argv.includes('--dry-run');
    const onlyIndex = process.argv.indexOf('--only');
    const only = onlyIndex >= 0 ? (process.argv[onlyIndex + 1] ?? '').trim() : '';

    let pages = await buildStoryPages();
    if (only) {
        pages = pages.filter(
            (item) => item.page.character_name.includes(only) || item.title.includes(only),
        );
    }
    console.log(`角色故事页面：${pages.length} 个${only ? `（筛选 ${only}）` : ''}`);

    if (dryRun) {
        await publishStoryPages(null, pages, { dryRun: true });
        return;
    }

    const bot = await login();
    const { uploaded, skipped, failed } = await publishStoryPages(bot, pages);
    console.log(`\n完成：上传 ${uploaded}，跳过 ${skipped}，失败 ${failed}，共 ${pages.length}`);
    if (failed > 0) process.exitCode = 1;
}

// 仅作为脚本直接运行时执行（被 uploadDataToWiki import 时不跑）
if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
    main().catch((err) => {
        console.error('执行失败:', err instanceof Error ? err.message : err);
        process.exitCode = 1;
    });
}
