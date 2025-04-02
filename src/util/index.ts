import { WIKI_PREFIX } from '../config.js';
import { useCurrentSiteStore } from '../stores/currentSite';

const DEFAULT_API_PREFIX = 'api';

export const getHostFromPrefix = (prefix?: string) => {
    return IS_DEV
        ? `https://${WIKI_PREFIX}.huijiwiki.com`
        : `https://${prefix ?? (useCurrentSiteStore().getPrefix() || DEFAULT_API_PREFIX)}.huijiwiki.com`;
    // return ''; // 只调用本站的API
};
export const getApiIndex = (prefix?: string) => {
    return `${getHostFromPrefix(prefix)}/api.php`;
};
export const getDBIndex = (prefix?: string) => {
    return `${getHostFromPrefix(prefix)}/api/rest_v1/namespace/data`;
};

export const IS_DEV = import.meta.env.DEV;
