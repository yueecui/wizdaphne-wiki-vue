export interface IAchievement {
    i: number;
    name: string;
    id: number;
    desc: string;
    sub?: string;
    cate: string;
    comment?: string;
}

export interface IAchievementJson {
    warnings?: {
        main?: {
            [key: string]: string;
        };
    };
    achievement: IAchievement[];
}

export interface IAchievementFilter {
    searchText: string;
    category: string;
    subCategory: string;
    completionStatus: 'all' | 'completed' | 'incomplete';
    achievementAutoLoad: boolean;
}
