<template>
    <div class="flex flex-col gap-4 px-2 -mx-2">
        <div class="flex flex-col gap-2">
            <ArmorFilter v-model:filter="filter" />
            <div><NButton size="small" type="error" @click="onFilterReset">重置</NButton></div>
        </div>
        <div>共有 {{ filteredList.length }} 个符合条件的装备</div>
        <template v-if="filteredList.length > 0">
            <NPagination v-model:page="pageIndex" :pageCount="pageCount"></NPagination>
            <table class="wikitable text-sm text-center">
                <thead>
                    <tr>
                        <th class="md:w-[12em]">名称</th>
                        <th class="md:w-[6em]">类型</th>
                        <th class="md:w-[2em]">阶级</th>
                        <th class="hidden md:table-cell! md:w-[2em]">攻击</th>
                        <th class="hidden md:table-cell! md:w-[2em]">魔力</th>
                        <th class="hidden md:table-cell! md:w-[2em]">神力</th>
                        <th class="md:w-[2em]">防御</th>
                        <th class="md:w-[2em]">魔防</th>
                        <th class="hidden md:table-cell! md:w-[2em]">速度</th>
                        <th class="hidden md:table-cell! md:w-[2em]">命中</th>
                        <th class="hidden md:table-cell! md:w-[2em]">会心</th>
                        <th class="hidden md:table-cell! md:w-[2em]">回避</th>
                        <th class="hidden md:table-cell! md:w-[2em]">抵抗</th>
                        <th class="hidden md:table-cell!">非装备类型特性</th>
                        <th class="xl:w-[20em] hidden md:table-cell!">其他</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in currentPageList"
                        :key="item.data.n"
                        class="hover:bg-black/30 cursor-pointer"
                        @click="() => openModal(item)"
                        @contextmenu.prevent="showContextMenu($event, item)"
                    >
                        <td class="text-left">
                            <div class="flex justify-between items-center">
                                <div>
                                    <span :class="{ 'text-blue-300': item.data.soucate === 9 }">
                                        {{ item.data.n }}
                                    </span>
                                </div>
                            </div>
                        </td>

                        <td>{{ item.data.sub }}</td>
                        <td>{{ item.data.t }}</td>
                        <component :is="getTd(item, 'atk')" />
                        <component :is="getTd(item, 'mag')" />
                        <component :is="getTd(item, 'div')" />
                        <component :is="getTd(item, 'def')" />
                        <component :is="getTd(item, 'mdef')" />
                        <component :is="getTd(item, 'spe')" />
                        <component :is="getTd(item, 'acc')" />
                        <component :is="getTd(item, 'sur')" />
                        <component :is="getTd(item, 'eva')" />
                        <component :is="getTd(item, 'res')" />
                        <td class="hidden md:table-cell! text-left">{{ (item.data.sk ?? []).join(' / ') }}</td>
                        <td
                            class="hidden md:table-cell! text-left"
                            v-html="convertDescription(item.data.desc ?? '')"
                        ></td>
                    </tr>
                </tbody>
            </table>
            <NPagination v-model:page="pageIndex" :pageCount="pageCount"></NPagination>
        </template>
        <div class="text-sm text-gray-400">
            <div>
                <template v-if="filter.showMaxLv">
                    ※ 表中绿色表示升级时有数值提升的属性。“??”表示没有收集到数据。
                </template>
                <template v-else>
                    ※ 表中红色表示比同类型装备的基准值低，绿色表示比同类型装备的基准值高。部分装备主要属性不参与该比较。
                </template>
            </div>
        </div>

        <!-- 右键菜单 -->
        <div
            v-if="contextMenu.show"
            class="fixed z-50 bg-[#312721] border border-[#463d38] rounded shadow-lg"
            :style="{
                left: contextMenu.x + 'px',
                top: contextMenu.y + 'px',
            }"
        >
            <div class="px-4 py-2 hover:bg-[#463d38] cursor-pointer" @click="copyEquipmentTemplate(contextMenu.item)">
                复制 &#123;&#123;装备&#125;&#125;
            </div>
        </div>
    </div>
</template>

<script setup lang="tsx">
import { NButton, NPagination } from 'naive-ui';
import ArmorFilter from './ArmorFilter.vue';

import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { useEquipmentModalStore } from '../../../stores/equipmentModalStore';
import { DEFAULT_SETTINGS, useSearcherDataStore } from '../data/searcherDataStore';
import { convertDescription } from '../utils/convertDescription';
import { Equipment } from './Equipment';
import { useEquipmentStore } from './equipmentStore';

// 使用searcherDataStore的settings
const { settings } = toRefs(useSearcherDataStore());
const { openModal } = useEquipmentModalStore();

// 使用计算属性获取和设置防具过滤器
const filter = computed({
    get: () => settings.value.armorFilter,
    set: (newFilter) => {
        settings.value.armorFilter = newFilter;
        // 同步特典过滤规则到全局设置
        if (newFilter.soucateFilter) {
            settings.value.soucateFilter = newFilter.soucateFilter;
        }
    },
});

// 监听过滤器变化
watch(
    () => filter.value,
    (newFilter) => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const { equipments } = toRefs(useEquipmentStore());

const pageSize = ref(20);
const pageIndex = ref(1);
const pageCount = computed(() => Math.ceil(filteredList.value.length / pageSize.value));

const allWeapon = computed(() => {
    return equipments.value.filter((equipment) => equipment.data.cate !== '武器');
});

const filteredList = computed(() => {
    const filteredData = allWeapon.value.filter((equipment) => equipment.isMatch(filter.value));
    filteredData.sort((a, b) => {
        // 1. 优先t值，t越高越靠前
        if (a.data.t !== b.data.t) {
            return b.data.t - a.data.t;
        }

        // 2. 按soucate排序，越大越靠前
        if (a.data.soucate !== b.data.soucate) {
            return b.data.soucate - a.data.soucate;
        }

        // 3. id = 0的最靠前，>0的倒序排列
        const aId = a.data.id || 0;
        const bId = b.data.id || 0;
        if (aId === 0 && bId !== 0) {
            return -1;
        }
        if (aId !== 0 && bId === 0) {
            return 1;
        }
        // 都是0或都不是0，倒序排列
        return bId - aId;
    });
    return filteredData;
});
const currentPageList = computed(() => {
    return filteredList.value.slice((pageIndex.value - 1) * pageSize.value, pageIndex.value * pageSize.value);
});

onMounted(() => {
    // 移除默认重置，确保从settings加载保存的过滤器
});

const getTd = (item: Equipment, key: string) => {
    const value = item.getValue(key, filter.value.showMaxLv ? 20 : 0);
    const tdClass: string[] = [];

    tdClass.push(filter.value.showMaxLv ? item.getLvStatColorClass(key, 20) : item.getLvZeroStatColorClass(key));

    if (key !== 'def' && key !== 'mdef') {
        tdClass.push('hidden md:table-cell!');
    }
    let text = `${value === null ? '??' : (value ?? 0)}`;
    if (key === 'c') {
        // 攻击次数
        if (value === null) {
            text = '??';
        } else if (item.data.cate === '武器') {
            text = `×${value}`;
        } else {
            text = `-`;
        }
    }

    return <td class={tdClass.join(' ')}>{text}</td>;
};

const onFilterReset = () => {
    filter.value = {
        ...DEFAULT_SETTINGS.armorFilter,
        soucateFilter: filter.value.soucateFilter, // 保留特典过滤
    };
};

// 右键菜单状态
const contextMenu = ref({
    show: false,
    x: 0,
    y: 0,
    item: null as Equipment | null,
});

// 显示右键菜单
const showContextMenu = (event: MouseEvent, item: Equipment) => {
    contextMenu.value = {
        show: true,
        x: event.clientX,
        y: event.clientY,
        item: item,
    };
    document.addEventListener('click', closeContextMenu);
};

// 关闭右键菜单
const closeContextMenu = () => {
    contextMenu.value.show = false;
    document.removeEventListener('click', closeContextMenu);
};

// 复制装备模板
const copyEquipmentTemplate = (item: Equipment | null) => {
    if (item) {
        const template = `{{装备|${item.data.n}}}`;

        // 复制到剪贴板
        navigator.clipboard
            .writeText(template)
            .then(() => {
                // 显示复制成功的提示
                window.wiz.$message.success(`已复制 ${template} 模板到剪贴板`);
            })
            .catch((err) => {
                window.wiz.$message.error('复制失败，请手动复制');
            });
    }
    closeContextMenu();
};
</script>
