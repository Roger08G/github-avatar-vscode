import * as vscode from "vscode";
import { COMMANDS, PROFILE_VIEW_ID, VIEW_CONTAINER_ID } from "../constants.js";
import type { ProfileService } from "../services/profileService.js";
import { getErrorMessage } from "../utils/errors.js";

export function registerCommands(
    context: vscode.ExtensionContext,
    profileService: ProfileService,
): void {
    context.subscriptions.push(
        vscode.commands.registerCommand(COMMANDS.signIn, async () => {
            try {
                await profileService.signIn();
            } catch (error) {
                void vscode.window.showErrorMessage(
                    `El inicio de sesión en GitHub ha fallado: ${getErrorMessage(error)}`,
                );
            }
        }),
        vscode.commands.registerCommand(COMMANDS.refresh, async () => {
            try {
                await profileService.refresh({ interactive: false, force: true });
            } catch (error) {
                void vscode.window.showErrorMessage(
                    `La actualización de GitHub ha fallado: ${getErrorMessage(error)}`,
                );
            }
        }),
        vscode.commands.registerCommand(COMMANDS.openProfile, async () => {
            const profile = profileService.profile;
            if (!profile) {
                void vscode.window.showInformationMessage(
                    "No hay ningún perfil de GitHub cargado en este momento.",
                );
                return;
            }

            await vscode.env.openExternal(vscode.Uri.parse(profile.htmlUrl));
        }),
        vscode.commands.registerCommand(COMMANDS.showProfile, async () => {
            await vscode.commands.executeCommand(`workbench.view.extension.${VIEW_CONTAINER_ID}`);
            await vscode.commands.executeCommand(`${PROFILE_VIEW_ID}.focus`);
        }),
    );
}
