import * as vscode from "vscode";
import {
    AUTO_REFRESH_INTERVAL_MS,
    CONFIG_SECTION,
    DEFAULT_CACHE_MINUTES,
    GITHUB_AUTH_PROVIDER_ID,
} from "../constants.js";
import { downloadAvatar, fetchAuthenticatedProfile } from "../github/githubApi.js";
import type { DownloadedAvatar } from "../github/githubApi.js";
import type { GitHubAuthService } from "../github/githubAuth.js";
import type { ProfileCache } from "../github/profileCache.js";
import type { GitHubProfile } from "../types/github.js";
import type { ProfileViewState } from "../types/viewState.js";
import { getErrorMessage } from "../utils/errors.js";

export class ProfileService implements vscode.Disposable {
    private readonly stateEmitter = new vscode.EventEmitter<ProfileViewState>();
    private readonly disposables: vscode.Disposable[] = [];
    private refreshTimer: NodeJS.Timeout | undefined;
    private currentState: ProfileViewState = {
        kind: "loading",
        message: "Comprobando la autenticación de GitHub…",
    };
    private refreshPromise: Promise<void> | undefined;

    public readonly onDidChangeState = this.stateEmitter.event;

    public constructor(
        private readonly auth: GitHubAuthService,
        private readonly cache: ProfileCache,
        private readonly output: vscode.OutputChannel,
    ) {
        this.disposables.push(
            vscode.authentication.onDidChangeSessions((event) => {
                if (event.provider.id === GITHUB_AUTH_PROVIDER_ID) {
                    void this.handleAuthenticationChanged();
                }
            }),
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration(CONFIG_SECTION)) {
                    this.configureAutoRefresh();
                }
            }),
        );
    }

    public get state(): ProfileViewState {
        return this.currentState;
    }

    public get profile(): GitHubProfile | undefined {
        return this.currentState.kind === "ready" ? this.currentState.profile : undefined;
    }

    public async initialize(): Promise<void> {
        const cached = this.cache.getRecord();
        if (cached) {
            const avatarUri = await this.cache.getAvatarUri(cached);
            this.setState({
                kind: "ready",
                profile: cached.profile,
                stale: !this.cache.isFresh(cached, this.getCacheMinutes()),
                ...(avatarUri ? { avatarUri } : {}),
            });
        }

        await this.refresh({ interactive: false, force: false });
        this.configureAutoRefresh();
    }

    public async signIn(): Promise<void> {
        await this.refresh({ interactive: true, force: true });
    }

    public async refresh(options: { interactive: boolean; force: boolean }): Promise<void> {
        if (this.refreshPromise) {
            return this.refreshPromise;
        }

        this.refreshPromise = this.refreshInternal(options).finally(() => {
            this.refreshPromise = undefined;
        });

        return this.refreshPromise;
    }

    public dispose(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
        }

        this.stateEmitter.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }

    private async refreshInternal(options: {
        interactive: boolean;
        force: boolean;
    }): Promise<void> {
        const cached = this.cache.getRecord();
        const cacheIsFresh = cached ? this.cache.isFresh(cached, this.getCacheMinutes()) : false;

        if (!options.force && cacheIsFresh && cached) {
            const session = await this.auth.getSession(false);
            if (!session) {
                await this.cache.clear();
                this.setState({ kind: "signedOut" });
            }
            return;
        }

        if (!cached) {
            this.setState({ kind: "loading", message: "Cargando el perfil de GitHub…" });
        }

        try {
            const session = await this.auth.getSession(options.interactive);
            if (!session) {
                await this.cache.clear();
                this.setState({ kind: "signedOut" });
                return;
            }

            const profile = await fetchAuthenticatedProfile(session.accessToken);

            let avatar: DownloadedAvatar | undefined;
            try {
                avatar = await downloadAvatar(profile.avatarUrl);
            } catch (error) {
                this.output.appendLine(
                    `La descarga del avatar ha fallado: ${getErrorMessage(error)}`,
                );
            }

            const record = await this.cache.save(profile, avatar);
            const avatarUri = await this.cache.getAvatarUri(record);
            this.setState({
                kind: "ready",
                profile,
                stale: false,
                ...(avatarUri ? { avatarUri } : {}),
            });
            this.output.appendLine(`Perfil de GitHub cargado para @${profile.login}.`);
        } catch (error) {
            const message = getErrorMessage(error);
            this.output.appendLine(`La actualización del perfil ha fallado: ${message}`);

            if (cached) {
                const avatarUri = await this.cache.getAvatarUri(cached);
                this.setState({
                    kind: "ready",
                    profile: cached.profile,
                    stale: true,
                    ...(avatarUri ? { avatarUri } : {}),
                });
            } else {
                this.setState({ kind: "error", message });
            }

            if (options.interactive) {
                throw error;
            }
        }
    }

    private async handleAuthenticationChanged(): Promise<void> {
        const session = await this.auth.getSession(false);
        if (!session) {
            await this.cache.clear();
            this.setState({ kind: "signedOut" });
            return;
        }

        await this.refresh({ interactive: false, force: true });
    }

    private configureAutoRefresh(): void {
        if (this.refreshTimer) {
            clearInterval(this.refreshTimer);
            this.refreshTimer = undefined;
        }

        const enabled = vscode.workspace.getConfiguration(CONFIG_SECTION).get("autoRefresh", true);
        if (!enabled) {
            return;
        }

        this.refreshTimer = setInterval(() => {
            void this.refresh({ interactive: false, force: false });
        }, AUTO_REFRESH_INTERVAL_MS);
    }

    private getCacheMinutes(): number {
        return vscode.workspace
            .getConfiguration(CONFIG_SECTION)
            .get("cacheMinutes", DEFAULT_CACHE_MINUTES);
    }

    private setState(state: ProfileViewState): void {
        this.currentState = state;
        this.stateEmitter.fire(state);
        void vscode.commands.executeCommand(
            "setContext",
            "githubAvatar.isAuthenticated",
            state.kind === "ready",
        );
    }
}
