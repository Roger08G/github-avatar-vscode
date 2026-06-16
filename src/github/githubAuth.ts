import * as vscode from "vscode";
import { GITHUB_AUTH_PROVIDER_ID, GITHUB_AUTH_SCOPES } from "../constants.js";

export class GitHubAuthService {
    public async getSession(
        interactive: boolean,
    ): Promise<vscode.AuthenticationSession | undefined> {
        if (interactive) {
            return vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, GITHUB_AUTH_SCOPES, {
                createIfNone: true,
            });
        }

        return vscode.authentication.getSession(GITHUB_AUTH_PROVIDER_ID, GITHUB_AUTH_SCOPES, {
            silent: true,
        });
    }
}
