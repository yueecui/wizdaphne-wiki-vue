export interface IItem {
    id: number;
    cate: number;
    i: number;
    name: string;
    sell: number;
    desc?: string;
    buy: number;
    comment?: string;
}

export interface IItemJson {
    warnings?: {
        main?: {
            [key: string]: string;
        };
    };
    items: IItem[];
}

export interface IItemFilter {
    searchText: string;
    category: string;
}
