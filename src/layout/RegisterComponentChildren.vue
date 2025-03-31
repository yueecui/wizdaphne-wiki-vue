<template>
    <div></div>
</template>

<script setup lang="ts">
import { useDialog, useLoadingBar, useMessage, useNotification } from 'naive-ui';

window.$message = useMessage();
window.$dialog = useDialog();
window.$loadingbar = useLoadingBar();
window.$notification = useNotification();
</script>
