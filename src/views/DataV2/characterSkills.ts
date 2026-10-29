import type { CharacterDetail, SkillRef } from './types';

/** 一组技能（分组名 + 该组的技能） */
export interface SkillGroup {
    label: string;
    skills: SkillRef[];
}

/** 五个分组的叫法，角色 modal 与 wiki 页面用的不是同一套 */
export interface SkillGroupLabels {
    passive: string;
    active: string;
    inherit: string;
    potential: string;
    discipline: string;
}

/** V2 角色 modal 里的分组（V1 的五个分组） */
export const MODAL_SKILL_LABELS: SkillGroupLabels = {
    passive: '固有技能',
    active: '角色专用技能',
    inherit: '继承技能',
    potential: '潜在继承技能',
    discipline: '克己技能',
};

/** wiki 角色页的「技能概览」沿用旧模板的叫法 */
export const PAGE_SKILL_LABELS: SkillGroupLabels = {
    passive: '固有被动',
    active: '固有主动',
    inherit: '继承技能',
    potential: '潜在继承技能',
    discipline: '克己被动',
};

/**
 * 同名的继承技能有两个版本：角色自己用的（同时出现在 ``unique_skill_ids`` 里，通常更强）
 * 和给其他角色继承用的版本。只保留自己用的那个。
 */
export const dedupeInherit = (list: SkillRef[], same: number[], unique: SkillRef[]): SkillRef[] => {
    const uniqueIds = new Set(unique.map((s) => s.identification));
    const rank = (s: SkillRef) => (same.includes(s.identification) ? 2 : uniqueIds.has(s.identification) ? 1 : 0);
    const picked = new Map<string, SkillRef>();
    for (const s of list) {
        const key = s.name ?? `#${s.identification}`;
        const prev = picked.get(key);
        if (!prev || rank(s) > rank(prev)) picked.set(key, s);
    }
    return [...picked.values()];
};

/**
 * 按 `CharacterDetail.skills` 分出五组。
 *
 * 能继承给别人的技能统一归到「继承技能」，不在固有 / 角色专用里重复显示；
 * 克己各等级的描述相同，只保留一条（不显示等级）。
 */
export const buildSkillGroups = (
    skills: CharacterDetail['skills'] | null | undefined,
    isPassive: (identification: number) => boolean,
    labels: SkillGroupLabels = MODAL_SKILL_LABELS,
): SkillGroup[] => {
    if (!skills) return [];
    const inheritIds = new Set(skills.inherit.map((s) => s.identification));
    const own = skills.unique.filter((s) => !inheritIds.has(s.identification));
    const groups: SkillGroup[] = [
        { label: labels.passive, skills: own.filter((s) => isPassive(s.identification)) },
        { label: labels.active, skills: own.filter((s) => !isPassive(s.identification)) },
        {
            label: labels.inherit,
            skills: dedupeInherit(skills.inherit, skills.same_identifications, skills.unique),
        },
        { label: labels.potential, skills: skills.potential_inherit },
        {
            label: labels.discipline,
            skills: skills.discipline.slice(0, 1).map((s) => ({ ...s, level: undefined })),
        },
    ];
    return groups.filter((group) => group.skills.length);
};
