import * as vscode from "vscode";
import { registerCommands } from "./commands/registerCommands.js";
import { PROFILE_VIEW_ID } from "./constants.js";
import { GitHubAuthService } from "./github/githubAuth.js";
import { ProfileCache } from "./github/profileCache.js";
import { ProfileService } from "./services/profileService.js";
import { StatusBarController } from "./status/statusBarController.js";
import { ProfileViewProvider } from "./views/profileViewProvider.js";

export function activate(context: vscode.ExtensionContext): void {
    const output = vscode.window.createOutputChannel("GitHub Avatar");
    const auth = new GitHubAuthService();
    const cache = new ProfileCache(context);
    const profileService = new ProfileService(auth, cache, output);
    const profileViewProvider = new ProfileViewProvider(context, profileService);
    const statusBar = new StatusBarController(profileService);

    context.subscriptions.push(
        output,
        profileService,
        profileViewProvider,
        statusBar,
        vscode.window.registerWebviewViewProvider(PROFILE_VIEW_ID, profileViewProvider, {
            webviewOptions: {
                retainContextWhenHidden: true,
            },
        }),
    );

    registerCommands(context, profileService);
    void profileService.initialize();
}

export function deactivate(): void {
    // VS Code libera todas las suscripciones registradas en el contexto de la extensión.
}
