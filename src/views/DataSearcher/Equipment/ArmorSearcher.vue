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
                        <th class="hidden md:table-cell!">非武器类型特性</th>
                        <th class="xl:w-[20em] hidden md:table-cell!">描述</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="item in currentPageList"
                        :key="item.data.n"
                        class="hover:bg-black/30 cursor-pointer"
                        @click="() => showDetail(item)"
                    >
                        <td>
                            <div class="flex justify-between items-center">
                                <div>{{ item.data.n }}</div>
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
            <div>※ 阶级为根据装备图标、主要属性数值或强化费用推测，仅作为参考。</div>
        </div>
        <NModal v-model:show="isShowDetail">
            <template v-if="showDetailEquipment">
                <div class="w-[90%] md:h-auto md:w-[600px] m-auto huiji-css-hook bg-transparent!">
                    <EquipmentCard :equipment="showDetailEquipment" :onClose="closeDetail" />
                </div>
            </template>
        </NModal>
    </div>
</template>

<script setup lang="tsx">
import { NButton, NModal, NPagination } from 'naive-ui';
import EquipmentCard from './EquipmentCard.vue';
import ArmorFilter from './ArmorFilter.vue';

import { computed, onMounted, ref, toRefs, watch } from 'vue';
import { convertDescription } from '../util/convertDescription';
import { useEquipmentStore } from './equipmentStore';
import { Equipment } from './Equpment';
import { IEquipmentFilter } from './types';

const filter = ref<IEquipmentFilter>({
    searchText: '',
    category: '',
    skill: '',
    showMaxLv: false,
});

watch(
    () => filter.value,
    (newFilter) => {
        pageIndex.value = 1;
    },
    { deep: true },
);

const { equipments } = toRefs(useEquipmentStore());

const pageSize = ref(50);
const pageIndex = ref(1);
const pageCount = computed(() => Math.ceil(filteredList.value.length / pageSize.value));

const allWeapon = computed(() => {
    return equipments.value.filter((equipment) => equipment.data.cate !== '武器');
});

const filteredList = computed(() => {
    const filteredData = allWeapon.value.filter((equipment) => equipment.isMatch(filter.value));
    filteredData.sort((a, b) => {
        if (a.getCategoryIndex() !== b.getCategoryIndex()) {
            return a.getCategoryIndex() - b.getCategoryIndex();
        }
        if (a.data.t !== b.data.t) {
            return a.data.t - b.data.t;
        }
        if (a.data.cate === '武器') {
            if (['单手杖', '双手杖'].includes(a.data.sub)) {
                if (a.data.mag !== b.data.mag) {
                    return a.data.mag - b.data.mag;
                }
                if (a.data.div !== b.data.div) {
                    return a.data.div - b.data.div;
                }
            } else {
                if (a.data.atk !== b.data.atk) {
                    return a.data.atk - b.data.atk;
                }
            }
        } else {
            if (a.data.def !== b.data.def) {
                return a.data.def - b.data.def;
            }
            if (a.data.mdef !== b.data.mdef) {
                return a.data.mdef - b.data.mdef;
            }
        }
        return 0;
    });
    return filteredData;
});
const currentPageList = computed(() => {
    return filteredList.value.slice((pageIndex.value - 1) * pageSize.value, pageIndex.value * pageSize.value);
});

onMounted(() => {
    onFilterReset();
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
        searchText: '',
        category: '',
        skill: '',
        showMaxLv: false,
    };
};

const showDetailEquipment = ref<Equipment | null>(null);
const showDetail = (equipment: Equipment) => {
    showDetailEquipment.value = equipment;
    isShowDetail.value = true;
};
const isShowDetail = ref(false);
const closeDetail = () => {
    isShowDetail.value = false;
};
</script>
