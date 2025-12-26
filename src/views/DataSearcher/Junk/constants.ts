// 颜色等级映射配置（公用）
export const GRADE_COLOR_MAP: Record<number, string> = {
    1: 'text-white',
    2: 'text-green-400',
    3: 'text-blue-400',
    4: 'text-purple-400',
    5: 'text-red-400',
};

// 获取等级对应的颜色类名（公用）
export const getGradeColorClass = (grade: number): string => {
    return GRADE_COLOR_MAP[grade] || 'text-gray-400';
};

// 获取品质显示文本（★和颜色）（公用）
export const getQualityDisplay = (quality: number, grade: number): string => {
    return '★'.repeat(quality);
};

// 阶级名称映射配置（公用）
export const TIER_NAME_MAP: Record<number, string> = {
    1: '残旧',
    2: '青铜',
    3: '铁',
    4: '钢',
    5: '冥钢',
    6: '银',
};

// 获取阶级显示名称（包含文字说明，用于标题）（公用）
export const getTierDisplayName = (tier: number): string => {
    const tierName = TIER_NAME_MAP[tier] || '';
    return tierName ? `${tier}（${tierName}）` : tier.toString();
};

// 获取阶级表格显示名称（用于表格，格式：铁（3））（公用）
export const getTierTableDisplayName = (tier: number): string => {
    const tierName = TIER_NAME_MAP[tier] || '';
    return tierName ? `${tierName}（${tier}）` : tier.toString();
};
