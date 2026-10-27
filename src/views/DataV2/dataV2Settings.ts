import { reactive, ref, toRaw, watch, type Ref } from 'vue';

/**
 * V2 的过滤器持久化（对应 V1 的 ``dataSearcherSettings``）。
 *
 * V1 会把每个菜单的过滤器写进 localStorage（`dataSearcherSettings`），
 * V2 用同一套做法：所有过滤器项存在一个 `dataV2Settings` 里，键名按面板分组。
 */
export const DATA_V2_STORAGE_KEY = 'dataV2Settings';

/** 当前页签：与 V1 的 `DataSearcherActiveTab` 对应 */
export const DATA_V2_TAB_KEY = 'DataV2ActiveTab';

/** URL 上的页签参数，和 V1 一样用 `tab` */
export const DATA_V2_TAB_PARAM = 'tab';

type Bag = Record<string, unknown>;

let bag: Bag | null = null;

const load = (): Bag => {
    if (bag) return bag;
    try {
        const raw = localStorage.getItem(DATA_V2_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : {};
        bag = parsed && typeof parsed === 'object' ? (parsed as Bag) : {};
    } catch {
        bag = {};
    }
    return bag;
};

const save = () => {
    try {
        localStorage.setItem(DATA_V2_STORAGE_KEY, JSON.stringify(load()));
    } catch {
        // 隐私模式 / 配额满：放弃持久化，不影响页面
    }
};

/**
 * 单个过滤器项：初值优先取本地存的，变化时写回。
 * 用法和 `ref()` 一样，模板不用改。
 */
export const usePersistentRef = <T>(key: string, defaultValue: T): Ref<T> => {
    const saved = load()[key] as T | undefined;
    const state = ref(saved === undefined ? defaultValue : saved) as Ref<T>;
    watch(
        state,
        (value) => {
            load()[key] = toRaw(value);
            save();
        },
        { deep: true },
    );
    return state;
};

/**
 * 整组过滤器（reactive 对象）：默认值打底，本地存的值覆盖，变化时整体写回。
 * 新增字段会自动带上默认值，不会被老数据破坏。
 */
export const usePersistentFilter = <T extends object>(key: string, defaults: T): T => {
    const saved = (load()[key] ?? {}) as Partial<T>;
    const state = reactive({ ...defaults, ...saved }) as T;
    watch(state, () => {
        load()[key] = toRaw({ ...state });
        save();
    });
    return state;
};
