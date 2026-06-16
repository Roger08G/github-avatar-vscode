import { describe, expect, it } from 'vitest';
import { GitHubApiError, parseGitHubProfile } from '../src/github/githubApi.js';

describe('parseGitHubProfile', () => {
    it('maps the GitHub user payload', () => {
        const profile = parseGitHubProfile({
            id: 42,
            login: 'roger',
            name: 'Roger',
            avatar_url: 'https://avatars.githubusercontent.com/u/42',
            html_url: 'https://github.com/roger',
            bio: 'Developer',
            company: null,
            location: 'Barcelona',
            followers: 10,
            following: 3,
            public_repos: 7,
        });

        expect(profile).toEqual({
            id: 42,
            login: 'roger',
            name: 'Roger',
            avatarUrl: 'https://avatars.githubusercontent.com/u/42',
            htmlUrl: 'https://github.com/roger',
            bio: 'Developer',
            location: 'Barcelona',
            followers: 10,
            following: 3,
            publicRepos: 7,
        });
    });

    it('rejects incomplete payloads', () => {
        expect(() => parseGitHubProfile({ login: 'roger' })).toThrow(GitHubApiError);
    });
});
