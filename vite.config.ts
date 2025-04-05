import tailwindcss from '@tailwindcss/vite';
import vue from '@vitejs/plugin-vue';
import vueJsx from '@vitejs/plugin-vue-jsx';
import { fileURLToPath, URL } from 'url';
import { defineConfig, loadEnv } from 'vite';
import VueDevTools from 'vite-plugin-vue-devtools';

// https://vitejs.dev/config/
export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd());

    return {
        base: '',
        plugins: [vue(), vueJsx(), VueDevTools(), tailwindcss()],
        resolve: {
            alias: {
                '@': fileURLToPath(new URL('./src', import.meta.url)),
            },
        },
        server: {
            port: Number(env.VITE_PORT),
            proxy: {
                [`/${env.VITE_WIKI_PREFIX}/uploads`]: {
                    target: 'https://huiji-public.huijistatic.com/',
                    changeOrigin: true,
                    secure: false,
                    bypass: (req) => {
                        req.headers.referer = `https://${env.VITE_WIKI_PREFIX}.huijiwiki.com/`;
                    },
                },
                '/api': {
                    target: `https://${env.VITE_WIKI_PREFIX}.huijiwiki.com/`,
                    changeOrigin: true,
                    secure: false,
                    bypass: (req) => {
                        req.headers.referer = `https://${env.VITE_WIKI_PREFIX}.huijiwiki.com/`;
                    },
                },
                '/index.php': {
                    target: `https://${env.VITE_WIKI_PREFIX}.huijiwiki.com/`,
                    changeOrigin: true,
                    secure: false,
                    bypass: (req) => {
                        req.headers.referer = `https://${env.VITE_WIKI_PREFIX}.huijiwiki.com/`;
                    },
                },
            },
        },
        css: {
            preprocessorOptions: {
                less: {
                    additionalData: (() => {
                        return `@import "./src/styles/common.${command}.less";`;
                    })(),
                },
            },
        },
        build: {
            manifest: true,
            rollupOptions: {
                output: {
                    entryFileNames: `assets/index.js`,
                    assetFileNames: (assetInfo) => {
                        if (assetInfo.name === 'index.css') {
                            return `assets/index.css`;
                        } else {
                            return `assets/[name].[hash][extname]`;
                        }
                    },
                },
            },
            emptyOutDir: true,
        },
    };
});
