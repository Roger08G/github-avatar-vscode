import * as vscode from "vscode";
import { COMMANDS, CONFIG_SECTION } from "../constants.js";
import type { ProfileService } from "../services/profileService.js";
import type { ProfileViewState } from "../types/viewState.js";

export class StatusBarController implements vscode.Disposable {
    private readonly item = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
    private readonly disposables: vscode.Disposable[] = [];

    public constructor(private readonly profileService: ProfileService) {
        this.item.command = COMMANDS.showProfile;
        this.disposables.push(
            this.profileService.onDidChangeState((state) => this.update(state)),
            vscode.workspace.onDidChangeConfiguration((event) => {
                if (event.affectsConfiguration(`${CONFIG_SECTION}.showStatusBar`)) {
                    this.update(this.profileService.state);
                }
            }),
        );

        this.update(this.profileService.state);
    }

    public dispose(): void {
        this.item.dispose();
        for (const disposable of this.disposables) {
            disposable.dispose();
        }
    }

    private update(state: ProfileViewState): void {
        const enabled = vscode.workspace
            .getConfiguration(CONFIG_SECTION)
            .get("showStatusBar", true);
        if (!enabled) {
            this.item.hide();
            return;
        }

        switch (state.kind) {
            case "loading":
                this.item.text = "$(sync~spin) GitHub";
                this.item.tooltip = state.message;
                break;
            case "signedOut":
                this.item.text = "$(github) Iniciar sesión";
                this.item.tooltip = "Inicia sesión con GitHub para cargar el avatar de tu perfil";
                break;
            case "error":
                this.item.text = "$(warning) GitHub";
                this.item.tooltip = state.message;
                break;
            case "ready":
                this.item.text = `$(github) @${state.profile.login}`;
                this.item.tooltip = state.stale
                    ? "Avatar de GitHub — datos de perfil en caché"
                    : `Avatar de GitHub — ${state.profile.name ?? state.profile.login}`;
                break;
        }

        this.item.show();
    }
}
