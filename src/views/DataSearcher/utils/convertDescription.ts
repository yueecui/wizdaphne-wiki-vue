import DOMPurify from 'dompurify';

export const convertDescription = (description: string) => {
    description = DOMPurify.sanitize(description, {
        ALLOWED_TAGS: ['br'],
        ALLOWED_ATTR: [],
    });

    // 将\n替换为<br>
    description = description.replace(/\n/g, '<br>');

    return description;
};
