import { useTalentStore } from './talentStore';
import type { ITalentEdge } from './types';

export class TalentEdge {
    constructor(public data: ITalentEdge) {}

    get from() {
        return this.data.from;
    }

    getFromNode() {
        return useTalentStore().nodes.find((n) => n.id === this.from);
    }

    get to() {
        return this.data.to;
    }

    /** 跨区远连接：颜色与透明度都和普通连线区分开 */
    get distant() {
        return this.data.distant === true;
    }

    getOpacity() {
        return this.distant ? 0.35 : 1;
    }

    getToNode() {
        return useTalentStore().nodes.find((n) => n.id === this.to);
    }

    isValid() {
        return this.getFromNode() && this.getToNode();
    }

    getColor() {
        const talentStore = useTalentStore();

        // 跨区远连接换一套颜色（金色系），半透明由 getOpacity() 叠加
        const palette = this.distant
            ? { on: '#e3cc99', half: '#a8916a', off: '#6d5f47' }
            : { on: '#72ebff', half: '#0b8a9a', off: '#344a5b' };

        if (!talentStore.isSimulateMode) {
            return palette.on;
        }

        const activeFrom = talentStore.activated.has(this.from);
        const activeTo = talentStore.activated.has(this.to);
        if (activeFrom && activeTo) {
            return palette.on;
        } else if (activeFrom || activeTo) {
            return palette.half;
        }
        return palette.off;
    }

    getWidth() {
        const talentStore = useTalentStore();

        if (!talentStore.isSimulateMode) {
            return 3;
        }
        const active = talentStore.activated.has(this.from) && talentStore.activated.has(this.to);
        return active ? 3 : 1.5;
    }
}
