import type { IMwConfig } from '../types/global';
import { IS_DEV } from '../util';

export class MwConfig {
    private static instance: MwConfig | null = null;
    private mwConfig: IMwConfig | null = null;

    private constructor() {
        if (window.mw) {
            this.mwConfig = window.mw.config.values;
        }
    }

    public static getInstance(): MwConfig {
        if (MwConfig.instance === null) {
            MwConfig.instance = new MwConfig();
        }
        return MwConfig.instance;
    }

    public getPrefix(): string {
        return this.mwConfig?.wgHuijiPrefix ?? '';
    }

    public getUserId(): number {
        return this.mwConfig?.wgUserId ?? 0;
    }

    public getUserName(): string {
        return this.mwConfig?.wgUserName ?? '';
    }

    public get isLogin(): boolean {
        if (IS_DEV) return true;
        return this.getUserId() !== 0;
    }

    public get isStaff(): boolean {
        if (IS_DEV) return true;
        return this.mwConfig?.wgUserGroups?.includes('staff') ?? false;
    }

    public get isSystemAdmin(): boolean {
        if (IS_DEV) return true;
        return this.mwConfig?.wgUserGroups?.includes('sysop') ?? false;
    }

    public get isAdvanced(): boolean {
        return this.mwConfig?.wgUserGroups?.includes('advanced') ?? false;
    }

    public get isVerified(): boolean {
        return this.mwConfig?.wgUserGroups?.includes('verified') ?? false;
    }

    public get canEdit(): boolean {
        return this.isVerified;
    }
}
