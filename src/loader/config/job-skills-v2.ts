import type { LoaderConfig } from '../loaderConfig.type';
import { hasHTMLElement } from '../util';

/**
 * wiki 职业页的「职业技能」表。
 *
 * 挂载点：`class="job-skills-v2"`（一页可放多个，每个按自己的 `data-*` 独立渲染），例如
 * `<div class="job-skills-v2" data-job="武士" data-exclude="116000130,116000140"></div>`
 * 只写 `data-extra`、不写职业时，整张表完全由手写列表生成：
 * `<div class="job-skills-v2" data-extra="116000130:28,116000140"></div>`
 * 旧的 `id="job-skills-v2"` 仍兼容（选择器同时匹配两者）。
 *
 * - `data-job` / `data-job-id`：职业名或职业 id（可省略）
 * - `data-exclude`：从职业技能里排除的技能 id（逗号 / 空格分隔）；只作用于职业来源，
 *   不会过滤 `data-extra` 里手写指定的技能
 * - `data-extra`：手写技能，格式为 `id` 或 `id:学习等级`（逗号 / 空格分隔）。
 *   带学习等级就显示等级，不带则显示「仅继承」；id 也可写技能行 id（11 位）
 * - `data-mode="武士属性别技能"`：武士属性分页（与角色搜索器同款图标按钮，无 / 火 / 水 / 风 / 土 / 暗），
 *   按所选属性显示宿X之力这组技能的学习等级。黑杖的武士与「无」一致，不再单列；
 *   按「武士」取数，表格格式与普通模式一致。
 *
 * 技能名可点击打开 `SkillModal`，角色名可点击打开角色 modal。
 */
/** 新页面用 class（可放多个）；旧页面的 id 仍兼容 */
const JOB_SKILLS_SELECTOR = '#job-skills-v2, .job-skills-v2';

const config: LoaderConfig = {
    isEnabled: () => hasHTMLElement(JOB_SKILLS_SELECTOR),
    components: [
        {
            selector: JOB_SKILLS_SELECTOR,
            type: 'multiple',
            getParams: (element) => ({
                jobName: element.getAttribute('data-job')?.trim() ?? '',
                jobId: element.getAttribute('data-job-id')?.trim() ?? '',
                excludeSkillIds: element.getAttribute('data-exclude')?.trim() ?? '',
                extraSkillIds: element.getAttribute('data-extra')?.trim() ?? '',
                mode: element.getAttribute('data-mode')?.trim() ?? '',
            }),
            app: () => import('../../components/JobSkillsTable.vue'),
        },
    ],
};

export default config;
