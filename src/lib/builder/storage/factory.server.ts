import { dev } from '$app/environment';
import { env } from '$env/dynamic/private';
import type { Cookies } from '@sveltejs/kit';
import type { PageStorage } from './types.js';
import { GitHubStorage } from './github.server.js';
import { FilesystemStorage } from './filesystem.server.js';
import { SupabaseStorage } from './supabase.server.js';
import { isSupabaseConfigured } from '$lib/server/supabase.server.js';

export type StorageOpts = { cookies: Cookies } | { githubToken?: string };

/**
 * Returns the appropriate PageStorage for builder routes.
 *
 * Priority:
 * 1. SUPABASE_URL configured + cookies provided → SupabaseStorage
 * 2. GITHUB_TOKEN env var (PAT) or githubToken   → GitHubStorage
 * 3. dev mode                                     → FilesystemStorage
 * 4. otherwise                                    → throws
 */
export function getBuilderStorage(opts?: StorageOpts): PageStorage {
	// 1. Supabase configured + cookies provided
	if (isSupabaseConfigured() && opts && 'cookies' in opts) {
		return new SupabaseStorage({ cookies: opts.cookies });
	}

	// 2. GitHub PAT or OAuth token
	const pat = env.GITHUB_TOKEN;
	const oauthToken = opts && 'githubToken' in opts ? opts.githubToken : undefined;
	const ghToken = pat || oauthToken;

	if (ghToken) {
		const owner = env.GITHUB_REPO_OWNER;
		const repo = env.GITHUB_REPO_NAME;

		if (!owner || !repo) {
			throw new Error('GITHUB_REPO_OWNER and GITHUB_REPO_NAME must be set');
		}

		return new GitHubStorage({
			token: ghToken,
			owner,
			repo,
			branch: env.GITHUB_BRANCH || undefined,
			contentPath: env.GITHUB_CONTENT_PATH || undefined
		});
	}

	// 3. Dev mode fallback
	if (dev) {
		return new FilesystemStorage();
	}

	throw new Error(
		'No storage backend available. Set SUPABASE_URL, GITHUB_TOKEN, or configure OAuth.'
	);
}
