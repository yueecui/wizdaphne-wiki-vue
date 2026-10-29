import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import {
    useWikiDataStore,
    type EnumEntry,
    type MapCategory,
    type RawCharacter,
    type RawEnemy,
    type RawEnemyAiCondition,
    type RawEnemyPool,
    type RawEnemyVariant,
    type RawEquipment,
    type RawJob,
    type RawMapFloor,
    type RawMapFormation,
    type RawSkill,
    type RawSubEffectBrief,
    type RawSubEffectBriefLeaf,
} from '../../stores/wikiData';
import type {
    CharacterDetail,
    CharacterListItem,
    EffectKind,
    EnemyAiCondition,
    EnemyListItem,
    EnemyVariant,
    EquipmentBaseStat,
    EquipmentListItem,
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
import type { RelicDoc } from './relicTypes';

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

    /**
     * 概率UP立绘编号（手工表 ``banner`` 列）。
     * 线上 ``Api/GetV2Extra`` 给 ``"2;18;28;40"`` 字符串，mock 给数组，这里统一成数字数组。
     */
    const parseBanner = (value: unknown): number[] => {
        const list =
            typeof value === 'string'
                ? value.split(/[;,\s]+/)
                : Array.isArray(value)
                  ? value
                  : typeof value === 'number'
                    ? [value]
                    : [];
        return list
            .map((item) => Number(item))
            .filter((item) => Number.isFinite(item) && item > 0);
    };

    /** identification -> name triple, built once per data load */
    const skillNameMap = computed(() => {
        const map = new Map<number, { name: string; name_jp: string | null; name_en: string | null }>();
        for (const skill of wiki.skills) {
            map.set(skill.id, { name: skill.name, name_jp: skill.name_jp, name_en: skill.name_en });
        }
        return map;
    });

    const skillRef = (identification: number, level?: number): SkillRef => ({
        identification,
        ...(level ? { level } : {}),
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
            banner: parseBanner(extra?.banner),
            dialogue: raw.dialogue ?? null,
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
                Object.entries(normalizeNumericKeys(raw.skill_variants)).map(([key, rows]) => [key, jobRefs(rows)]),
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
        calc_reference_parameter: raw.calc_reference_parameter || null,
        calc_reference_parameter_2: raw.calc_reference_parameter_2 || null,
        calc_reference_parameter_rate: raw.calc_reference_parameter_rate || null,
        calc_reference_parameter_rate_2: raw.calc_reference_parameter_rate_2 || null,
        calc_valid_cap_parameter_value: raw.calc_valid_cap_parameter_value || null,
        calc_valid_start_parameter_value: raw.calc_valid_start_parameter_value || null,
    });

    const subBriefOf = (raw: RawSubEffectBrief): SubEffectBrief => ({
        ...briefLeafOf(raw),
        children: (raw.children ?? []).map(briefLeafOf),
    });

    /**
     * 线上 Lua 模块把「从 1 开始的连续整数 key」序列化成数组（``{1:a,2:b}`` → ``[a,b]``），
     * 前端 ``Object.entries`` 读到的是 0 起 key：``param_refs`` 会显示「参数0」，
     * ``skill_variants`` 会整体错位一位。``decodeDoc`` 已经处理了新下载的数据，
     * 这里兜住旧缓存里的 0 起数据（规则相同，幂等）。
     */
    const normalizeNumericKeys = <T>(value: Record<string, T> | null | undefined): Record<string, T> => {
        const entries = Object.entries(value ?? {});
        if (!entries.length) return {};
        const numeric = entries.every(([key]) => /^\d+$/.test(key));
        const zeroBased = numeric && entries.every(([key], index) => Number(key) === index);
        if (!zeroBased) return { ...(value as Record<string, T>) };
        return Object.fromEntries(entries.map(([, item], index) => [String(index + 1), item]));
    };

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
        summons: (raw.summons ?? [])
            .filter((unit) => unit.category)
            .map((unit) => ({
                category: unit.category,
                level: unit.level || 0,
                count: unit.count || 1,
            })),
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
            name: level.name,
            name_lang: level.name_lang,
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
                        Object.entries(normalizeNumericKeys(sub.param_refs)).map(([index, ref]) => [
                            index,
                            subBriefOf(ref),
                        ]),
                    ),
                    // kind 2790：按敌人 buff 数量档替换到的效果组
                    step_replace: (sub.step_replace ?? []).map((item) => ({
                        step: item.step,
                        effect_group: item.effect_group,
                        effects: (item.effects ?? []).map(subBriefOf),
                    })),
                };
            }),
        })),
    });

    /** 装备：清洗时已把名称 / 分组 / 特性名落地，这里只补缺省值 */
    const toEquipment = (raw: RawEquipment): EquipmentListItem => ({
        id: raw.id,
        name: raw.name,
        name_jp: raw.name_jp || null,
        name_en: raw.name_en || null,
        category: raw.category || '其他',
        type_id: raw.type_id || null,
        type: raw.type || null,
        part: raw.part || null,
        rank: raw.rank,
        collection_id: raw.collection_id ?? null,
        element: raw.element,
        element_name: raw.element_name || null,
        special: Boolean(raw.special),
        note: raw.note || null,
        list_icon: raw.list_icon || null,
        icon: raw.icon || null,
        soucate: raw.soucate || 0,
        desc: raw.desc || null,
        sou: raw.sou ?? [],
        req: raw.req ?? [],
        fa_can: raw.fa_can || 0,
        fa_sk: raw.fa_sk || null,
        fa_sk_desc: raw.fa_sk_desc || null,
        job_limited: raw.job_limited ?? [],
        race_limited: raw.race_limited ?? [],
        levels: raw.levels ?? [],
        bonus: raw.bonus ?? null,
        reinforce_max: raw.reinforce_max,
        over_rank: raw.over_rank ?? [],
        stats: raw.stats,
        max_stats: raw.max_stats,
        skills: raw.skills ?? [],
        traits: raw.traits ?? [],
        set_skills: raw.set_skills ?? [],
        shop: raw.shop ?? [],
    });

    /** 体型档位（``EnemyCategory.size_kind``） */
    const ENEMY_SIZE: Record<number, string> = { 1: '小型', 2: '中型', 3: '大型', 4: '特大' };

    /**
     * 强度档位（``Enemy.kind``）。解包里没有对应枚举表，按变体名字与图鉴标记推断；
     * 与游戏内文案核对后在这里改一处即可。
     */
    const ENEMY_KIND: Record<number, string> = {
        0: '普通',
        1: '强化1',
        2: '强化2',
        3: '首领',
        4: '强敌',
    };

    const EMPTY_FREEZE = {
        half: 0,
        full: 0,
        break: 0,
        recovery: 0,
        wait_min: 0,
        wait_max: 0,
        intelligence: 0,
    };

    const enemySizeName = (id: number | null | undefined) => (id == null ? null : (ENEMY_SIZE[id] ?? null));
    const enemyKindName = (id: number | null | undefined) => (id == null ? null : (ENEMY_KIND[id] ?? null));

    const attributeRef = (id: number) => refOf(wiki.enums.attribute, id);

    /** AI 条件 / 插入触发条件：文案 + 引用 + 子效果种类 id（短键解码会把缺省的 num 补成 0） */
    const toAiCondition = (raw: RawEnemyAiCondition): EnemyAiCondition => ({
        text: raw.text || null,
        label: raw.label || null,
        ref: raw.ref || null,
        status: raw.status || null,
        suffix: raw.suffix || null,
    });

    const toEnemyVariant = (raw: RawEnemyVariant): EnemyVariant => {
        // 同一 identification 可能被不同分栏引用；等级以清洗时记下的为准
        const ref = (identification: number) => skillRef(identification, raw.skill_levels?.[identification]);
        return {
            id: raw.id,
            kind: raw.kind,
            kind_name: enemyKindName(raw.kind),
            param: raw.param,
            exp: raw.exp,
            ai: raw.ai,
            level_min: raw.level?.[0] ?? 0,
            level_max: raw.level?.[1] ?? 0,
            attribute: (raw.attribute ?? []).map(attributeRef),
            attack_attribute: (raw.attack_attribute ?? []).map(attributeRef),
            weak: (raw.weak ?? []).map(attributeRef),
            characteristics: (raw.characteristics ?? []).map((id) => refOf(wiki.enums.enemy_characteristic, id)),
            gimmicks: raw.gimmicks ?? [],
            fly: Boolean(raw.fly),
            body_size: raw.body_size ?? [],
            skills: (raw.skills ?? []).map(ref),
            action_skills: (raw.action_skills ?? []).map(ref),
            interrupts: (raw.interrupts ?? [])
                .filter((item) => item.skill)
                .map((item) => ({
                    skill: ref(item.skill),
                    once: Boolean(item.once),
                    hp: item.hp || null,
                    conditions: (item.conditions ?? []).map(toAiCondition),
                })),
            passive_skills: (raw.passive_skills ?? []).map(ref),
            struggle_skill: raw.struggle_skill ? ref(raw.struggle_skill) : null,
            ai_plan: (raw.ai_plan ?? []).map((rule) => ({
                priority: rule.priority ?? 0,
                conditions: (rule.conditions ?? []).map(toAiCondition),
                skills: (rule.skills ?? [])
                    .filter((skill) => skill.skill)
                    .map((skill) => ({
                        skill: ref(skill.skill),
                        weight: skill.weight ?? 0,
                        target: skill.target || null,
                    })),
            })),
            stats: raw.stats ?? {},
            resist: raw.resist ?? {},
            freeze: raw.freeze ?? { ...EMPTY_FREEZE },
        };
    };

    /** 敌人：清洗时已把种族 / 体型 / 技能落到字段上，这里只补名字 */
    const toEnemy = (raw: RawEnemy): EnemyListItem => ({
        id: raw.id,
        no: raw.no || null,
        book: raw.book ?? null,
        name: raw.name,
        name_jp: raw.name_jp || null,
        name_en: raw.name_en || null,
        thumbnail: raw.thumbnail || null,
        boss: Boolean(raw.boss),
        race: refOf(wiki.enums.enemy_species, raw.race),
        lineage: raw.lineage || 0,
        size: raw.size || 0,
        size_name: enemySizeName(raw.size),
        attack_type: raw.attack_type || 0,
        damage_type: raw.damage_type || 0,
        attribute: (raw.attribute ?? []).map(attributeRef),
        attack_attribute: (raw.attack_attribute ?? []).map(attributeRef),
        weak: (raw.weak ?? []).map(attributeRef),
        characteristics: (raw.characteristics ?? []).map((id) => refOf(wiki.enums.enemy_characteristic, id)),
        gimmicks: raw.gimmicks ?? [],
        kinds: raw.kinds ?? [],
        kind_names: (raw.kinds ?? []).map((k) => ENEMY_KIND[k]).filter((v): v is string => Boolean(v)),
        level: raw.level && (raw.level.min || raw.level.max) ? { ...raw.level } : null,
        fly: Boolean(raw.fly),
        body_size: raw.body_size ?? [],
        resist: raw.resist ?? {},
        freeze: raw.freeze ?? { ...EMPTY_FREEZE },
        skills: (raw.skills ?? []).map(skillRef),
        variants: (raw.variants ?? []).map(toEnemyVariant),
    });

    const characterDetails = computed<CharacterDetail[]>(() => wiki.characters.map(toCharacter));
    const skillDetails = computed<SkillDetail[]>(() => wiki.skills.map(toSkill));
    const equipments = computed<EquipmentListItem[]>(() => wiki.equipments.map(toEquipment));
    const enemies = computed<EnemyListItem[]>(() => wiki.enemies.map(toEnemy));
    /** 装备类型基准值（V1 手工维护）：红绿配色与类型按钮排序都用它 */
    const equipmentBaseStat = computed<EquipmentBaseStat>(() => wiki.equipmentBaseStat as EquipmentBaseStat);

    const characters = computed<CharacterListItem[]>(() => characterDetails.value);
    const skills = computed<SkillListItem[]>(() => skillDetails.value);
    const jobs = computed<JobDetail[]>(() => wiki.jobs.map(toJob));

    const characterById = computed(() => new Map(characterDetails.value.map((item) => [item.id, item])));
    const jobById = computed(() => new Map(jobs.value.map((item) => [item.id, item])));
    const enemyById = computed(() => new Map(enemies.value.map((item) => [item.id, item])));

    /**
     * 地图 / 敌群里的 ``enemy_id`` 是「出现变体」（``EnemyLayout.enemy_id``），
     * 敌人模块按图鉴分类存（``enemies`` 的 id）。这里建 变体 id -> 分类 的索引，
     * 地图数据只存变体 id，名称与 modal 都走敌人模块。
     */
    const enemyVariantById = computed(() => {
        const out = new Map<number, { enemy: EnemyListItem; variant: EnemyVariant }>();
        for (const enemy of enemies.value) {
            for (const variant of enemy.variants) out.set(variant.id, { enemy, variant });
        }
        return out;
    });
    /** 变体 id -> 敌人名；查不到时回退成 ``#id`` */
    const enemyNameOf = (id: number) => {
        const hit = enemyVariantById.value.get(id);
        return hit ? hit.enemy.name || `#${id}` : `#${id}`;
    };
    /** 变体 id -> 图鉴分类 id（打开 ``EnemyModal`` 用）；查不到返回 null */
    const enemyCategoryIdOf = (id: number) => enemyVariantById.value.get(id)?.enemy.id ?? null;

    /** 怪物图鉴编号 -> 遗物（``relics_extra.monster_id`` 对应敌人表的 ``no``） */
    const relicByMonsterNo = computed(() => {
        const out = new Map<number, RelicDoc>();
        for (const relic of wiki.relics) {
            for (const monster of relic.monsters ?? []) {
                if (monster.id != null && !out.has(monster.id)) out.set(monster.id, relic);
            }
        }
        return out;
    });

    /** 该敌人变体是否在任一敌群里站第一排（``pos_y = 1``） */
    const inFrontRow = (formations: RawMapFormation[], enemyId: number) =>
        formations.some((formation) =>
            formation.members.some((member) => member.enemy_id === enemyId && member.pos_y === 1),
        );

    /**
     * 地图 / 敌群：raw 数据里只有 enemy_id，名字与属性一律通过 `enemyById` 反查，
     * 不在地图数据里再存一份敌人信息。
     */
    const mapFloors = computed<RawMapFloor[]>(() => wiki.mapFloors);
    const mapCategories = computed<MapCategory[]>(() => wiki.mapCategories);
    const enemyPools = computed<RawEnemyPool[]>(() => wiki.enemyPools);
    const mapFloorById = computed(() => new Map(mapFloors.value.map((floor) => [floor.id, floor])));
    const enemyPoolById = computed(() => new Map(enemyPools.value.map((pool) => [pool.id, pool])));
    /** 地图分类 id -> 该地图的层（按层 id 升序） */
    const floorsByMap = computed(() => {
        const out = new Map<number, RawMapFloor[]>();
        for (const floor of mapFloors.value) {
            const list = out.get(floor.map_id) ?? [];
            list.push(floor);
            out.set(floor.map_id, list);
        }
        for (const list of out.values()) list.sort((a, b) => a.id - b.id);
        return out;
    });
    /** 层里出现过的敌人（去重后按等级下限排序） */
    const floorEnemyRefs = (floorId: number, notorious = false) => {
        const floor = mapFloorById.value.get(floorId);
        if (!floor) return [];
        return notorious ? floor.notorious_enemies : floor.normal_enemies;
    };

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

    const rangeName = (id: number | null | undefined) => (id == null ? '' : (RANGE_TYPE_NAME[id] ?? `#${id}`));

    /**
     * 通用枚举取名：``Data:Enum.json`` 里任意分组（equipment_type / attribute / target …），
     * 取不到返回 null，由调用方回退成原始数字。
     */
    const enumText = (group: string, id: number | null | undefined): string | null => {
        if (id == null) return null;
        const table = (wiki.enums as unknown as Record<string, Record<string, { name?: string }>>)[group];
        return table?.[String(id)]?.name ?? null;
    };
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
            source: 'wiki:Api/GetV2Character（含 jobs / extra / rates） / GetV2Skill / GetV2Equipment / GetV2Enum（含 kinds）',
            counts: {
                characters: wiki.counts.characters,
                character_groups: new Set(wiki.characters.map((row) => row.group)).size,
                excluded_awakening: 0,
                jobs: wiki.counts.jobs,
                skills: wiki.counts.skills,
                player_skills: wiki.counts.playerSkills,
                equipments: wiki.counts.equipments,
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
            equipments: mapped,
            enemies: mapped,
            maps: mapped,
            enemyPools: mapped,
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

    /** 只重拉 `Api/GetV2Extra`（人工表：效果种类名 / 特典 / 遗物类别…），调试时用 */
    const refreshExtra = async () => {
        await wiki.refreshExtra();
    };

    const ensureManifest = ensureAll;
    const ensureCharacters = ensureAll;
    const ensureJobs = ensureAll;
    const ensureSkills = ensureAll;
    const ensureEquipments = ensureAll;
    const ensureEnemies = ensureAll;
    const ensureMaps = ensureAll;
    const ensureEnemyPools = ensureAll;
    const ensureEffectKinds = ensureAll;

    const getCharacter = async (id: number): Promise<CharacterDetail | null> => characterById.value.get(id) ?? null;

    /** 角色个体出现几率（``Api/GetV2Character`` 顶层 rates） */
    const characterRate = (id: number) => wiki.characterRates[id] ?? null;

    /** 阶级（``CharacterGrade``）：id 升序，1 = 无阶 */
    const grades = computed(() =>
        Object.entries(wiki.enums.grade)
            .map(([key, entry]) => ({ id: Number(key), name: entry.name ?? `#${key}` }))
            .sort((a, b) => a.id - b.id),
    );

    const getSkill = async (identification: number): Promise<SkillDetail | null> =>
        skillById.value.get(identification) ?? null;

    return {
        manifest,
        characters,
        jobs,
        skills,
        /** 装备列表（一条 = 一件装备） */
        equipments,
        /** 敌人列表（一条 = 一个敌人分类，含出现变体） */
        enemies,
        /** 装备类型基准值（baseStat） */
        equipmentBaseStat,
        effectKinds,
        state,
        error,
        fromCache,
        ensureManifest,
        ensureCharacters,
        ensureJobs,
        ensureSkills,
        ensureEquipments,
        ensureEnemies,
        ensureMaps,
        ensureEnemyPools,
        ensureEffectKinds,
        ensureAll,
        refresh,
        refreshExtra,
        getCharacter,
        getSkill,
        characterRate,
        grades,
        characterById,
        jobById,
        skillById,
        enemyById,
        /** 变体 id -> 分类 + 变体（地图 / 敌群用） */
        enemyVariantById,
        /** 地图数据里的变体 id -> 敌人名 */
        enemyNameOf,
        /** 变体 id -> 图鉴分类 id（打开敌人 modal） */
        enemyCategoryIdOf,
        /** 怪物图鉴编号 -> 遗物（敌群 / 地图的遗物列用） */
        relicByMonsterNo,
        /** 敌人变体是否在该组敌群里站第一排 */
        inFrontRow,
        /** 地图：一条 = 一层（DungeonFloor） */
        mapFloors,
        /** 地图分类标签（DungeonSelect） */
        mapCategories,
        /** 敌群：一条 = 一个敌群 */
        enemyPools,
        mapFloorById,
        enemyPoolById,
        floorsByMap,
        floorEnemyRefs,
        /** 体型档位名（1 小型 … 4 特大） */
        enemySizeName,
        /** 强度档位名（0 普通 / 1 强化1 / 2 强化2 / 3 首领 / 4 强敌） */
        enemyKindName,
        equipmentName,
        raceName,
        rangeName,
        enumText,
    };
});
