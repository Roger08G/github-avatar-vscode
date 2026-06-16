import * as vscode from "vscode";
import type { DownloadedAvatar } from "./githubApi.js";
import type { CachedProfileRecord, GitHubProfile } from "../types/github.js";

const CACHE_KEY = "githubAvatar.profileCache.v1";

export class ProfileCache {
    public constructor(private readonly context: vscode.ExtensionContext) {}

    public getRecord(): CachedProfileRecord | undefined {
        return this.context.globalState.get<CachedProfileRecord>(CACHE_KEY);
    }

    public isFresh(record: CachedProfileRecord, cacheMinutes: number): boolean {
        const maximumAge = cacheMinutes * 60 * 1000;
        return Date.now() - record.fetchedAt < maximumAge;
    }

    public async getAvatarUri(record: CachedProfileRecord): Promise<vscode.Uri | undefined> {
        if (!record.avatarFileName) {
            return undefined;
        }

        const avatarUri = vscode.Uri.joinPath(this.context.globalStorageUri, record.avatarFileName);

        try {
            await vscode.workspace.fs.stat(avatarUri);
            return avatarUri;
        } catch {
            return undefined;
        }
    }

    public async save(
        profile: GitHubProfile,
        avatar?: DownloadedAvatar,
    ): Promise<CachedProfileRecord> {
        await vscode.workspace.fs.createDirectory(this.context.globalStorageUri);

        let avatarFileName: string | undefined;
        if (avatar) {
            avatarFileName = `github-avatar-${profile.id}.${avatar.extension}`;
            const avatarUri = vscode.Uri.joinPath(this.context.globalStorageUri, avatarFileName);
            await vscode.workspace.fs.writeFile(avatarUri, avatar.bytes);
        }

        const record: CachedProfileRecord = {
            profile,
            fetchedAt: Date.now(),
            ...(avatarFileName ? { avatarFileName } : {}),
        };

        await this.context.globalState.update(CACHE_KEY, record);
        return record;
    }

    public async clear(): Promise<void> {
        const record = this.getRecord();
        if (record?.avatarFileName) {
            const avatarUri = vscode.Uri.joinPath(
                this.context.globalStorageUri,
                record.avatarFileName,
            );
            try {
                await vscode.workspace.fs.delete(avatarUri);
            } catch {
                // El archivo de caché ya pudo haberse eliminado.
            }
        }

        await this.context.globalState.update(CACHE_KEY, undefined);
    }
}
