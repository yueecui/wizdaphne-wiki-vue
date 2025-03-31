/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_WIKI_PREFIX: string;
    readonly VITE_PORT: string;
    readonly VITE_IS_LOCAL: boolean;
    readonly VITE_LOCAL_MEMBER_API_URL: string;
    readonly VITE_DEV_TOKEN: string;
    // 更多环境变量...
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}
