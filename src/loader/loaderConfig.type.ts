import type { App, Component } from 'vue';

export interface LoaderConfig {
    /** 是否启用该模块 */
    isEnabled: () => boolean;
    /** 启用时加载的Vue组件 */
    components?: ComponentConfig[];
    /** 加载组件前后执行的函数 */
    functions?: {
        timing: 'beforeAll' | 'afterAll';
        func: () => Promise<void> | void;
    }[];
}

/** Vue组件配置 */
export type ComponentConfig = {
    /** 加载到的目标选择器 */
    selector: string;
    /** 是否加载store，默认为true */
    useStore?: boolean;
    /** 是否加载lazyLoad，默认为true */
    lazyload?: boolean;
    /** 如果该方法存在，则会将返回值作为参数用于createApp时 */
    getParams?: (element: Element) => Promise<any> | any;
    /** 配置在mount前后执行的函数 */
    functions?: {
        timing: 'beforeMount' | 'afterMount';
        func: (element: Element, app: App) => Promise<void> | void;
    }[];
    app: Component | DynamicComponent;
} & (InsertElement | ExistingElement);

/** 加载目标选择器是不存在的，需要生成 */
interface InsertElement {
    /** 生成的位置 */
    type: 'before' | 'after' | 'prepend' | 'append';
    /** 生成基准选择器 */
    targetSelector: string;
}

/** 加载目标选择器是存在的 */
interface ExistingElement {
    /**
     * - exist: 目标选择器只有一个，直接加载。如果有多个的时候会选择第一个进行加载
     * - multiple: 目标选择器可能有多个，每个都需要加载
     */
    type: 'exist' | 'multiple';
}

export type DynamicComponent = () => Promise<{ default: Component }>;
