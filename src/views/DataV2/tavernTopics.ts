/** 一行酒馆议题：议题名 + 三个候选答复 + 好评的那个（1 起） */
export interface TavernRow {
    topic: string;
    order: number;
    replies: [string, string, string];
}

/**
 * 酒馆议题的固定答复表（数据里只存议题 + 序号 1..3，文案由这里生成）。
 * 顺序与 ``dialogue.py`` 的 ``TAVERN_TOPIC_ORDER`` 一致。
 */
export const TAVERN_REPLIES: Record<string, [string, string, string]> = {
    全员生存: ['碰巧罢了', '花了不少功夫', '下次试试新的作战计划吧'],
    战斗不能: ['狩猎地点不合适', '过度信任伙伴的实力', '应该回到安全的猎场'],
    大异形讨伐: ['令人恐惧的敌人', '没什么大不了的', '感觉很恶心'],
    奇袭对策: ['避开强敌', '这次运气不好', '提高警惕'],
    陷阱对策: ['谨慎前进', '感受到危险时立刻返回', '不顾一切勇往直前'],
};

/** 把 `dialogue.tavern` 的（议题 + 序号）展开成带文案的行；表里没有的议题跳过 */
export const buildTavernRows = (tavern?: Array<{ topic: string; order: number }> | null): TavernRow[] =>
    (tavern ?? [])
        .filter((row) => TAVERN_REPLIES[row.topic])
        .map((row) => ({ topic: row.topic, order: row.order, replies: TAVERN_REPLIES[row.topic] }));
