import type { IItem } from './types';

export class Item {
    id: number;
    cate: number;
    i: number;
    name: string;
    sell: number;
    desc: string;
    buy: number;
    comment?: string;

    constructor(item: IItem, index: number) {
        this.id = item.id;
        this.cate = item.cate ?? 0;
        this.i = item.i;
        this.name = item.name;
        this.sell = item.sell;
        this.desc = item.desc || '';
        this.buy = item.buy;
        this.comment = item.comment;
    }

    // 判断是否为待确认物品
    isUnconfirmed(): boolean {
        return this.name === '？？？？' && !this.desc;
    }
}
