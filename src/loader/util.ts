const PAGE_TYPE_KEY = 'SRPageType';

export const checkPageType = (pageType: string) => {
    if (pageType === undefined) {
        return false;
    }
    if (process.env.NODE_ENV === 'development' && window[PAGE_TYPE_KEY] === pageType) {
        return true;
    }
    if (window.mw && window.mw.config.get(`wgHuijiVars.${PAGE_TYPE_KEY}`) === pageType) {
        return true;
    }
    return false;
};

export const hasHTMLElement = (selertor: string) => {
    return document.querySelector(selertor) !== null;
};
