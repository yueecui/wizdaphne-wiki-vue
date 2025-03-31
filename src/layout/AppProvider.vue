<template>
    <NConfigProvider
        :theme="darkTheme"
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
                        <slot name="default"></slot>
                    </NMessageProvider>
                </NNotificationProvider>
            </NDialogProvider>
        </NLoadingBarProvider>
    </NConfigProvider>
</template>

<script lang="ts" setup>
// n-config-provider:要求下级naive-ui使用暗色主题。
// :inline-theme-disabled表示不使用inline的主题样式（而是使用样式表）。
// :abstract表示该组件实际不生成元素（即不会影响层级关系）。
import {
    GlobalThemeOverrides,
    NConfigProvider,
    NDialogProvider,
    NLoadingBarProvider,
    NMessageProvider,
    NNotificationProvider,
    darkTheme,
    dateZhCN,
    zhCN,
} from 'naive-ui';

import { ThemeOverrides } from './themeOverrides';

const themeOverrides: GlobalThemeOverrides = ThemeOverrides;
</script>
