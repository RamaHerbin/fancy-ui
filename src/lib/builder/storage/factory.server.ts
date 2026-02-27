import { dev } from "$app/environment";
import { env } from "$env/dynamic/private";
import { error } from "@sveltejs/kit";
import type { PageStorage } from "./types.js";
import { GitHubStorage } from "./github.server.js";
import { FilesystemStorage } from "./filesystem.server.js";

/**
 * Returns the appropriate PageStorage for builder routes.
 *
 * Priority:
 * 1. GITHUB_TOKEN env var (PAT)       → GitHubStorage
 * 2. token param (OAuth user token)    → GitHubStorage
 * 3. dev mode                          → FilesystemStorage
 * 4. otherwise                         → throws
 */
export function getBuilderStorage(token?: string): PageStorage {
  const pat = env.GITHUB_TOKEN;
  const ghToken = pat || token;

  if (ghToken) {
    const owner = env.GITHUB_REPO_OWNER;
    const repo = env.GITHUB_REPO_NAME;

    if (!owner || !repo) {
      error(
        500,
        "Builder storage misconfigured: GITHUB_REPO_OWNER and GITHUB_REPO_NAME must be set",
      );
    }

    return new GitHubStorage({
      token: ghToken,
      owner,
      repo,
      branch: env.GITHUB_BRANCH || undefined,
      contentPath: env.GITHUB_CONTENT_PATH || undefined,
    });
  }

  if (dev) {
    return new FilesystemStorage();
  }

  error(
    500,
    "No storage backend available. Set GITHUB_TOKEN or configure GitHub OAuth.",
  );
}
