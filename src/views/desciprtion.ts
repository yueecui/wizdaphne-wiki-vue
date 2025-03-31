import { ELEMENT_TYPE_MAPPING } from '../types/database/constant';

export const parseDescription = (description: string, params: number[]) => {
    for (let i = 0; i < params.length; i++) {
        const param = params[i];
        const reg = new RegExp(`#${i + 1}\\[([if])(\\d?)\\](%?)`, 'g');
        const match = reg.exec(description);
        if (match) {
            const isInt = match[1] === 'i';
            const decimal = match[2] ? parseInt(match[2], 10) : 0;
            const isPercent = match[3] === '%';

            const value = toFixed(param * (isPercent ? 100 : 1), isInt, decimal);

            description = description.replaceAll(
                match[0],
                `<span class="text-skill-num mx-[1px] font-bold">${value}${isPercent ? '%' : ''}</span>`,
            );
        }
    }
    {
        for (const element of Object.values(ELEMENT_TYPE_MAPPING)) {
            description = description.replaceAll(
                `${element.cn}属性`,
                `<span class="${element.class}">${element.cn}属性</span>`,
            );
        }
    }

    // 移除所有script标签
    description = description.replaceAll(/<script[^>]*>.*?<\/script>/g, '');

    return description;
};

export const parseDescriptionParam = (description: string, params: number[], i: number) => {
    const param = params[i];
    const reg = new RegExp(`#${i + 1}\\[([if])(\\d?)\\](%?)`, 'g');
    const match = reg.exec(description);
    if (match) {
        const isInt = match[1] === 'i';
        const decimal = match[2] ? parseInt(match[2], 10) : 0;
        const isPercent = match[3] === '%';

        const value = toFixed(param * (isPercent ? 100 : 1), isInt, decimal);

        return `${value}${isPercent ? '%' : ''}`;
    }
    return param;
};

export const removeTags = (description: string) => {
    return description.replaceAll(/<[^>]*>/g, '');
};

// 修正int数字
const toFixed = (num: number, isInt: boolean, decimal: number) => {
    if (isInt) {
        return Math.floor(num);
    } else {
        return num.toFixed(decimal);
    }
};
