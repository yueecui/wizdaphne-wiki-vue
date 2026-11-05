import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/**
 * wiki 职业页的「职业技能」表。
 *
 * 挂载点：`#job-skills-v2`，页面上写成
 * `<div id="job-skills-v2" data-job="战士" data-extra="19501500801,19501501301"></div>`
 *
 * - `data-job`：职业名，也可以直接写职业 id（100 = 战士）
 * - `data-extra`：额外技能 id（逗号 / 空格分隔），作为「仅继承」行插在表尾
 *
 * 技能名可点击打开 `SkillModal`，角色名可点击打开角色 modal。
 */
const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement('#job-skills-v2'),
    components: [
        {
            selector: '#job-skills-v2',
            type: 'exist',
            getParams: (element) => ({
                jobName: element.getAttribute('data-job')?.trim() ?? '',
                jobId: element.getAttribute('data-job-id')?.trim() ?? '',
                extraSkillIds: element.getAttribute('data-extra')?.trim() ?? '',
            }),
            app: () => import('../../components/JobSkillsTable.vue'),
        },
    ],
};

export default config;
