import type { GitHubProfile } from "../types/github.js";

const GITHUB_API_URL = "https://api.github.com/user";
const GITHUB_API_VERSION = "2022-11-28";
const REQUEST_TIMEOUT_MS = 12_000;

export interface DownloadedAvatar {
    readonly bytes: Uint8Array;
    readonly extension: "png" | "jpg" | "webp" | "avif";
}

export class GitHubApiError extends Error {
    public constructor(
        message: string,
        public readonly status?: number,
    ) {
        super(message);
        this.name = "GitHubApiError";
    }
}

export async function fetchAuthenticatedProfile(accessToken: string): Promise<GitHubProfile> {
    const response = await fetchWithTimeout(GITHUB_API_URL, {
        headers: {
            Accept: "application/vnd.github+json",
            Authorization: `Bearer ${accessToken}`,
            "User-Agent": "github-avatar-vscode",
            "X-GitHub-Api-Version": GITHUB_API_VERSION,
        },
    });

    if (!response.ok) {
        throw new GitHubApiError(
            `GitHub devolvió ${response.status} ${response.statusText}.`,
            response.status,
        );
    }

    const payload: unknown = await response.json();
    return parseGitHubProfile(payload);
}

export async function downloadAvatar(avatarUrl: string): Promise<DownloadedAvatar> {
    const url = new URL(avatarUrl);
    if (url.protocol !== "https:") {
        throw new GitHubApiError("La URL del avatar de GitHub debe usar HTTPS.");
    }

    const response = await fetchWithTimeout(url, {
        headers: {
            Accept: "image/avif,image/webp,image/png,image/jpeg,*/*",
            "User-Agent": "github-avatar-vscode",
        },
    });

    if (!response.ok) {
        throw new GitHubApiError(
            `No se ha podido descargar el avatar de GitHub (${response.status}).`,
            response.status,
        );
    }

    return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        extension: getImageExtension(response.headers.get("content-type")),
    };
}

function getImageExtension(contentType: string | null): DownloadedAvatar["extension"] {
    switch (contentType?.split(";", 1)[0]?.trim().toLowerCase()) {
        case "image/jpeg":
            return "jpg";
        case "image/webp":
            return "webp";
        case "image/avif":
            return "avif";
        case "image/png":
        default:
            return "png";
    }
}

export function parseGitHubProfile(payload: unknown): GitHubProfile {
    if (!isRecord(payload)) {
        throw new GitHubApiError("GitHub devolvió una carga de perfil no válida.");
    }

    const name = optionalString(payload, "name");
    const bio = optionalString(payload, "bio");
    const company = optionalString(payload, "company");
    const location = optionalString(payload, "location");

    return {
        id: requireNumber(payload, "id"),
        login: requireString(payload, "login"),
        avatarUrl: requireString(payload, "avatar_url"),
        htmlUrl: requireString(payload, "html_url"),
        followers: requireNumber(payload, "followers"),
        following: requireNumber(payload, "following"),
        publicRepos: requireNumber(payload, "public_repos"),
        ...(name ? { name } : {}),
        ...(bio ? { bio } : {}),
        ...(company ? { company } : {}),
        ...(location ? { location } : {}),
    };
}

async function fetchWithTimeout(input: string | URL, init: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            throw new GitHubApiError("La solicitud a GitHub ha superado el tiempo de espera.");
        }

        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function requireString(record: Record<string, unknown>, key: string): string {
    const value = record[key];
    if (typeof value !== "string" || value.length === 0) {
        throw new GitHubApiError(`El campo de perfil de GitHub "${key}" falta o no es válido.`);
    }

    return value;
}

function optionalString(record: Record<string, unknown>, key: string): string | undefined {
    const value = record[key];
    return typeof value === "string" && value.length > 0 ? value : undefined;
}

function requireNumber(record: Record<string, unknown>, key: string): number {
    const value = record[key];
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new GitHubApiError(`El campo de perfil de GitHub "${key}" falta o no es válido.`);
    }

    return value;
}
