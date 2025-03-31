import './styles/common.less';
import './styles/tailwind.css';

import { createApp } from 'vue';
import Package from '../package.json';
import RegisterComponentParent from './layout/RegisterComponentParent.vue';
import { loadAllComponents } from './loader';

(async () => {
    // dev环境优先挂载一下 Provider
    // 正式环境下，Provider会由驾驶室挂载
    if (process.env.NODE_ENV === 'development') {
        const componentProvider = createApp(RegisterComponentParent);
        componentProvider.mount('#componentProvider', true);
    }

    // 根据配置加载所有元素
    await loadAllComponents();

    console.log(`${Package.displayName} loaded! author: ${Package.author}. Version: ${Package.version}`);
})();
