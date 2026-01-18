import DOMPurify from 'dompurify';

export const convertDescription = (description: string) => {
    description = DOMPurify.sanitize(description, {
        ALLOWED_TAGS: ['br'],
        ALLOWED_ATTR: [],
    });

    // 将\n替换为<br>
    description = description.replace(/\n/g, '<br>');

    // 解析wikitext链接 [[XXX]] 和 [[XXX|YYY]]
    description = description.replace(/\[\[([^\]|]+)(\|([^\]]+))?\]\]/g, (match, page, _, text) => {
        const linkText = text || page;
        return `<a href="/wiki/${page}" target="_blank">${linkText}</a>`;
    });

    return description;
};
