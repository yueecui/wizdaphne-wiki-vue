import type { IAchievement } from './types';

export class AchievementItem {
    public i: number;
    public name: string;
    public id: number;
    public desc: string;
    public sub?: string;
    public cate: string;
    public comment?: string;
    public index: number;

    constructor(data: IAchievement, index: number) {
        this.i = data.i;
        this.name = data.name;
        this.id = data.id;
        this.desc = data.desc;
        this.sub = data.sub;
        this.cate = data.cate;
        this.comment = data.comment;
        this.index = index;
    }
}
