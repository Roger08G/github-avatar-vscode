export const VIEW_CONTAINER_ID = "githubAvatar";
export const PROFILE_VIEW_ID = "githubAvatar.profileView";

export const COMMANDS = {
    signIn: "githubAvatar.signIn",
    refresh: "githubAvatar.refresh",
    openProfile: "githubAvatar.openProfile",
    showProfile: "githubAvatar.showProfile",
} as const;

export const CONTEXT_KEYS = {
    isAuthenticated: "githubAvatar.isAuthenticated",
} as const;

export const GITHUB_AUTH_PROVIDER_ID = "github";
export const GITHUB_AUTH_SCOPES = ["read:user"] as const;

export const CONFIG_SECTION = "githubAvatar";
export const DEFAULT_CACHE_MINUTES = 30;
export const AUTO_REFRESH_INTERVAL_MS = 30 * 60 * 1000;
