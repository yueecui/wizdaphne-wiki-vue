import './styles/common.less';
import './styles/tailwind.css';

import { createApp } from 'vue';
import Package from '../package.json';
import ComponentProvider from './layout/ComponentProvider.vue';
import { loadAllComponents } from './loader';

(async () => {
    // 根据配置加载所有元素
    await loadAllComponents();

    console.log(`${Package.displayName} loaded! author: ${Package.author}. Version: ${Package.version}`);

    // 改为正式环境也挂载，主要问题是弹窗部分需要统一管理，用驾驶室的会分开技术z-index
    const componentProvider = createApp(ComponentProvider);
    document.querySelector('body')?.appendChild(document.createElement('div')).setAttribute('id', 'componentProvider');
    componentProvider.mount('#componentProvider', true);
})();
