/**
 * `@types/node@20` 还没有 `node:sqlite` 的声明（Node 22+ 才是内置模块），
 * 这里补一个最小声明，供 uploadDataToWiki.ts 使用。
 */
declare module 'node:sqlite' {
    export interface StatementSync {
        get(...params: unknown[]): unknown;
        run(...params: unknown[]): unknown;
        all(...params: unknown[]): unknown[];
    }

    export class DatabaseSync {
        constructor(path: string, options?: { open?: boolean; readOnly?: boolean });
        exec(sql: string): void;
        prepare(sql: string): StatementSync;
        close(): void;
    }
}
