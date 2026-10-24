import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
    useWikiDataStore,
    type EnumEntry,
    type RawCharacter,
    type RawJob,
    type RawSkill,
    type RawSubEffectBrief,
    type RawSubEffectBriefLeaf,
} from '../../stores/wikiData';
import type {
    CharacterDetail,
    CharacterListItem,
    EffectKind,
    FateSkill,
    JobDetail,
    Manifest,
    Ref,
    SkillDetail,
    SkillListItem,
    SkillRef,
    StatKey,
    SubEffectBrief,
    SubEffectBriefLeaf,
} from './types';

/**
 * View layer of the v2 page.
 *
 * Raw documents come from `useWikiDataStore` (IndexedDB / wiki API, short keys
 * decoded). Here they are enriched with the id dictionaries from
 * `Api/GetV2Enum`, so components keep working with refs / names instead of ids.
 */
export const useDataV2Store = defineStore('data-v2', () => {
    const wiki = useWikiDataStore();

    const error = computed<string | null>({
        get: () => wiki.error,
        set: (value) => {
            wiki.error = value;
        },
    });

    const refOf = (table: Record<string, EnumEntry>, id: number | undefined): Ref => {
        const key = String(id ?? 0);
        const entry = table[key];
        return {
            id: id ?? 0,
            name: entry?.name ?? `#${id ?? '?'}`,
            name_jp: entry?.name_jp ?? null,
            name_en: entry?.name_en ?? null,
        };
    };

    const alignmentRef = (id: number | undefined) => ({
        id: id ?? 0,
        name: wiki.enums.alignment[String(id ?? 0)] ?? '',
        point: 0,
    });

    /** identification -> name triple, built once per data load */
    const skillNameMap = computed(() => {
        const map = new Map<number, { name: string; name_jp: string | null; name_en: string | null }>();
        for (const skill of wiki.skills) {
            map.set(skill.id, { name: skill.name, name_jp: skill.name_jp, name_en: skill.name_en });
        }
        return map;
    });

    const skillRef = (identification: number): SkillRef => ({
        identification,
        ...(skillNameMap.value.get(identification) ?? {
            name: `#${identification}`,
            name_jp: null,
            name_en: null,
        }),
    });

    const fateOf = (identification: number): FateSkill => {
        const name = skillNameMap.value.get(identification);
        return {
            identification,
            name: name?.name ?? `#${identification}`,
            name_jp: name?.name_jp ?? null,
            name_en: name?.name_en ?? null,
            type: name?.name?.replace(/的才能$/, '') ?? null,
        };
    };

    const STAT7: StatKey[] = ['str', 'int', 'pie', 'vit', 'agi', 'dex', 'luk'];
    const JOB_STAT_KEYS = [...STAT7, 'hp', 'mp', 'sp'];

    const fillStats = (source: Record<string, number> | undefined): Record<StatKey, number> => {
        const out = {} as Record<StatKey, number>;
        for (const key of STAT7) out[key] = source?.[key] ?? 0;
        return out;
    };

    const fillJobStats = (source: Record<string, number> | undefined): Record<string, number | null> => {
        const out: Record<string, number | null> = {};
        for (const key of JOB_STAT_KEYS) out[key] = source?.[key] ?? 0;
        return out;
    };

    const toCharacter = (raw: RawCharacter): CharacterDetail => {
        // 卡池组 / 上线日期 / 声优来自 Api/GetV2Character 顶层的 extra（按 id 合并）
        const extra = wiki.characterExtras[raw.id];
        return {
        id: raw.id,
        group: raw.group,
        guide_no: raw.guide_no || null,
        name: raw.name,
        name_jp: raw.name_jp,
        name_en: raw.name_en,
        style: raw.style ?? '',
        is_default_style: Boolean(raw.default),
        rarity: refOf(wiki.enums.rarity, raw.rarity),
        race: refOf(wiki.enums.race, raw.race),
        attribute: refOf(wiki.enums.attribute, raw.attribute),
        gender: refOf(wiki.enums.gender, raw.gender),
        personality: refOf(wiki.enums.personality, raw.personality),
        alignment: alignmentRef(raw.alignment),
        jobs: (raw.jobs ?? []).map((job) => ({
            ...refOf(wiki.enums.job, job.id),
            primary: Boolean(job.primary),
        })),
        fate: raw.fate ? fateOf(raw.fate) : null,
        self_restraint: raw.self_restraint?.id
            ? { id: raw.self_restraint.id, extra_tags: raw.self_restraint.extra_tags ?? [] }
            : null,
        potential_grade: raw.potential_grade || null,
        pool_group: extra?.group ?? 0,
        character_voice: extra?.character_voice ?? null,
        release_date: extra?.release_date?.milliseconds
            ? {
                  date: extra.release_date.date ?? null,
                  time: extra.release_date.time ?? null,
                  milliseconds: extra.release_date.milliseconds,
              }
            : null,
        stats: {
            base: fillStats(raw.stats?.base),
            growth: fillStats(raw.stats?.growth),
            pools: {
                hp: { base: raw.stats?.pools?.hp?.base ?? 0, growth: raw.stats?.pools?.hp?.growth ?? 0 },
                mp: { base: raw.stats?.pools?.mp?.base ?? 0, growth: raw.stats?.pools?.mp?.growth ?? 0 },
                sp: { base: raw.stats?.pools?.sp?.base ?? 0, growth: raw.stats?.pools?.sp?.growth ?? 0 },
            },
            growth_rate: raw.stats?.growth_rate ?? [],
        },
        talent: {
            id: raw.talent?.id ?? 0,
            name: null,
            name_jp: null,
            min: fillStats(raw.talent?.min),
            max: fillStats(raw.talent?.max),
        },
        mental: { id: raw.mental ?? 0, value: raw.mental ?? 0 },
        grade: refOf(wiki.enums.grade, raw.grade),
        skills: {
            unique: (raw.skills?.unique ?? []).map(skillRef),
            inherit: (raw.skills?.inherit ?? []).map(skillRef),
            potential_inherit: (raw.skills?.potential ?? []).map(skillRef),
            discipline: (raw.skills?.discipline ?? []).map((item) => ({
                ...skillRef(item.id),
                level: item.level || undefined,
                need_point: item.need_point || undefined,
            })),
            same_identifications: raw.skills?.same ?? [],
            exclude_inheritance: raw.skills?.exclude ?? [],
            get_lv: raw.skills?.get_lv ?? null,
        },
        voice: {
            speech: raw.voice?.speech ?? null,
            breakup_speech: raw.voice?.breakup ?? null,
            voice_group_id: raw.voice?.group ?? null,
        },
        images: raw.images,
        };
    };

    const toJob = (raw: RawJob): JobDetail => {
        const jobRefs = (rows: Array<{ id: number; get_lv: number }> | undefined) =>
            (rows ?? []).map((row) => ({
                identification: row.id,
                get_lv: row.get_lv || null,
                ...(skillNameMap.value.get(row.id) ?? { name: `#${row.id}`, name_jp: null, name_en: null }),
            }));

        return {
            id: raw.id,
            name: raw.name,
            name_jp: raw.name_jp,
            name_en: raw.name_en,
            abbreviation: raw.abbreviation ?? null,
            display_order: raw.display_order,
            category: (raw.category ?? 'other') as JobDetail['category'],
            alignment: {
                good: (raw.alignment ?? []).includes(1),
                neutral: (raw.alignment ?? []).includes(2),
                evil: (raw.alignment ?? []).includes(3),
            },
            base: fillJobStats(raw.base),
            growth: fillJobStats(raw.growth),
            multipliers: raw.multipliers ?? {},
            skills: jobRefs(raw.skills),
            skill_variants: Object.fromEntries(
                Object.entries(raw.skill_variants ?? {}).map(([key, rows]) => [key, jobRefs(rows)]),
            ),
            skill_count: raw.skill_count ?? 0,
            characters: {
                primary: raw.characters?.primary ?? [],
                changeable: raw.characters?.changeable ?? [],
            },
            change_items: (raw.change_items ?? []).map((item) => ({
                item: item.item ?? null,
                quantity: item.quantity ?? null,
                group: item.group ?? null,
            })),
        };
    };

    /** 被引用的 sub effect 摘要（清洗时只展开一层，children 是叶子） */
    const briefLeafOf = (raw: RawSubEffectBriefLeaf): SubEffectBriefLeaf => ({
        id: raw.id,
        kind: raw.kind || null,
        kind_name: raw.kind_name || null,
        params: raw.params?.length ? raw.params : null,
        strength: raw.strength || null,
        turn: raw.turn || null,
        target: raw.target || null,
        target_text: raw.target_text || null,
    });

    const subBriefOf = (raw: RawSubEffectBrief): SubEffectBrief => ({
        ...briefLeafOf(raw),
        children: (raw.children ?? []).map(briefLeafOf),
    });

    /** 技能用到的 sub effect kind（去重升序），供列表按 ID 精确筛选 */
    const subKindsOf = (raw: RawSkill): number[] => {
        const kinds = new Set<number>();
        for (const level of raw.levels ?? []) {
            for (const sub of level.sub_effects ?? []) if (sub.kind) kinds.add(sub.kind);
        }
        return [...kinds].sort((a, b) => a - b);
    };

    const toSkill = (raw: RawSkill): SkillDetail => ({
        identification: raw.id,
        name: raw.name,
        name_jp: raw.name_jp,
        name_en: raw.name_en,
        kind: raw.kind || null,
        kind_name: wiki.enums.skill_kind[String(raw.kind)] ?? null,
        max_level: raw.max_level,
        is_passive: Boolean(raw.passive),
        player: Boolean(raw.player),
        sources: raw.sources ?? [],
        jobs: raw.jobs ?? [],
        flags: {
            test: Boolean(raw.test),
            level0: Boolean(raw.level0),
            player: Boolean(raw.player),
        },
        sub_kinds: subKindsOf(raw),
        description: raw.description ?? null,
        detail_description: raw.detail_description ?? null,
        description_lang: raw.description_lang,
        job_limited: raw.job_limited ?? [],
        equipment_limited: raw.equipment_limited ?? [],
        tags: raw.tags ?? [],
        learn: (raw.learn ?? []).map((item) => ({ job: item.job, get_lv: item.get_lv ?? null })),
        levels: (raw.levels ?? []).map((level) => ({
            level: level.level,
            cost: level.cost || null,
            cost_kind: level.cost_kind || null,
            use_timing: level.use_timing || null,
            use_limit: level.use_limit || null,
            hate: level.hate || null,
            // 0 = 近距离，不能被 || 吞掉
            range_type: level.range_type ?? null,
            skill_condition_ids: level.skill_condition_ids ?? null,
            description: level.description,
            description_lang: level.description_lang,
            damage: (level.damage ?? []).map((damage) => ({
                attack_rate: damage.attack_rate || null,
                attack_rate_both_hands: damage.attack_rate_both_hands || null,
                add_damage_rate: damage.add_damage_rate || null,
                add_critical_rate: damage.add_critical_rate || null,
                valid_cap_parameter_value: damage.valid_cap_parameter_value || null,
                valid_cap_parameter_value_both_hands: damage.valid_cap_parameter_value_both_hands || null,
                valid_start_parameter_value: damage.valid_start_parameter_value || null,
                damage_type: damage.damage_type || null,
                attack_type: damage.attack_type || null,
                reference_parameter: damage.reference_parameter || null,
                reference_parameter_2: damage.reference_parameter_2 || null,
                aptitude_ids: damage.aptitude_ids ?? [],
                fixed_damage: damage.fixed_damage || null,
                hit_rate: damage.hit_rate || null,
                damage_count: damage.damage_count || null,
                only_once: damage.only_once,
                target: damage.target || null,
                target_text: wiki.enums.target[String(damage.target)]?.name ?? null,
            })),
            sub_effects: (level.sub_effects ?? []).map((sub) => {
                const kind = wiki.enums.effect_kind[String(sub.kind)];
                return {
                    kind: sub.kind || null,
                    kind_name: kind?.name ?? null,
                    strength: sub.strength || null,
                    turn: sub.turn || null,
                    target: sub.target || null,
                    target_text: wiki.enums.target[String(sub.target)]?.name ?? null,
                    params: sub.params ?? [],
                    param_labels: kind?.params ?? null,
                    from: sub.from,
                    reference_parameter: sub.reference_parameter ?? null,
                    reference_parameter_rate: sub.reference_parameter_rate ?? null,
                    abnormal_valid_start_parameter_value: sub.abnormal_valid_start_parameter_value ?? null,
                    abnormal_valid_cap_parameter_value: sub.abnormal_valid_cap_parameter_value ?? null,
                    force_apply: sub.force_apply ?? null,
                    is_ignore_resist: sub.is_ignore_resist ?? null,
                    calc_reference_parameter: sub.calc_reference_parameter ?? null,
                    calc_reference_parameter_2: sub.calc_reference_parameter_2 ?? null,
                    calc_reference_parameter_rate: sub.calc_reference_parameter_rate ?? null,
                    calc_reference_parameter_rate_2: sub.calc_reference_parameter_rate_2 ?? null,
                    calc_valid_cap_parameter_value: sub.calc_valid_cap_parameter_value ?? null,
                    calc_valid_start_parameter_value: sub.calc_valid_start_parameter_value ?? null,
                    reference_resist: sub.reference_resist ?? null,
                    child_sub_effect_ids: sub.child_sub_effect_ids ?? null,
                    target_race_ids: sub.target_race_ids ?? null,
                    extension_params: sub.extension_params ?? null,
                    child_sub_effects: (sub.child_sub_effects ?? []).map(subBriefOf),
                    extension_effects: (sub.extension_effects ?? []).map(subBriefOf),
                    param_refs: Object.fromEntries(
                        Object.entries(sub.param_refs ?? {}).map(([index, ref]) => [index, subBriefOf(ref)]),
                    ),
                };
            }),
        })),
    });

    const characterDetails = computed<CharacterDetail[]>(() => wiki.characters.map(toCharacter));
    const skillDetails = computed<SkillDetail[]>(() => wiki.skills.map(toSkill));

    const characters = computed<CharacterListItem[]>(() => characterDetails.value);
    const skills = computed<SkillListItem[]>(() => skillDetails.value);
    const jobs = computed<JobDetail[]>(() => wiki.jobs.map(toJob));

    const characterById = computed(() => new Map(characterDetails.value.map((item) => [item.id, item])));
    const jobById = computed(() => new Map(jobs.value.map((item) => [item.id, item])));

    /** ``Skill.equipment_limited`` -> 单手剑 / 双手斧 / … */
    const equipmentName = (id: number) => wiki.enums.equipment_type?.[String(id)]?.name ?? `#${id}`;

    /** 种族 id -> 名称（``SkillSubEffect.target_race_ids`` 用） */
    const raceName = (id: number) => wiki.enums.race?.[String(id)]?.name ?? `#${id}`;

    /** ``Skill.range_type``：技能的射程类型 */
    const RANGE_TYPE_NAME: Record<number, string> = {
        0: '近距离',
        1: '中距离',
        10: '远距离',
        99: '依武器',
    };

    const rangeName = (id: number | null | undefined) =>
        id == null ? '' : (RANGE_TYPE_NAME[id] ?? `#${id}`);
    const skillById = computed(() => new Map(skillDetails.value.map((item) => [item.identification, item])));

    const effectKinds = computed<Record<string, EffectKind>>(() => {
        const out: Record<string, EffectKind> = {};
        for (const [key, item] of Object.entries(wiki.enums.effect_kind)) {
            out[key] = {
                id: item.id,
                name: item.name ?? null,
                name_jp: item.name_jp ?? null,
                category: null,
                primary_category: null,
                count: item.count ?? 0,
                params: item.params ?? null,
                invalid_kinds: item.invalid_kinds ?? null,
                remove_kinds: item.remove_kinds ?? null,
            };
        }
        return out;
    });

    const manifest = computed<Manifest | null>(() => {
        if (!wiki.ready) return null;
        return {
            version: wiki.version,
            source: 'wiki:Api/GetV2Character / GetV2Job / GetV2Skill / GetV2Enum / GetV2EffectKind',
            counts: {
                characters: wiki.counts.characters,
                character_groups: new Set(wiki.characters.map((row) => row.group)).size,
                excluded_awakening: 0,
                jobs: wiki.counts.jobs,
                skills: wiki.counts.skills,
                player_skills: wiki.counts.playerSkills,
            },
            notes: [],
        };
    });

    const fromCache = computed(() => wiki.fromCache);

    const state = computed(() => {
        const mapped =
            wiki.status === 'ready'
                ? 'ready'
                : wiki.status === 'loading'
                  ? 'loading'
                  : wiki.status === 'error'
                    ? 'error'
                    : 'idle';
        return {
            manifest: mapped,
            characters: mapped,
            jobs: mapped,
            skills: mapped,
            effectKinds: mapped,
        };
    });

    const ensureAll = async () => {
        await wiki.init();
    };

    /** drop the IndexedDB cache and pull the wiki payloads again */
    const refresh = async () => {
        await wiki.refresh();
    };

    const ensureManifest = ensureAll;
    const ensureCharacters = ensureAll;
    const ensureJobs = ensureAll;
    const ensureSkills = ensureAll;
    const ensureEffectKinds = ensureAll;

    const getCharacter = async (id: number): Promise<CharacterDetail | null> =>
        characterById.value.get(id) ?? null;

    /** 角色个体出现几率（``Api/GetV2Character`` 顶层 rates） */
    const characterRate = (id: number) => wiki.characterRates[id] ?? null;

    const getSkill = async (identification: number): Promise<SkillDetail | null> =>
        skillById.value.get(identification) ?? null;

    return {
        manifest,
        characters,
        jobs,
        skills,
        effectKinds,
        state,
        error,
        fromCache,
        ensureManifest,
        ensureCharacters,
        ensureJobs,
        ensureSkills,
        ensureEffectKinds,
        ensureAll,
        refresh,
        getCharacter,
        getSkill,
        characterRate,
        characterById,
        jobById,
        skillById,
        equipmentName,
        raceName,
        rangeName,
    };
});
