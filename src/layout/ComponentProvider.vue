<template>
    <ThemeConfigProvider>
        <NConfigProvider
            :theme-overrides="themeOverrides"
            :inline-theme-disabled="true"
            :abstract="true"
            :locale="zhCN"
            :date-locale="dateZhCN"
        >
            <NLoadingBarProvider>
                <NDialogProvider>
                    <NNotificationProvider>
                        <NMessageProvider>
                            <RegisterControler />
                        </NMessageProvider>
                    </NNotificationProvider>
                </NDialogProvider>
            </NLoadingBarProvider>
        </NConfigProvider>
    </ThemeConfigProvider>
</template>

<script lang="ts" setup>
// n-config-provider:要求下级naive-ui使用暗色主题。
// :inline-theme-disabled表示不使用inline的主题样式（而是使用样式表）。
// :abstract表示该组件实际不生成元素（即不会影响层级关系）。
import {
    type GlobalThemeOverrides,
    NConfigProvider,
    NDialogProvider,
    NLoadingBarProvider,
    NMessageProvider,
    NNotificationProvider,
    dateZhCN,
    zhCN,
} from 'naive-ui';
import RegisterControler from './RegisterControler.vue';
import ThemeConfigProvider from './ThemeConfigProvider.vue';

import { ThemeOverrides } from './themeOverrides';

defineOptions({
    name: '组件加载模块',
});

const themeOverrides: GlobalThemeOverrides = ThemeOverrides;
</script>
