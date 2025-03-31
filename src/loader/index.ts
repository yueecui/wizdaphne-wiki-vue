import { createApp } from 'vue';
import VueLazyLoad from 'vue3-lazyload';
import { setupStore } from '../stores';
import { LazyOptions } from './lazyOptions';
import type { ComponentConfig, DynamicComponent, LoaderConfig } from './loaderConfig.type';

export const loadAllComponents = async () => {
    // 根据配置加载各个模块
    for (const config of getAllConfigs()) {
        if (!config.isEnabled()) continue;

        /// 执行所有先执行函数
        for (const func of config.functions ?? []) {
            if (func.timing === 'beforeAll') {
                await func.func();
            }
        }

        /// 依次加载组件
        for (const component of config.components ?? []) {
            /// 加载组件
            if (component.type === 'multiple') {
                const targetElements = document.querySelectorAll(component.selector);
                targetElements.forEach((targetElement) => {
                    loadComponent(component, targetElement);
                });
            } else {
                const targetElement = getTargetElement(component);
                if (!targetElement) {
                    console.error(`Cannot find target element for ${component.selector}`);
                    continue;
                }
                loadComponent(component, targetElement);
            }
        }

        /// 执行所有后执行函数
        for (const func of config.functions ?? []) {
            if (func.timing === 'afterAll') {
                await func.func();
            }
        }
    }
};

/** 所有组件的配置列表 */
const getAllConfigs = () => {
    const configs = import.meta.glob<true, string, any>('./config/*.ts', { eager: true });
    const configList: LoaderConfig[] = [];
    Object.keys(configs).forEach((key) => {
        if (configs[key].default) {
            configList.push(configs[key].default);
        }
    });
    return configList;
};

/** 加载组件到目标元素 */
const loadComponent = async (componentConfig: ComponentConfig, targetElement: Element) => {
    const app = await (async () => {
        if (componentConfig.app instanceof Function) {
            return (await (componentConfig.app as DynamicComponent)()).default;
        } else {
            return componentConfig.app;
        }
    })();

    const params = componentConfig.getParams ? await componentConfig.getParams(targetElement) : {};
    const appInstance = createApp(app, params);
    if (componentConfig.useStore ?? true) setupStore(appInstance);
    if (componentConfig.lazyload ?? true) appInstance.use(VueLazyLoad, LazyOptions);

    /// 执行所有加载前函数
    for (const func of componentConfig.functions ?? []) {
        if (func.timing === 'beforeMount') {
            await func.func(targetElement, appInstance);
        }
    }

    appInstance.mount(targetElement);

    /// 执行所有加载后函数
    for (const func of componentConfig.functions ?? []) {
        if (func.timing === 'afterMount') {
            await func.func(targetElement, appInstance);
        }
    }
};

/** 根据配置返回Vue加载到的元素对象，如果是需要创建的则进行创建 */
function getTargetElement(component: ComponentConfig) {
    if (
        component.type === 'before' ||
        component.type === 'after' ||
        component.type === 'prepend' ||
        component.type === 'append'
    ) {
        const targetElement = document.querySelector(component.targetSelector);
        if (targetElement) {
            const selectorConfig = extractSelector(component.selector);
            const containerElement = document.createElement(selectorConfig.element || 'div');
            if (selectorConfig.id !== '') containerElement.id = selectorConfig.id;
            selectorConfig.class.forEach((className) => {
                containerElement.classList.add(className);
            });

            switch (component.type) {
                case 'prepend':
                    targetElement.prepend(containerElement);
                    break;
                case 'append':
                    targetElement.append(containerElement);
                    break;
                case 'before':
                    targetElement.before(containerElement);
                    break;
                case 'after':
                    targetElement.after(containerElement);
                    break;
            }

            return containerElement;
        }
    }
    return document.querySelector(component.selector);
}

interface Selector {
    id: string;
    class: string[];
    element: string;
}

function extractSelector(selector: string): Selector {
    const idRegex = /#([\w-]+)/;
    const classRegex = /\.([\w-]+)/g;
    const elementRegex = /^[\w-]+/;
    const idMatch = selector.match(idRegex);
    const classMatches = selector.match(classRegex);
    const classes = classMatches ? classMatches.map((match) => match.slice(1)) : [];
    const elementMatch = selector.match(elementRegex);
    return {
        id: idMatch ? idMatch[1] : '',
        class: classes,
        element: elementMatch ? elementMatch[0] : '',
    };
}
