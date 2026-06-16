import type * as vscode from "vscode";
import type { GitHubProfile } from "./github.js";

export type ProfileViewState =
    | { readonly kind: "loading"; readonly message: string }
    | { readonly kind: "signedOut" }
    | {
          readonly kind: "ready";
          readonly profile: GitHubProfile;
          readonly avatarUri?: vscode.Uri;
          readonly stale: boolean;
      }
    | { readonly kind: "error"; readonly message: string };
