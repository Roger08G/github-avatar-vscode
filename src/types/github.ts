export interface GitHubProfile {
    readonly id: number;
    readonly login: string;
    readonly name?: string;
    readonly avatarUrl: string;
    readonly htmlUrl: string;
    readonly bio?: string;
    readonly company?: string;
    readonly location?: string;
    readonly followers: number;
    readonly following: number;
    readonly publicRepos: number;
}

export interface CachedProfileRecord {
    readonly profile: GitHubProfile;
    readonly fetchedAt: number;
    readonly avatarFileName?: string;
}
