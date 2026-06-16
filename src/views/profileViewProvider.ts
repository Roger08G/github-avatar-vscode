import * as vscode from "vscode";
import { COMMANDS, PROFILE_VIEW_ID } from "../constants.js";
import type { ProfileService } from "../services/profileService.js";
import type { ProfileViewState } from "../types/viewState.js";
import { createNonce, escapeHtml } from "../utils/html.js";

interface WebviewMessage {
    readonly type: "signIn" | "refresh" | "openProfile";
}

export class ProfileViewProvider implements vscode.WebviewViewProvider, vscode.Disposable {
    private view: vscode.WebviewView | undefined;
    private readonly disposable: vscode.Disposable;

    public constructor(
        private readonly context: vscode.ExtensionContext,
        private readonly profileService: ProfileService,
    ) {
        this.disposable = this.profileService.onDidChangeState((state) => this.render(state));
    }

    public resolveWebviewView(webviewView: vscode.WebviewView): void {
        this.view = webviewView;
        webviewView.webview.options = {
            enableScripts: true,
            localResourceRoots: [this.context.extensionUri, this.context.globalStorageUri],
        };

        webviewView.webview.onDidReceiveMessage((message: WebviewMessage) => {
            switch (message.type) {
                case "signIn":
                    void vscode.commands.executeCommand(COMMANDS.signIn);
                    break;
                case "refresh":
                    void vscode.commands.executeCommand(COMMANDS.refresh);
                    break;
                case "openProfile":
                    void vscode.commands.executeCommand(COMMANDS.openProfile);
                    break;
            }
        });

        this.render(this.profileService.state);
    }

    public dispose(): void {
        this.disposable.dispose();
    }

    private render(state: ProfileViewState): void {
        if (!this.view) {
            return;
        }

        this.view.webview.html = this.getHtml(this.view.webview, state);
    }

    private getHtml(webview: vscode.Webview, state: ProfileViewState): string {
        const nonce = createNonce();
        const defaultAvatarUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "media", "default-avatar.svg"),
        );

        const content = this.getContent(webview, state, defaultAvatarUri.toString());

        return `<!doctype html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource} data:; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}';">
  <style nonce="${nonce}">
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 18px;
      color: var(--vscode-foreground);
      background: var(--vscode-sideBar-background);
      font-family: var(--vscode-font-family);
      font-size: var(--vscode-font-size);
    }
    .shell { display: grid; gap: 16px; }
    .card {
      padding: 18px;
      border: 1px solid var(--vscode-widget-border, transparent);
      border-radius: 12px;
      background: var(--vscode-editorWidget-background);
      text-align: center;
    }
    .avatar {
      width: 96px;
      height: 96px;
      border-radius: 50%;
      object-fit: cover;
      border: 2px solid var(--vscode-focusBorder);
      background: var(--vscode-editor-background);
    }
    h1 { margin: 12px 0 4px; font-size: 18px; font-weight: 650; }
    .login { color: var(--vscode-descriptionForeground); }
    .bio { margin: 12px auto 0; max-width: 30rem; line-height: 1.45; }
    .meta { display: grid; gap: 6px; margin-top: 14px; text-align: left; }
    .meta-row { color: var(--vscode-descriptionForeground); overflow-wrap: anywhere; }
    .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: 16px; }
    .stat {
      padding: 10px 6px;
      border-radius: 8px;
      background: var(--vscode-editor-background);
    }
    .stat strong { display: block; font-size: 16px; color: var(--vscode-foreground); }
    .stat span { color: var(--vscode-descriptionForeground); font-size: 11px; }
    .actions { display: grid; gap: 8px; }
    button {
      width: 100%;
      border: 1px solid transparent;
      border-radius: 4px;
      padding: 8px 12px;
      color: var(--vscode-button-foreground);
      background: var(--vscode-button-background);
      cursor: pointer;
      font: inherit;
    }
    button:hover { background: var(--vscode-button-hoverBackground); }
    button.secondary {
      color: var(--vscode-button-secondaryForeground);
      background: var(--vscode-button-secondaryBackground);
    }
    button.secondary:hover { background: var(--vscode-button-secondaryHoverBackground); }
    .notice {
      padding: 10px 12px;
      border-left: 3px solid var(--vscode-editorWarning-foreground);
      background: var(--vscode-textBlockQuote-background);
      color: var(--vscode-descriptionForeground);
      text-align: left;
    }
    .empty { text-align: center; padding: 24px 8px; }
    .empty img { width: 72px; height: 72px; opacity: 0.85; }
    .error { color: var(--vscode-errorForeground); overflow-wrap: anywhere; }
  </style>
</head>
<body>
  <main class="shell">${content}</main>
  <script nonce="${nonce}">
    const vscode = acquireVsCodeApi();
    document.querySelectorAll('[data-action]').forEach((button) => {
      button.addEventListener('click', () => {
        vscode.postMessage({ type: button.dataset.action });
      });
    });
  </script>
</body>
</html>`;
    }

    private getContent(
        webview: vscode.Webview,
        state: ProfileViewState,
        defaultAvatar: string,
    ): string {
        switch (state.kind) {
            case "loading":
                return `<section class="empty"><img src="${defaultAvatar}" alt=""><p>${escapeHtml(state.message)}</p></section>`;
            case "signedOut":
                return `<section class="empty">
  <img src="${defaultAvatar}" alt="Avatar de perfil predeterminado">
  <h1>Se necesita una cuenta de GitHub</h1>
  <p>Concede a esta extensión acceso a la sesión de GitHub que ya administra VS Code.</p>
</section>
<section class="actions"><button data-action="signIn">Iniciar sesión con GitHub</button></section>`;
            case "error":
                return `<section class="empty">
  <img src="${defaultAvatar}" alt="Avatar de perfil predeterminado">
  <h1>No se ha podido cargar el perfil</h1>
  <p class="error">${escapeHtml(state.message)}</p>
</section>
<section class="actions"><button data-action="refresh">Reintentar</button></section>`;
            case "ready": {
                const profile = state.profile;
                const avatar = state.avatarUri
                    ? webview.asWebviewUri(state.avatarUri).toString()
                    : defaultAvatar;
                const displayName = profile.name ?? profile.login;
                const meta = [
                    profile.company
                        ? `<div class="meta-row">Empresa: ${escapeHtml(profile.company)}</div>`
                        : "",
                    profile.location
                        ? `<div class="meta-row">Ubicación: ${escapeHtml(profile.location)}</div>`
                        : "",
                ].join("");
                const staleNotice = state.stale
                    ? '<div class="notice">Mostrando datos de perfil en caché porque la última actualización ha fallado.</div>'
                    : "";

                return `${staleNotice}
<section class="card">
  <img class="avatar" src="${avatar}" alt="Avatar de GitHub para ${escapeHtml(profile.login)}">
  <h1>${escapeHtml(displayName)}</h1>
  <div class="login">@${escapeHtml(profile.login)}</div>
  ${profile.bio ? `<p class="bio">${escapeHtml(profile.bio)}</p>` : ""}
  ${meta ? `<div class="meta">${meta}</div>` : ""}
  <div class="stats">
    <div class="stat"><strong>${profile.publicRepos}</strong><span>Repositorios</span></div>
    <div class="stat"><strong>${profile.followers}</strong><span>Seguidores</span></div>
    <div class="stat"><strong>${profile.following}</strong><span>Siguiendo</span></div>
  </div>
</section>
<section class="actions">
  <button data-action="openProfile">Abrir perfil en GitHub</button>
  <button class="secondary" data-action="refresh">Actualizar</button>
</section>`;
            }
        }
    }
}

export const profileViewId = PROFILE_VIEW_ID;
