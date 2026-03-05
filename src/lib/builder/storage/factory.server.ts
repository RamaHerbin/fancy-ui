import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import type { PageStorage } from "./types.js";
import { GitHubStorage } from "./github.server.js";
import { FilesystemStorage } from "./filesystem.server.js";

type StorageBackend = "filesystem" | "github";

const VALID_BACKENDS: StorageBackend[] = ["filesystem", "github"];

function createGitHubStorage(token?: string): GitHubStorage {
	const ghToken = env.GITHUB_TOKEN || token;

	if (!ghToken) {
		error(500, "GitHub storage requires GITHUB_TOKEN env var or an OAuth token.");
	}

	const owner = env.GITHUB_REPO_OWNER;
	const repo = env.GITHUB_REPO_NAME;

	if (!owner || !repo) {
		error(500, "GITHUB_REPO_OWNER and GITHUB_REPO_NAME must be set for GitHub storage.");
	}

	return new GitHubStorage({
		token: ghToken,
		owner,
		repo,
		branch: env.GITHUB_BRANCH || undefined,
		contentPath: env.GITHUB_CONTENT_PATH || undefined,
	});
}

/**
 * Returns the appropriate PageStorage for builder routes.
 *
 * Selection:
 * 1. STORAGE_BACKEND env var (explicit) → use that backend
 * 2. Auto-detect fallback (backwards compatible):
 *    a. GITHUB_TOKEN or token param → GitHubStorage
 *    b. dev mode                    → FilesystemStorage
 *    c. otherwise                   → throws
 */
export function getBuilderStorage(token?: string): PageStorage {
	const backend = env.STORAGE_BACKEND as StorageBackend | undefined;

	if (backend) {
		if (!VALID_BACKENDS.includes(backend)) {
			error(
				500,
				`Unknown STORAGE_BACKEND: "${backend}". Valid values: ${VALID_BACKENDS.join(", ")}`
			);
		}

		switch (backend) {
			case "filesystem":
				return new FilesystemStorage(env.FILESYSTEM_STORAGE_DIR || undefined);
			case "github":
				return createGitHubStorage(token);
		}
	}

	// Auto-detect fallback (original behavior)
	const ghToken = env.GITHUB_TOKEN || token;
	if (ghToken) {
		return createGitHubStorage(token);
	}

	if (dev) {
		return new FilesystemStorage();
	}

	error(
		500,
		"No storage backend available. Set STORAGE_BACKEND, GITHUB_TOKEN, or configure OAuth."
	);
}
