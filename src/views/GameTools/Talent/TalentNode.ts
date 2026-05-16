import { reactive } from 'vue';
import { useTalentStore } from './talentStore';
import type { ITalentNode } from './types';

export class TalentNode {
    constructor(data: ITalentNode) {
        this.data = reactive(data);
    }

    data: ITalentNode;

    get id() {
        return this.data.id;
    }

    // x和y是正中心的点，需要计算出实际的坐标
    getX() {
        const talentStore = useTalentStore();
        return talentStore.width / 2 + this.data.x;
    }

    getY() {
        const talentStore = useTalentStore();
        return talentStore.height / 2 + this.data.y;
    }

    get cost() {
        return this.data.cost;
    }

    get label() {
        return this.data.label;
    }

    get type() {
        return this.data.type ?? 0;
    }

    get group() {
        return this.data.group ?? 0;
    }

    get options() {
        return this.data.options ?? [];
    }

    get number() {
        return this.data.number ?? 1;
    }

    getState() {
        if (this.type !== 0) {
            return 'locked';
        }
        const talentStore = useTalentStore();
        if (talentStore.activated.has(this.id)) {
            return 'active';
        }
        const adjacentNodes = this.getAdjacentNodes();
        if (adjacentNodes.some((e) => talentStore.activated.has(e))) {
            return 'available';
        }
        return 'locked';
    }

    getColors() {
        const talentStore = useTalentStore();
        let c = talentStore.colors.get(this.group) ?? talentStore.colors.get('无')!;

        // 浏览模式下全部显示激活颜色
        if (!talentStore.isSimulateMode) {
            return { fill: c.activeFill, stroke: c.activeStroke, text: c.activeText };
        }

        // 模拟模式下显示实际状态
        const isActive = this.type === 1 || talentStore.activated.has(this.id);
        if (isActive) {
            return { fill: c.activeFill, stroke: c.activeStroke, text: c.activeText };
        }
        c = talentStore.colors.get('无')!;
        return { fill: c.availableFill, stroke: c.availableStroke, text: c.availableText };
    }

    // 获取相邻节点
    getAdjacentNodes() {
        const talentStore = useTalentStore();
        return talentStore.edges
            .filter((e) => e.from === this.id || e.to === this.id)
            .map((e) => {
                if (e.from === this.id) {
                    return e.to;
                }
                return e.from;
            });
    }
}
