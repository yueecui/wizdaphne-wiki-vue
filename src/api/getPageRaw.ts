import { WIKI_PREFIX } from '../config';
import { IS_DEV } from '../util';

export async function getPageRawByTitle<T>(pageTitle: string, noCache = false): Promise<T | null> {
    try {
        const response = await fetch(
            `${IS_DEV ? 'https://' + WIKI_PREFIX + '.huijiwiki.com' : ''}/index.php?title=${pageTitle}&action=raw&ctype=text/json${noCache ? `&t=${Date.now()}` : ''}`,
        );
        const data = await response.json();
        return data;
    } catch (e) {
        return null;
    }
}
