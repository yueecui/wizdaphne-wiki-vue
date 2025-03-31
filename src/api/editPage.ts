interface MediawikiApiErrorResponse {
    error: {
        code: string;
        info: string;
        '*': string;
    };
}

interface MediawikiApiEditResponse {
    edit: {
        result: string;
        pageid: number;
        title: string;
        contentmodel: string;
        oldrevid: number;
        newrevid: number;
        newtimestamp: string;
    };
}

export async function edit({
    title,
    text,
    summary,
    minor,
}: {
    title: string;
    text: string;
    summary: string;
    minor: boolean;
}) {
    try {
        const csrfToken = await getCsrfToken();
        const response = await fetch('/api.php', {
            method: 'POST',
            body: new URLSearchParams({
                action: 'edit',
                title,
                text,
                summary,
                ...(minor ? { minor: '' } : {}),
                token: csrfToken,
                format: 'json',
                utf8: '1',
            }),
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
        });
        const data = await response.json();
        return data as MediawikiApiEditResponse | MediawikiApiErrorResponse;
    } catch (e: any) {
        return {
            error: {
                info: `请求失败，错误原因：${e.message}`,
            },
        };
    }
}

async function getCsrfToken(): Promise<string> {
    const response = await fetch('/api.php?action=query&meta=tokens&type=csrf&format=json');
    const data = await response.json();
    return data.query.tokens.csrftoken;
}
