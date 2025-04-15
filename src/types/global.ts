import { DialogApiInjection } from 'naive-ui/es/dialog/src/DialogProvider';
import { LoadingBarApiInjection } from 'naive-ui/es/loading-bar/src/LoadingBarProvider';
import { MessageApiInjection } from 'naive-ui/es/message/src/MessageProvider';
import { NotificationApiInjection } from 'naive-ui/es/notification/src/NotificationProvider';

declare global {
    interface Window {
        wiz: {
            $message: MessageApiInjection;
            $dialog: DialogApiInjection;
            $loadingbar: LoadingBarApiInjection;
            $notification: NotificationApiInjection;
        };

        mw: {
            config: {
                get: <T = any>(key: string) => T;
                values: IMwConfig;
            };
        };
        Data: Record<string, any>;
    }
}

export interface MwPageActionEntry {
    href: string;
    text: string;
    id: string;
}

export interface IMwConfig {
    // view,edit等
    wgAction: string;
    // 文章id，可用于生成链接
    wgArticleId: number;
    // 当前ns的正式名称（如特殊:的正式名称为special）
    WgCanonicalNamespace: string;
    // 当前页面的正式名称（如特殊:全部页面的正式ns和名称为special:allPages）
    wgCanonicalSpecialPageName: string | boolean;
    // 属于content的ns列表
    wgContentNamespaces: number[];
    // 当前页最近个版本的id
    wgCurRevisionId: number;
    // alert和notice的阅读时间
    wgEchoSeenTime: {
        alert: string;
        notice: string;
    };
    // nsid和ns名称的映射
    wgFormattedNamespaces: Record<number, string>;
    // ns名称和nsid的映射
    wgNamespaceIds: Record<string, number>;
    // 当前页面的nsid
    wgNamespaceNumber: number;
    // 站点名称
    wgSiteName: string;
    // 当前站点的id
    wgHuijiId: number;
    // 站点前缀
    wgHuijiPrefix: string;
    // 当前页面是否为文章页
    wgIsArticle: boolean;
    // 当前页面的contentmodel
    wgPageContentModel: string;
    // 页面完整名称（带NS）
    wgPageName: string;
    // 页面名称（不带NS）
    wgTitle: string;
    // 格式化后的页面名称（即mediawiki:pageTitle）
    wgPageTitleFormatted: string;
    // 用户id，未登录则不存在
    wgUserId?: number;
    // 用户名
    wgUserName: string | null;
    // 用户在当前站点的用户组
    wgUserGroups: string[];
    // 该页面边栏中应当显示的选项
    wgPageActions: Record<string, MwPageActionEntry>;
    wgHuijiUserInfo?: MwHuijiUserInfoInitial;
    // 二级导航array
    wgSubnav?: MwSubnavParent[];
    wgHuijiSiteInfo: {
        base: {
            avatartime: number;
            name: string;
            prefix: string;
        };
        commentCount: number;
    };
    // 如果是博客
    wgHuijiBlog?: {
        createDatetime: number;
        updateDatetime: number;
        author: {
            id: number;
            name: string;
            avatartime: number;
        };
        authorTitle: {
            prefix?: {
                giftId: number;
                giftName: string;
                titleName: string;
            };
            suffix?: {
                giftId: number;
                giftName: string;
                titleName: string;
            };
        };
        authorAbout: string;
    };
}

/**
 * mw.config.values.wgHuijiUserInfo
 */
export interface MwHuijiUserInfoInitial {
    isFollowedSite?: 0 | 1;
    avatar: string;
    label: string;
    username: string;
    profile: {
        id: number;
        name: string;
        avatartime: number;
        levelInfo: {
            currLv: number;
            level: number;
            nextLv: number;
            point: number;
        };
        message: {
            attCount: number;
            msgCount: number;
        };
        title: {
            prefix: {
                giftId: number;
                giftName: string;
                titleName: string;
            };
            suffix: {
                giftId: number;
                giftName: string;
                titleName: string;
            };
        };
    };
    social: {
        followingSite: { prefix: string; name: string; avatartime: number }[];
        followingSiteCount: number;
        followingUserCount: number;
        myFollowerCount: number;
    };
    activity: {
        editCount: number;
        editing: Record<string, number>;
    };
}

/**
 * mw.config.values.wgSubnav
 */
export interface MwSubnavChild {
    title: string;
    link: string;
    local?: boolean;
    external?: boolean;
}
export interface MwSubnavParent extends MwSubnavChild {
    sublinks?: MwSubnavChild[];
    textonly?: boolean;
}

export {};
