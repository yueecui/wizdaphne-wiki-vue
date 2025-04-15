<template>
    <div></div>
</template>

<script setup lang="ts">
import { useDialog, useLoadingBar, useMessage, useNotification } from 'naive-ui';

window.wiz = {
    $dialog: useDialog(),
    $loadingbar: useLoadingBar(),
    $message: useMessage(),
    $notification: useNotification(),
};
</script>
