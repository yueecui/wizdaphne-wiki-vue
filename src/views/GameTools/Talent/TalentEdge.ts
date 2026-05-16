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

    getToNode() {
        return useTalentStore().nodes.find((n) => n.id === this.to);
    }

    isValid() {
        return this.getFromNode() && this.getToNode();
    }

    getColor() {
        const talentStore = useTalentStore();

        if (!talentStore.isSimulateMode) {
            return '#72ebff';
        }

        const activeFrom = talentStore.activated.has(this.from);
        const activeTo = talentStore.activated.has(this.to);
        if (activeFrom && activeTo) {
            return '#72ebff';
        } else if (activeFrom || activeTo) {
            return '#0b8a9a';
        }
        return '#344a5b';
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
