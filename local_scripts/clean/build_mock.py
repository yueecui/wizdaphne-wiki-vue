"""Round 2: turn the long-key dataset into wiki-API shaped mocks.

The wiki stores short-key JSON (``dbCodec.encodeDoc``) in the ``Data:``
namespace and serves it through ``Api/GetXxx`` as::

    { "items": [...], ... }        （一次全量，没有 page / limit）

This script produces the same payloads locally (no upload, no MediaWiki
required) so the frontend can be developed against DEV mocks:

    CharacterResponse.json    Api/GetV2Character   95 records (roster + stats/talent/skills/voice) + 顶层 jobs/rates
    SkillResponse.json        Api/GetV2Skill       3,031 records (skill fields + description + levels)
    EquipmentResponse.json    Api/GetV2Equipment   839 records (weapon / armor stats + traits)
    ItemResponse.json         Api/GetV2Item        2,684 items + 顶层 relics
    ShopResponse.json         Api/GetV2Shop        122 shops（商品内嵌 items）
    EnemyResponse.json        Api/GetV2Enemy       321 敌人分类（含出现变体与数值公式输入）
    MapResponse.json          Api/GetV2Map         193 层（items）+ 顶层 maps 分类标签
    EnemyPoolResponse.json    Api/GetV2EnemyPool   367 个挂不到层的编队池（敌群页）
    EnumResponse.json         Api/GetV2Enum        {enum}：各分组字典
    ExtraResponse.json        Api/GetV2Extra       人工维护（非解包）的六块，见下
    VersionResponse.json      Api/Version          { version, extra }（extra = 人工表版本）

    JobResponse.json / RelicResponse.json 前端不再请求，只作为上传脚本的输入
    （Data:Job / Data:Relic 数据页仍由 GetV2Character.jobs、GetV2Item.relics 读取）

``ExtraResponse.json`` 把「人工维护、跟解包数据分开更新」的东西集中到一个模块：

    effectKinds       效果种类名 + 参数名（wiki 的 ``Data:EffectKind.json``）
    equipmentBaseStat 装备类型基准值（``Api/GetV2Equipment.baseStat`` 那份抓包备份）
    equipmentExtra    装备特典分类 / 获取途径（wiki 的 ``Data:EquipmentExtra.tabx``）
    relicExtra        遗物掉落怪物 / 推荐类别（``config/Data_遗物酒.xlsx``）
    relicCategory     遗物推荐类别可选项与顺序
    characterExtra    角色卡池组 / 上线日期 / 声优（``config/Data_CharacterExtra.tabx.xlsx``）

``EffectKindResponse.json``（效果种类名的手改表）不在这里生成：那份数据只在 wiki 上
手工维护（``Data:EffectKind.json``），DEV 直接把同名文件放到 ``public/mock``，
本脚本把它读进 ``ExtraResponse.json`` 的 ``effectKinds``。

Compression rules (mirroring ``docs/data-wiki-api-indexeddb.md``):

  * ``num``    0 is omitted (decode defaults to 0)
  * ``str``    "" is omitted (decode defaults to "")
  * ``bool``   only ``true`` is written (here as ``1``; decode = key present)
  * arrays     empty arrays are omitted
  * ``obj``    only written when it has content
  * ``raw``    written as-is (ids, possibly string numbers)

Files are overwritten in place; directories are never removed.

    python local_scripts/clean/build_mock.py
    python local_scripts/clean/build_mock.py --data data --out public/mock
"""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import sys
import time

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import (  # noqa: E402
    EQUIP_API_JSON,
    ROOT,
    WIKI_TABX_DIR,
    as_list,
    character_extra,
    character_rates,
    read_config_json,
    read_wiki_tabx,
    relic_extra,
)

DEFAULT_DATA = os.path.join(ROOT, "data")
DEFAULT_OUT = os.path.join(ROOT, "public", "mock")

# ---------- field specs: (long, short, kind[, value map | nested fields]) ----------

JOB_REF = [("id", "i", "num"), ("get_lv", "l", "num")]
LEARN = [("job", "j", "num"), ("get_lv", "l", "num")]
DISCIPLINE = [("id", "i", "num"), ("level", "l", "num"), ("need_point", "np", "num")]
STATS_POOL = [("base", "b", "num"), ("growth", "g", "num")]
STATS = [
    ("str", "s", "num"), ("int", "i", "num"), ("pie", "p", "num"),
    ("vit", "v", "num"), ("agi", "a", "num"), ("dex", "d", "num"),
    ("luk", "l", "num"), ("hp", "h", "num"), ("mp", "m", "num"), ("sp", "sp", "num"),
]

CHAR_LIST = [
    ("id", "i", "raw"),
    ("group", "g", "num"),
    ("guide_no", "n", "num"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    ("style", "sty", "str"),
    ("default", "d", "bool"),
    # 觉醒版：不进列表，只供角色 modal 的版本切换
    ("hidden", "hd", "bool"),
    ("rarity", "r", "num"),
    ("race", "ra", "num"),
    ("attribute", "at", "num"),
    ("gender", "ge", "num"),
    ("personality", "pe", "num"),
    ("grade", "gr", "num"),
    ("alignment", "al", "num"),
    ("align_point", "ap", "num"),
    ("jobs", "jo", "objArr", [("id", "i", "num"), ("primary", "p", "bool")]),
    ("fate", "fa", "num"),
]

CHAR_DETAIL = [
    ("id", "i", "raw"),
    ("stats", "st", "obj", [
        ("base", "b", "numMap"),
        ("growth", "g", "numMap"),
        ("pools", "p", "map", STATS_POOL),
        ("growth_rate", "r", "objArr", STATS),
    ]),
    ("talent", "ta", "obj", [
        ("id", "i", "num"),
        ("min", "lo", "numMap"),
        ("max", "hi", "numMap"),
    ]),
    ("mental", "me", "num"),
    ("grade", "gr", "num"),
    ("skills", "sk", "obj", [
        ("unique", "u", "numArr"),
        ("inherit", "ih", "numArr"),
        ("potential", "pt", "numArr"),
        ("discipline", "dc", "objArr", DISCIPLINE),
        ("same", "sm", "numArr"),
        ("exclude", "ex", "numArr"),
        ("get_lv", "gl", "num"),
    ]),
    # 潜在继承技能的解锁等级
    ("potential_grade", "pg", "num"),
    ("images", "im", "obj", [
        # 结缘立绘索引（三位数）+ 三张 Fate* 图
        ("image", "i", "str"),
        ("fate_image", "fi", "str"),
        ("fate_chara", "fc", "str"),
        ("fate_face", "ff", "str"),
        # 卡池图：概率UP小图 / 结缘详情大图
        ("gacha_item_banner", "gb", "str"),
        ("legend_character_sale", "gd", "str"),
        ("thumbnail", "t", "str"),
        ("thumbnail_file", "tf", "str"),
        ("thumbnail_dir", "td", "str"),
        # 画廊肖像（今天新增的画廊功能）：肖像大图 / 肖像画（细节版）
        ("portrait", "pr", "str"),
        ("portrait_detail", "pd", "str"),
    ]),
    ("voice", "vo", "obj", [
        ("speech", "s", "str"),
        ("speech_lang", "sl", "str"),
        ("breakup", "b", "str"),
        ("breakup_lang", "bl", "str"),
        ("group", "g", "num"),
    ]),
    # 克己：额外提升的属性标签（同稀有度对比得出，中文）
    ("self_restraint", "sr", "obj", [
        ("id", "i", "num"),
        ("extra_tags", "t", "strArr"),
    ]),
    # 营地 / 酒馆对话：同一角色的各风格版本共用一份（酒馆只留议题 + 答案顺序 1..3）
    ("dialogue", "dg", "obj", [
        ("camp", "c", "objArr", [("question", "q", "str"), ("answer", "a", "str")]),
        ("tavern", "t", "objArr", [("topic", "k", "str"), ("order", "o", "num")]),
    ]),
]

JOB = [
    ("id", "i", "raw"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    ("abbreviation", "ab", "str"),
    ("display_order", "o", "num"),
    ("category", "c", "str"),
    ("alignment", "al", "numArr"),
    ("base", "b", "numMap"),
    ("growth", "g", "numMap"),
    ("multipliers", "m", "numMap"),
    ("skills", "sk", "objArr", JOB_REF),
    ("skill_variants", "sv", "objArrMap", JOB_REF),
    ("skill_count", "sc", "num"),
    ("characters", "ch", "obj", [
        ("primary", "pr", "numArr"),
        ("changeable", "cd", "numArr"),
    ]),
    ("change_items", "ci", "objArr", [
        ("item", "i", "num"),
        ("quantity", "q", "num"),
        ("group", "g", "num"),
    ]),
]

#: 召唤：被召唤出来的敌人分类 + 等级 + 数量（来自 ``EnemyFriendLayout``）
SKILL_SUMMON = [
    ("category", "c", "num"),
    ("level", "lv", "num"),
    ("count", "n", "num"),
]

SKILL_LIST = [
    ("id", "i", "raw"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    ("kind", "k", "num"),
    ("max_level", "ml", "num"),
    ("passive", "p", "bool"),
    ("player", "pl", "bool"),
    ("test", "t", "bool"),
    ("level0", "l0", "bool"),
    ("sources", "s", "strArr"),
    ("jobs", "j", "numArr"),
    ("summons", "sm", "objArr", SKILL_SUMMON),
]

DAMAGE = [
    ("attack_rate", "ar", "num"),
    ("attack_rate_both_hands", "a2", "num"),
    ("add_damage_rate", "ad", "num"),
    ("add_critical_rate", "cr", "num"),
    ("valid_cap_parameter_value", "vc", "num"),
    ("valid_cap_parameter_value_both_hands", "v2", "num"),
    ("valid_start_parameter_value", "vs", "num"),
    ("attack_type", "at", "num"),
    ("reference_parameter", "rf", "num"),
    ("reference_parameter_2", "r2", "num"),
    ("damage_type", "dt", "num"),
    ("aptitude_ids", "ap", "numArr"),
    ("fixed_damage", "fd", "num"),
    ("hit_rate", "hr", "num"),
    ("damage_count", "dc", "num"),
    ("only_once", "oo", "bool"),
    ("target", "tg", "num"),
]

# 被引用的 sub effect 的摘要（child_sub_effect_ids / extension_params 展开用）
SUB_BRIEF_LEAF = [
    ("id", "i", "num"),
    ("kind", "k", "num"),
    ("kind_name", "kn", "str"),
    ("params", "p", "numArr"),
    ("strength", "s", "num"),
    ("turn", "t", "num"),
    ("target", "g", "num"),
    ("target_text", "gt", "str"),
    # 效果量（恢复量）
    ("calc_reference_parameter", "cp", "num"),
    ("calc_reference_parameter_2", "c2", "num"),
    ("calc_reference_parameter_rate", "cq", "num"),
    ("calc_reference_parameter_rate_2", "c3", "num"),
    ("calc_valid_cap_parameter_value", "cc", "num"),
    ("calc_valid_start_parameter_value", "cv", "num"),
]

SUB_BRIEF = SUB_BRIEF_LEAF + [("children", "cs", "objArr", SUB_BRIEF_LEAF)]

# kind 2790「敵のバフ数によってStepReplace」：step（敌人 buff 数量档）-> 实际效果组
STEP_REPLACE = [
    ("step", "s", "num"),
    ("effect_group", "g", "num"),
    ("effects", "e", "objArr", SUB_BRIEF_LEAF),
]

SUB_EFFECT = [
    ("kind", "k", "num"),
    ("params", "p", "numArr"),
    ("strength", "s", "num"),
    ("turn", "t", "num"),
    ("target", "g", "num"),
    ("from", "f", "str", {"damage": "d", "effect_group": "g", "attack_start": "a"}),
    ("reference_parameter", "rp", "num"),
    ("reference_parameter_rate", "rr", "num"),
    ("abnormal_valid_start_parameter_value", "as", "num"),
    ("abnormal_valid_cap_parameter_value", "ac", "num"),
    ("force_apply", "fa", "bool"),
    ("is_ignore_resist", "ir", "bool"),
    ("calc_reference_parameter", "cp", "num"),
    ("calc_reference_parameter_2", "c2", "num"),
    ("calc_reference_parameter_rate", "cq", "num"),
    ("calc_reference_parameter_rate_2", "c3", "num"),
    ("calc_valid_cap_parameter_value", "cc", "num"),
    ("calc_valid_start_parameter_value", "cv", "num"),
    ("reference_resist", "rs", "num"),
    ("child_sub_effect_ids", "ch", "numArr"),
    ("target_race_ids", "tr", "numArr"),
    ("extension_params", "xp", "numArr"),
    ("child_sub_effects", "cs", "objArr", SUB_BRIEF),
    ("extension_effects", "xe", "objArr", SUB_BRIEF),
    # 参数里指向的效果（参数序号 -> 摘要），前端按缩进行显示
    ("param_refs", "pr", "map", SUB_BRIEF),
    # kind 2790：按敌人 buff 数量档替换的效果组
    ("step_replace", "sx", "objArr", STEP_REPLACE),
]

LEVEL = [
    ("level", "l", "num"),
    ("cost", "c", "num"),
    ("cost_kind", "ck", "num"),
    ("use_timing", "ut", "num"),
    ("use_limit", "ul", "num"),
    ("hate", "ht", "num"),
    ("range_type", "rt", "num"),
    ("skill_condition_ids", "cd", "numArr"),
    ("description", "d", "str"),
    ("description_lang", "dl", "str"),
    ("name", "nm", "str"),
    ("name_lang", "nl", "str"),
    ("damage", "dm", "objArr", DAMAGE),
    ("sub_effects", "sb", "objArr", SUB_EFFECT),
]

SKILL_DETAIL = [
    ("id", "i", "raw"),
    ("description", "d", "str"),
    ("detail_description", "d2", "str"),
    ("description_lang", "dl", "str"),
    ("job_limited", "jl", "numArr"),
    ("equipment_limited", "el", "numArr"),
    ("tags", "tg", "numArr"),
    ("learn", "ln", "objArr", LEARN),
    ("levels", "lv", "objArr", LEVEL),
]


#: 装备特性：只带技能 identification + 引用等级（名字与说明由前端查技能数据），
#: 解包 Skill 表里找不到的纯 lock config 特性才带名字
EQUIP_REF = [
    ("id", "i", "num"),
    ("level", "l", "num"),
    ("name", "zh", "str"),
    # 手写的展示型特性说明（lock config，游戏里没有这段文本）
    ("desc", "d", "str"),
]

EQUIP_STAT = [
    ("atk", "at", "num"), ("c", "c", "num"), ("mag", "mg", "num"), ("div", "dv", "num"),
    ("def", "df", "num"), ("mdef", "md", "num"), ("spe", "sp", "num"), ("acc", "ac", "num"),
    ("sur", "sr", "num"), ("eva", "ev", "num"), ("res", "rs", "num"),
    # 探索系（装备自身属性，也随强化成长）：探知 / 陷阱解除 / 陷阱回避
    ("det", "dt", "num"), ("dtrap", "dp", "num"), ("etrap", "et", "num"),
]

#: 强化曲线的一行：等级 + 该等级的完整数值（缺失的 num 在解码时补 0）
EQUIP_LEVEL = [("lv", "l", "num")] + EQUIP_STAT

#: 材质补强（合材补强）的一行：目标阶级 / 阶级内次数 / 金币 / 五项累计加成
#: 武器只加攻击 / 魔力 / 神力，防具只加防御 / 法术防御
EQUIP_OVER_RANK = [
    ("rank", "r", "num"),
    ("level", "l", "num"),
    ("cost", "co", "num"),
    ("atk", "at", "num"),
    ("mag", "mg", "num"),
    ("div", "dv", "num"),
    ("def", "df", "num"),
    ("mdef", "md", "num"),
]
EQUIP_SET = [
    ("id", "i", "num"),
    ("skill_id", "si", "num"),
    ("skill_name", "sn", "str"),
    ("require_count", "rc", "num"),
    ("max_level", "ml", "num"),
    ("add_skill_level", "al", "num"),
]
#: 商店来源（来自 shop.py 清洗后的店铺，不含限时商店）
EQUIP_SHOP = [
    ("shop_name", "sn", "str"),
    ("price", "p", "num"),
    ("currency_name", "cn", "str"),
]

# ---------- 遗物（Relic） ----------

#: 掉落怪物（手工数据补充后才有值）
RELIC_MONSTER = [
    ("id", "i", "num"),
    ("name", "n", "str"),
]
RELIC = [
    ("id", "i", "raw"),
    ("name", "zh", "str"),
    # 遗物酒名
    ("brew", "b", "str"),
    # 遗物之力（技能名）与技能 identification
    ("power", "p", "str"),
    ("skill_id", "sk", "num"),
    # 性格：善 / 中立 / 恶
    ("align", "a", "str"),
    ("grade", "g", "num"),
    ("icon", "ic", "str"),
    # 提升 / 降低属性
    ("inc", "u", "strArr"),
    ("dec", "d", "strArr"),
    # 掉落怪物 / 推荐类别：`relic.py` 不填，手工数据走顶层 `relics_extra`
    # （这里的字段留给以后把数据直接并进遗物行的场景）
    ("monsters", "m", "objArr", RELIC_MONSTER),
    ("categories", "c", "strArr"),
]
EQUIPMENT = [
    ("id", "i", "raw"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    ("category", "c", "str"),
    ("type_id", "ti", "num"),
    ("type", "ty", "str"),
    ("part", "pt", "num"),
    ("rank", "r", "num"),
    # 图鉴编号；特殊装备（display_type 2）为 "EX"
    ("collection_id", "ci", "raw"),
    ("element", "el", "num"),
    ("element_name", "eln", "str"),
    ("special", "sp", "bool"),
    ("note", "nt", "str"),
    # 图标资源名（list_icon = 列表小图，icon = 背包大图，均不含 .png）
    ("list_icon", "li", "str"),
    ("icon", "ic", "str"),
    # 特典分类 / 获取途径已搬到 ``Api/GetV2Extra.equipmentExtra``，这里不再输出；
    # desc 中文说明 / req 装备需求仍是占位，妖精相关来自解包
    ("desc", "d", "str"),
    ("req", "rq", "strArr"),
    ("fa_can", "fc", "num"),
    ("fa_sk", "fs", "str"),
    # 妖精技能描述
    ("fa_sk_desc", "fd", "str"),
    # 装备条件：职业限制（Job.id）/ 种族限制（CharacterSpecies.id），空 = 无限制
    ("job_limited", "jl", "numArr"),
    ("race_limited", "rl", "numArr"),
    ("reinforce_max", "rm", "num"),
    # 0 级数值 + 满强化推算
    ("stats", "st", "obj", EQUIP_STAT),
    ("max_stats", "mx", "obj", EQUIP_STAT),
    ("skills", "sk", "objArr", EQUIP_REF),
    ("traits", "tr", "objArr", EQUIP_REF),
    ("set_skills", "ss", "objArr", EQUIP_SET),
    # 强化曲线（每级完整数值，只输出与 +0 不同的等级）与加护概率（4 槽 × 19 属性）
    ("levels", "lv", "objArr", EQUIP_LEVEL),
    ("bonus", "bn", "numArrArr"),
    # 材质补强（低于最高阶级时可继续提升，空数组 = 不能补强）
    ("over_rank", "or", "objArr", EQUIP_OVER_RANK),
    # 商店来源（商店名 / 价格 / 货币名；空数组 = 商店买不到）
    ("shop", "sh", "objArr", EQUIP_SHOP),
]

# ---------- 道具（Item） ----------

ITEM_SHOP = [
    ("shop_name", "sn", "str"),
    ("shop_kind", "k", "num"),
    ("price", "p", "num"),
    ("currency", "cu", "num"),
    ("currency_name", "cn", "str"),
    ("quantity", "q", "num"),
    ("limit_kind", "lk", "num"),
    ("limit_num", "ln", "num"),
    ("repeat", "rp", "bool"),
    ("condition", "cd", "num"),
    ("town", "t", "num"),
    ("point_shop_id", "ps", "num"),
]

ITEM_FISHING = [
    ("volume", "vo", "num"),
    ("duration", "du", "num"),
    ("min_meet", "mn", "num"),
    ("max_meet", "mx", "num"),
    ("min_success", "ms", "num"),
    ("max_success", "xs", "num"),
]

ITEM_RELIC = [
    ("grade", "g", "num"),
    ("rank", "r", "num"),
    ("alignment", "al", "num"),
    ("skill_id", "si", "num"),
]

ITEM_SKILL = [("kind", "kd", "str"), ("id", "i", "num"), ("name", "n", "str")]

#: 图鉴条目引用（只有部分道具进图鉴）：条目 id + 编号，说明 / 售价归图鉴模块
ITEM_COLLECTION = [
    ("id", "i", "num"),
    ("no", "n", "num"),
]

ITEM = [
    ("id", "i", "raw"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    ("type", "ty", "str"),
    ("category", "c", "str"),
    ("desc", "d", "str"),
    ("desc_lang", "dl", "str"),
    ("icon", "ic", "str"),
    ("list_icon", "li", "str"),
    # 卖价（商店买价见 shop）
    ("value", "v", "num"),
    ("sort_id", "so", "num"),
    ("use_skill", "sk", "obj", ITEM_SKILL),
    ("shop", "sh", "objArr", ITEM_SHOP),
    ("fishing", "fi", "obj", ITEM_FISHING),
    ("relic", "re", "obj", ITEM_RELIC),
    # 图鉴：出售 / 消耗品 / 贵重品 / 其他（只有进图鉴的道具有值）
    ("collection_group", "cg", "str"),
    ("collection", "col", "obj", ITEM_COLLECTION),
    # 杂物二级分类：角色抽卡 / 装备抽卡 / 未分类（只有 Item::Junk 有值）
    ("junk_group", "jg", "str"),
]

# ---------- 商店（Shop） ----------

SHOP_ITEM = [
    ("shop_id", "si", "num"),
    ("name", "n", "str"),
    ("content_type", "ct", "str"),
    ("content_id", "ci", "num"),
    # 装备商品的 identification（content_id 是档位行 id，点开装备弹窗要用它）
    ("content_ident", "ce", "num"),
    ("icon", "ic", "str"),
    ("price", "p", "num"),
    ("currency", "cu", "num"),
    ("currency_name", "cn", "str"),
    ("quantity", "q", "num"),
    ("limit_kind", "lk", "num"),
    ("limit_num", "ln", "num"),
    ("repeat", "rp", "bool"),
    ("condition", "cd", "num"),
]

SHOP = [
    ("id", "i", "raw"),
    ("key", "k", "str"),
    ("group", "gp", "num"),
    ("group_name", "gn", "str"),
    ("kind", "kd", "num"),
    ("kind_name", "kn", "str"),
    ("town", "t", "num"),
    ("town_name", "tn", "str"),
    ("point_shop_id", "ps", "num"),
    ("point_shop_name", "pn", "str"),
    ("point_id", "pi", "num"),
    ("point_name", "pt", "str"),
    ("start_at", "sa", "num"),
    ("end_at", "ea", "num"),
    ("name", "zh", "str"),
    ("count", "c", "num"),
    ("items", "it", "objArr", SHOP_ITEM),
]

# ---------- 敌人（Enemy） ----------

#: 数值块：base / growth / correction（修正率，100 = 原值）+ HP 浮动上下限（百分数）
ENEMY_STAT = [
    ("base", "b", "num"),
    ("growth", "g", "num"),
    ("correction", "cr", "num"),
    ("min", "lo", "num"),
    ("max", "hi", "num"),
]

#: 冻结 / 破冰：半冻结 / 完全冻结 / 破冰所需层数 + 自然回复 + 待机浮动
ENEMY_FREEZE = [
    ("half", "h", "num"),
    ("full", "f", "num"),
    ("break", "b", "num"),
    ("recovery", "r", "num"),
    ("wait_min", "wm", "num"),
    ("wait_max", "wx", "num"),
    ("intelligence", "iq", "num"),
]

#: 体型统计（同一分类下可能出现多种 body_size）
ENEMY_BODY = [
    ("size", "s", "numArr"),
    ("count", "c", "num"),
]

#: AI 技能池里的一行：技能 + 随机权重 + 选目标的条件文案（默认值已过滤掉）
ENEMY_AI_SKILL = [
    ("skill", "s", "num"),
    ("weight", "w", "num"),
    ("target", "t", "str"),
]

#: 一条条件：要么是整段文案，要么是「前缀 + 敌人分类 id / 子效果种类 id + 后缀」
#: （敌人分类前端做成链接，子效果种类换成状态名）
ENEMY_AI_CONDITION = [
    ("text", "t", "str"),
    ("label", "l", "str"),
    ("ref", "r", "num"),
    ("status", "k", "num"),
    ("suffix", "x", "str"),
]

#: AI 行动规则的一行 = 一条「条件成立 → 用这个技能池」（condition 已翻成文案）
ENEMY_AI_RULE = [
    ("priority", "p", "num"),
    ("conditions", "c", "objArr", ENEMY_AI_CONDITION),
    ("skills", "s", "objArr", ENEMY_AI_SKILL),
]

#: 一个出现变体：参数 id + 等级区间 + 技能 + 该变体的完整数值
ENEMY_VARIANT = [
    ("id", "i", "raw"),
    ("kind", "k", "num"),
    ("param", "p", "raw"),
    ("exp", "e", "num"),
    ("ai", "ai", "num"),
    ("level", "lv", "numArr"),
    ("attribute", "at", "numArr"),
    ("attack_attribute", "aa", "numArr"),
    ("weak", "wk", "numArr"),
    ("characteristics", "ch", "numArr"),
    ("gimmicks", "gm", "numArr"),
    ("fly", "f", "bool"),
    ("body_size", "bs", "numArr"),
    # 全部技能（行动 + 插入 + 被动 + 挣扎）与分栏明细
    ("skills", "sk", "numArr"),
    # 引用到的技能等级（identification -> level），只有多级技能的非 0 等级才记
    ("skill_levels", "sl", "numMap"),
    ("action_skills", "ak", "numArr"),
    # 插入技能：一次标记 + HP 触发阈值 + 触发条件文案（与 AI 行动规则同一套结构）
    ("interrupts", "ir", "objArr", [
        ("skill", "s", "num"),
        ("once", "o", "bool"),
        ("hp", "hp", "num"),
        ("conditions", "c", "objArr", ENEMY_AI_CONDITION),
    ]),
    ("passive_skills", "pk", "numArr"),
    ("struggle_skill", "sg", "num"),
    # AI 行动规则：priority 升序，条件成立就用该技能池
    ("ai_plan", "ap", "objArr", ENEMY_AI_RULE),
    # 数值：键是属性名（hp / attack / …），值是 {base, growth, correction, min, max}
    ("stats", "st", "map", ENEMY_STAT),
    ("resist", "rs", "numMap"),
    ("freeze", "fz", "obj", ENEMY_FREEZE),
]

#: 一条 = 一个 EnemyCategory（图鉴条目 + 只在解包数据里存在的分类）
ENEMY = [
    ("id", "i", "raw"),
    # 图鉴编号 / 图鉴条目 id；没有图鉴记录的分类为空
    ("no", "n", "num"),
    ("book", "bk", "raw"),
    ("name", "zh", "str"),
    ("name_jp", "jp", "str"),
    ("name_en", "en", "str"),
    # wiki 上的缩略图去掉 `_s.png` 后缀，例如 tmb_enemy_090_005_00
    ("thumbnail", "th", "str"),
    ("boss", "b", "bool"),
    ("race", "ra", "num"),
    ("lineage", "li", "num"),
    # 体型档位（1 小 / 2 中 / 3 大 / 4 特大），与 body_size 的像素尺寸不同
    ("size", "sz", "num"),
    ("attack_type", "at", "num"),
    ("damage_type", "dt", "num"),
    ("attribute", "ar", "numArr"),
    ("attack_attribute", "aa", "numArr"),
    ("weak", "wk", "numArr"),
    ("characteristics", "ch", "numArr"),
    ("gimmicks", "gm", "numArr"),
    # 出现的强度档位（kind）
    ("kinds", "ks", "numArr"),
    ("level", "lv", "obj", [("min", "lo", "num"), ("max", "hi", "num")]),
    ("fly", "f", "bool"),
    ("body_size", "bs", "objArr", ENEMY_BODY),
    ("resist", "rs", "numMap"),
    ("freeze", "fz", "obj", ENEMY_FREEZE),
    ("skills", "sk", "numArr"),
    ("variants", "v", "objArr", ENEMY_VARIANT),
]

# ---------- 地图（层为单位） / 敌群（挂不到层的编队池） ----------

#: 层里出现过的敌人：只留 id 与等级范围，名称 / 属性由敌人模块提供
MAP_ENEMY = [
    ("enemy_id", "i", "num"),
    ("lv_min", "lo", "num"),
    ("lv_max", "hi", "num"),
    ("rows", "r", "num"),
]

#: 编队成员：同样只引用 enemy_id
MAP_MEMBER = [
    ("enemy_id", "i", "num"),
    ("lv_min", "lo", "num"),
    ("lv_max", "hi", "num"),
    ("pos_x", "px", "num"),
    ("pos_y", "py", "num"),
    ("notorious", "no", "bool"),
    ("wanted", "wa", "bool"),
    ("hate", "ha", "bool"),
]

MAP_FORMATION = [
    ("formation_id", "i", "num"),
    ("row_id", "r", "num"),
    ("layout_id", "l", "num"),
    ("weight", "w", "num"),
    ("lv_min", "lo", "num"),
    ("lv_max", "hi", "num"),
    ("escape", "e", "num"),
    ("surprise", "s", "num"),
    ("preemption", "p", "num"),
    ("exp_rate", "x", "num"),
    ("drop_id", "d", "num"),
    ("special_drop_id", "sd", "num"),
    ("drop_probability", "dp", "num"),
    ("trap_id", "t", "num"),
    ("rare_trap_id", "rt", "num"),
    ("condition_id", "c", "num"),
    ("respawn_kind", "rk", "num"),
    ("symbol_id", "si", "num"),
    ("symbol_kind", "sk", "num"),
    ("grade_id", "g", "num"),
    ("friend_prob", "fp", "num"),
    ("covert", "cv", "num"),
    ("win_condition", "wc", "num"),
    ("members", "m", "objArr", MAP_MEMBER),
]

MAP = [
    ("id", "i", "raw"),
    ("name", "n", "str"),
    ("map_id", "mi", "num"),
    ("map_name", "mn", "str"),
    ("area_id", "a", "num"),
    ("scene_name", "sc", "str"),
    ("ceiling", "c", "bool"),
    ("floor_attribute", "fa", "num"),
    ("enemy_placement", "ep", "numArr"),
    ("bgm", "bg", "str"),
    ("normal_enemies", "ne", "objArr", MAP_ENEMY),
    ("notorious_enemies", "sn", "objArr", MAP_ENEMY),
    ("formations", "f", "objArr", MAP_FORMATION),
]

POOL_FLOOR = [
    ("id", "i", "num"),
    ("name", "n", "str"),
    ("map_name", "mn", "str"),
]

ENEMY_POOL = [
    ("id", "i", "num"),
    ("row_count", "rc", "num"),
    ("lv_ranges", "lr", "numArrArr"),
    ("normal_enemies", "ne", "objArr", MAP_ENEMY),
    ("notorious_enemies", "sn", "objArr", MAP_ENEMY),
    ("floors", "fl", "objArr", POOL_FLOOR),
    ("formations", "f", "objArr", MAP_FORMATION),
]

#: list + detail fields merged (``id`` / ``grade`` are already in the list part;
#: ``style`` uses ``sty`` because ``st`` is taken by ``stats``)
CHAR = CHAR_LIST + [spec for spec in CHAR_DETAIL if spec[0] not in ("id", "grade")]
SKILL = SKILL_LIST + [spec for spec in SKILL_DETAIL if spec[0] != "id"]


def read_json(path: str):
    with open(path, encoding="utf8") as fh:
        return json.load(fh)


def write_json(path: str, data) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf8") as fh:
        json.dump(data, fh, ensure_ascii=False, separators=(",", ":"))


def encode_doc(src: dict, fields: list) -> dict:
    """Long-key dict -> short-key dict (see module docstring for the rules)."""
    out: dict = {}
    for spec in fields:
        long, short, kind = spec[0], spec[1], spec[2]
        if long not in src:
            continue
        value = src[long]
        if value is None:
            continue

        if kind == "num":
            if value == 0:
                continue
            out[short] = value

        elif kind == "raw":
            out[short] = value

        elif kind == "str":
            if value == "":
                continue
            if len(spec) > 3 and isinstance(spec[3], dict):
                value = spec[3].get(value, value)
            out[short] = value

        elif kind == "bool":
            if value:
                out[short] = 1

        elif kind in ("numArr", "strArr"):
            if value:
                out[short] = value

        elif kind == "numArrArr":
            # 二维数字数组（加护概率 4 槽 × 19 属性），0 有含义，必须保留
            if value:
                out[short] = [list(row) for row in value]

        elif kind == "numMap":
            nested = {k: v for k, v in (value or {}).items() if v not in (0, None)}
            if nested:
                out[short] = nested

        elif kind == "obj":
            nested = encode_doc(value, spec[3])
            if nested:
                out[short] = nested

        elif kind == "map":
            # {"hp": {base, growth}} -> {"hp": {"b": .., "g": ..}}
            nested = {}
            for key, item in (value or {}).items():
                if not isinstance(item, dict):
                    continue
                encoded = encode_doc(item, spec[3])
                if encoded:
                    nested[key] = encoded
            if nested:
                out[short] = nested

        elif kind == "objArr":
            nested = [encode_doc(item, spec[3]) for item in value or []]
            nested = [item for item in nested if item]
            if nested:
                out[short] = nested

        elif kind == "objArrMap":
            nested = {}
            for key, rows in (value or {}).items():
                encoded = [encode_doc(item, spec[3]) for item in rows or []]
                encoded = [item for item in encoded if item]
                if encoded:
                    nested[key] = encoded
            if nested:
                out[short] = nested

        else:  # pragma: no cover - defensive
            raise ValueError(f"unknown kind {kind!r} for {long}")

    return out


def decode_doc(src: dict, fields: list) -> dict:
    """Short-key dict -> long-key dict (the counterpart used by the frontend)."""
    out: dict = {}
    for spec in fields:
        long, short, kind = spec[0], spec[1], spec[2]
        raw = src.get(short)

        if kind == "num":
            out[long] = raw if raw is not None else 0
        elif kind == "raw":
            if raw is not None:
                out[long] = raw
        elif kind == "str":
            value = raw if raw is not None else ""
            if len(spec) > 3 and isinstance(spec[3], dict):
                value = {v: k for k, v in spec[3].items()}.get(value, value)
            out[long] = value
        elif kind == "bool":
            out[long] = bool(raw)
        elif kind in ("numArr", "strArr"):
            out[long] = raw or []
        elif kind == "numArrArr":
            out[long] = [list(row) for row in (raw or [])]
        elif kind == "numMap":
            out[long] = dict(raw or {})
        elif kind == "obj":
            out[long] = decode_doc(raw or {}, spec[3])
        elif kind == "map":
            out[long] = {k: decode_doc(v or {}, spec[3]) for k, v in (raw or {}).items()}
        elif kind == "objArr":
            out[long] = [decode_doc(item, spec[3]) for item in raw or []]
        elif kind == "objArrMap":
            out[long] = {k: [decode_doc(item, spec[3]) for item in rows]
                         for k, rows in (raw or {}).items()}
        else:  # pragma: no cover - defensive
            raise ValueError(f"unknown kind {kind!r} for {long}")

    return out


def verify(encoded: list[dict], fields: list, label: str) -> None:
    """encode -> decode -> encode must be a fixed point."""
    for index, doc in enumerate(encoded):
        again = encode_doc(decode_doc(doc, fields), fields)
        if again != doc:
            raise AssertionError(f"{label}[{index}] is not round-trip stable: {doc} != {again}")


def check_specs() -> None:
    """Merged specs must not reuse a short key (a later field would win silently)."""
    for label, spec in (("CHAR", CHAR), ("SKILL", SKILL), ("JOB", JOB),
                        ("EQUIPMENT", EQUIPMENT), ("ITEM", ITEM), ("SHOP", SHOP)):
        seen: dict[str, str] = {}
        for item in spec:
            long, short = item[0], item[1]
            if short in seen:
                raise ValueError(f"{label}: short key {short!r} used by {seen[short]!r} and {long!r}")
            seen[short] = long


def wrap(items: list) -> dict:
    """接口形状：一次全量返回（线上 Lua 已去掉 page / limit，`count` 仅用于日志）。"""
    return {"items": items, "count": len(items)}


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--data", default=DEFAULT_DATA)
    ap.add_argument("--out", default=DEFAULT_OUT)
    args = ap.parse_args(argv)

    data = args.data
    check_specs()

    characters = read_json(os.path.join(data, "characters.json"))
    jobs = read_json(os.path.join(data, "jobs.json"))
    skills = read_json(os.path.join(data, "skills.json"))
    equipments = read_json(os.path.join(data, "equipments.json"))
    try:
        items = read_json(os.path.join(data, "items.json"))
    except FileNotFoundError:      # item.py 没跑过时跳过道具模块
        items = []
    try:
        shops = read_json(os.path.join(data, "shops.json"))
    except FileNotFoundError:      # shop.py 没跑过时跳过商店模块
        shops = []
    try:
        relics = read_json(os.path.join(data, "relics.json"))
    except FileNotFoundError:      # relic.py 没跑过时跳过遗物模块
        relics = []
    try:
        enemies = read_json(os.path.join(data, "enemies.json"))
    except FileNotFoundError:      # enemy.py 没跑过时跳过敌人模块
        enemies = []
    effect_kinds = read_json(os.path.join(data, "effect_kinds.json"))
    enums = read_json(os.path.join(data, "enums.json"))
    try:
        map_data = read_json(os.path.join(data, "map.json"))
    except FileNotFoundError:      # build_map.py 没跑过时跳过地图模块
        map_data = {"maps": [], "floors": []}
    try:
        pool_data = read_json(os.path.join(data, "enemyPool.json"))
    except FileNotFoundError:      # build_map.py 没跑过时跳过敌群模块
        pool_data = {"pools": []}

    char_rows = [encode_doc(row, CHAR) for row in characters]
    job_rows = [encode_doc(row, JOB) for row in jobs]
    skill_rows = [encode_doc(row, SKILL) for row in skills]
    equip_rows = [encode_doc(row, EQUIPMENT) for row in equipments]
    item_rows = [encode_doc(row, ITEM) for row in items]
    shop_rows = [encode_doc(row, SHOP) for row in shops]
    relic_rows = [encode_doc(row, RELIC) for row in relics]
    enemy_rows = [encode_doc(row, ENEMY) for row in enemies]
    map_rows = [encode_doc(row, MAP) for row in map_data.get("floors", [])]
    pool_rows = [encode_doc(row, ENEMY_POOL) for row in pool_data.get("pools", [])]

    verify(char_rows, CHAR, "Character")
    verify(job_rows, JOB, "Job")
    verify(skill_rows, SKILL, "Skill")
    verify(equip_rows, EQUIPMENT, "Equipment")
    verify(item_rows, ITEM, "Item")
    verify(shop_rows, SHOP, "Shop")
    verify(relic_rows, RELIC, "Relic")
    verify(enemy_rows, ENEMY, "Enemy")
    verify(map_rows, MAP, "Map")
    verify(pool_rows, ENEMY_POOL, "EnemyPool")

    # 手工补充数据（config/Data_CharacterExtra.tabx.xlsx）放在 payload 顶层 `extra`：
    # 长键、不压缩，前端导入时按 id 合并，不进 items
    char_extra = [
        {
            "index": sup.get("index"),
            "group": sup.get("pool_group"),
            "character_voice": sup.get("character_voice"),
            "release_date": sup.get("release_date"),
            # 概率UP立绘编号（线上是 "2;18;28;40" 字符串，这里统一成数组）
            "banner": sup.get("banner") or [],
            "id": cid,
        }
        for cid, sup in character_extra().items()
    ]
    char_extra.sort(key=lambda row: row["index"] or 0, reverse=True)

    # 遗物手工数据（config/Data_遗物酒.tabx.xlsx）同样放顶层：
    # ``relics_extra`` 按遗物的物品图鉴编号给掉落怪物 / 推荐类别，``relics_ccate`` 是类别可选项
    relic_extra_rows, relic_categories = relic_extra()

    # 个体几率同样放在顶层：备份数据以「日文名 - 日文风格」为键，这里换成角色 id
    key_to_id = {}
    for c in characters:
        jp = c.get("style_jp")
        key = c.get("name_jp") or ""
        if jp and jp != "基本":
            key = f"{key} - {jp}"
        key_to_id[key] = c.get("id")
    rates_by_id = {}
    for row in character_rates():
        cid = key_to_id.get(row.get("name"))
        if cid is not None:
            rates_by_id[cid] = {**row, "id": cid}
    char_rates = [rates_by_id[c["id"]] for c in characters if c["id"] in rates_by_id]

    # 效果种类名表：线上由 ``Data:EffectKind.json`` 手工维护（``Api/GetV2Enum`` 的 ``kinds``），
    # DEV 读同目录下手工维护的 ``EffectKindResponse.json``（本脚本只读不写）。
    # 生成的数据里 kind 只有结构（id / count / params），名字全靠这张表。
    kind_names_file = os.path.join(args.out, "EffectKindResponse.json")
    if os.path.isfile(kind_names_file):
        raw_kinds = read_json(kind_names_file)
        kind_names = (raw_kinds.get("items") or [{}])[0] if isinstance(raw_kinds, dict) else raw_kinds
    else:
        kind_names = effect_kinds

    # 抓包备份（``config/EquipmentApi.json``）：装备基准值 + 特典分类 / 获取途径
    equip_api = read_config_json(EQUIP_API_JSON) or {}
    # ``equipmentExtra`` 优先用线上快照（fetchWikiExtras.ts 拉下的
    # ``Data:EquipmentExtra.tabx``），与 wiki 一致；没拉过时回退抓包备份。
    wiki_equip_extra = os.path.join(WIKI_TABX_DIR, "Data_EquipmentExtra.tabx.json")
    if os.path.isfile(wiki_equip_extra):
        equipment_extra_rows = []
        for row in read_wiki_tabx(wiki_equip_extra):
            eid = row.get("id")
            if eid is None:
                continue
            sou = as_list(row.get("sou"))
            equipment_extra_rows.append(
                {"id": int(eid), "soucate": row.get("soucate") or 0,
                 "sou": [str(s) for s in sou if s]}
            )
        equipmentExtra = equipment_extra_rows
    else:
        equipmentExtra = equip_api.get("extra") or []
    # 人工维护的那六块：整包算个指纹当版本号，内容不变就不会让前端重拉
    extra_payload = {
        "effectKinds": kind_names,
        "equipmentBaseStat": equip_api.get("baseStat") or {},
        "equipmentExtra": equipmentExtra,
        "relicExtra": relic_extra_rows,
        "relicCategory": relic_categories,
        "characterExtra": char_extra,
    }
    extra_version = int(
        hashlib.md5(json.dumps(extra_payload, ensure_ascii=False, sort_keys=True).encode("utf-8")).hexdigest()[:8],
        16,
    )

    payloads = {
        # 数据量小的类并到大一类的顶层（线上 Lua 同样形状）：Character 带 jobs，
        # Item 带 relics，少开 Api/GetV2Job / Api/GetV2Relic 两个模块
        "CharacterResponse.json": {
            **wrap(char_rows),
            "jobs": job_rows,
            "rates": char_rates,
        },
        "SkillResponse.json": wrap(skill_rows),
        "ItemResponse.json": {
            **wrap(item_rows),
            "relics": relic_rows,
        },
        "ShopResponse.json": wrap(shop_rows),
        "EnemyResponse.json": wrap(enemy_rows),
        # 地图以「层」为条目，顶层 `maps` 只是分类标签
        "MapResponse.json": {**wrap(map_rows), "maps": map_data.get("maps", [])},
        "EnemyPoolResponse.json": wrap(pool_rows),
        # 下面两个前端不再请求，仅作为上传脚本的输入（Data:Job / Data:Relic 数据页仍由
        # Api/GetV2Character.jobs 与 Api/GetV2Item.relics 读取）
        "JobResponse.json": wrap(job_rows),
        "RelicResponse.json": wrap(relic_rows),
        # 加护概率已并入每件装备的 ``bn``，基准值 / 特典分类搬到 Extra
        "EquipmentResponse.json": wrap(equip_rows),
        # ``enum.effect_kind`` 只有结构，名字由 Extra 的 ``effectKinds`` 覆盖
        "EnumResponse.json": {"enum": {**enums, "effect_kind": effect_kinds}},
        # 人工维护（非解包）的数据全在这一个模块里，有独立版本号
        "ExtraResponse.json": extra_payload,
        # ``version`` 解包数据 / ``extra`` 人工表，各比各的
        "VersionResponse.json": {"version": int(time.strftime("%y%m%d%H%M")), "extra": extra_version},
    }

    for name, payload in payloads.items():
        write_json(os.path.join(args.out, name), payload)

    total = sum(os.path.getsize(os.path.join(args.out, name)) for name in payloads)
    print(f"{len(payloads)} mock payloads, {total / 1024 / 1024:.2f} MB -> {args.out}")
    for name, payload in payloads.items():
        size = os.path.getsize(os.path.join(args.out, name))
        count = payload.get("count", "-")
        print(f"  {name:32} {str(count):>6} items  {size / 1024:.0f} KB")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
