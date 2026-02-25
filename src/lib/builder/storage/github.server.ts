import type { PageDocument } from '../types/page.js';
import type { PageStorage, PageListItem } from './types.js';
import { StorageError } from './errors.js';

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(slug: string): void {
	if (!SLUG_RE.test(slug)) {
		throw new Error(`Invalid page slug: ${slug}`);
	}
}

interface GitHubFileResponse {
	content: string;
	sha: string;
	name: string;
	path: string;
	encoding: string;
}

interface GitHubDirEntry {
	name: string;
	path: string;
	sha: string;
	type: 'file' | 'dir';
}

export interface GitHubStorageConfig {
	token: string;
	owner: string;
	repo: string;
	branch?: string;
	contentPath?: string;
}

export class GitHubStorage implements PageStorage {
	private token: string;
	private owner: string;
	private repo: string;
	private branch: string;
	private contentPath: string;

	constructor(config: GitHubStorageConfig) {
		this.token = config.token;
		this.owner = config.owner;
		this.repo = config.repo;
		this.branch = config.branch ?? 'main';
		this.contentPath = config.contentPath ?? 'content/pages';
	}

	private get baseUrl(): string {
		return `https://api.github.com/repos/${this.owner}/${this.repo}/contents`;
	}

	private filePath(slug: string): string {
		return `${this.contentPath}/${slug}.json`;
	}

	private async request<T>(
		path: string,
		options: RequestInit = {}
	): Promise<T> {
		const url = `${this.baseUrl}/${path}${path.includes('?') ? '&' : '?'}ref=${this.branch}`;

		const res = await fetch(url, {
			...options,
			headers: {
				Authorization: `Bearer ${this.token}`,
				Accept: 'application/vnd.github.v3+json',
				'Content-Type': 'application/json',
				'X-GitHub-Api-Version': '2022-11-28',
				...options.headers
			}
		});

		if (!res.ok) {
			if (res.status === 404) {
				throw StorageError.notFound(path);
			}
			if (res.status === 401 || res.status === 403) {
				throw StorageError.auth('GitHub API authentication failed');
			}
			if (res.status === 409) {
				throw new StorageError('CONFLICT', 'SHA conflict — file was modified concurrently');
			}
			const body = await res.text().catch(() => '');
			throw new StorageError('UNKNOWN', `GitHub API error ${res.status}: ${body}`);
		}

		return res.json() as Promise<T>;
	}

	/** PUT (create or update) a file — does NOT append ?ref= (uses `branch` in body) */
	private async putFile(
		path: string,
		content: string,
		message: string,
		sha?: string
	): Promise<void> {
		const url = `${this.baseUrl}/${path}`;

		const body: Record<string, string> = {
			message,
			content: Buffer.from(content, 'utf-8').toString('base64'),
			branch: this.branch
		};
		if (sha) {
			body.sha = sha;
		}

		const res = await fetch(url, {
			method: 'PUT',
			headers: {
				Authorization: `Bearer ${this.token}`,
				Accept: 'application/vnd.github.v3+json',
				'Content-Type': 'application/json',
				'X-GitHub-Api-Version': '2022-11-28'
			},
			body: JSON.stringify(body)
		});

		if (!res.ok) {
			if (res.status === 401 || res.status === 403) {
				throw StorageError.auth('GitHub API authentication failed');
			}
			if (res.status === 409) {
				throw new StorageError('CONFLICT', 'SHA conflict — file was modified concurrently');
			}
			if (res.status === 422) {
				// 422 can mean the file already exists when creating without sha
				const text = await res.text().catch(() => '');
				throw new StorageError('CONFLICT', `GitHub API 422: ${text}`);
			}
			const text = await res.text().catch(() => '');
			throw new StorageError('UNKNOWN', `GitHub API error ${res.status}: ${text}`);
		}
	}

	/** DELETE a file */
	private async deleteFile(path: string, sha: string, message: string): Promise<void> {
		const url = `${this.baseUrl}/${path}`;

		const res = await fetch(url, {
			method: 'DELETE',
			headers: {
				Authorization: `Bearer ${this.token}`,
				Accept: 'application/vnd.github.v3+json',
				'Content-Type': 'application/json',
				'X-GitHub-Api-Version': '2022-11-28'
			},
			body: JSON.stringify({
				message,
				sha,
				branch: this.branch
			})
		});

		if (!res.ok) {
			if (res.status === 404) {
				throw StorageError.notFound(path);
			}
			if (res.status === 401 || res.status === 403) {
				throw StorageError.auth('GitHub API authentication failed');
			}
			const text = await res.text().catch(() => '');
			throw new StorageError('UNKNOWN', `GitHub API error ${res.status}: ${text}`);
		}
	}

	private decodeContent(b64: string): string {
		// GitHub returns base64 with newlines — strip them
		const clean = b64.replace(/\n/g, '');
		return Buffer.from(clean, 'base64').toString('utf-8');
	}

	/** Get file content and SHA */
	private async getFile(slug: string): Promise<{ content: string; sha: string }> {
		const path = this.filePath(slug);
		const file = await this.request<GitHubFileResponse>(path);
		return {
			content: this.decodeContent(file.content),
			sha: file.sha
		};
	}

	async list(): Promise<PageListItem[]> {
		let entries: GitHubDirEntry[];
		try {
			entries = await this.request<GitHubDirEntry[]>(this.contentPath);
		} catch (err) {
			if (err instanceof StorageError && err.code === 'NOT_FOUND') {
				return []; // Directory doesn't exist yet
			}
			throw err;
		}

		const pages: PageListItem[] = [];

		for (const entry of entries) {
			if (entry.type !== 'file' || !entry.name.endsWith('.json')) continue;

			try {
				const file = await this.request<GitHubFileResponse>(entry.path);
				const doc: PageDocument = JSON.parse(this.decodeContent(file.content));
				pages.push({
					slug: doc.meta.slug,
					title: doc.meta.title,
					status: doc.meta.status,
					updatedAt: doc.meta.updatedAt
				});
			} catch {
				// Skip invalid files
			}
		}

		pages.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
		return pages;
	}

	async get(slug: string): Promise<PageDocument> {
		validateSlug(slug);

		const { content } = await this.getFile(slug);
		const page: PageDocument = JSON.parse(content);

		if (page.version !== 1) {
			throw new Error(`Unsupported page version: ${page.version}`);
		}
		if (!page.meta || !page.meta.title || !page.meta.slug || !Array.isArray(page.body)) {
			throw new Error('Malformed page document: missing required fields');
		}

		return page;
	}

	async save(page: PageDocument): Promise<void> {
		validateSlug(page.meta.slug);
		page.meta.updatedAt = new Date().toISOString();
		const json = JSON.stringify(page, null, 2);
		const path = this.filePath(page.meta.slug);

		// Try to get existing file for SHA (update case)
		let sha: string | undefined;
		let isCreate = false;
		try {
			const existing = await this.getFile(page.meta.slug);
			sha = existing.sha;
		} catch (err) {
			if (err instanceof StorageError && err.code === 'NOT_FOUND') {
				isCreate = true;
			} else {
				throw err;
			}
		}

		const message = isCreate
			? `Create page: ${page.meta.slug}`
			: `Update page: ${page.meta.slug}`;

		await this.putFile(path, json, message, sha);
	}

	async delete(slug: string): Promise<void> {
		validateSlug(slug);

		const { sha } = await this.getFile(slug);
		await this.deleteFile(this.filePath(slug), sha, `Delete page: ${slug}`);
	}

	async publish(slug: string): Promise<void> {
		const page = await this.get(slug);
		page.meta.status = 'published';
		page.meta.updatedAt = new Date().toISOString();
		const json = JSON.stringify(page, null, 2);
		const path = this.filePath(slug);

		const { sha } = await this.getFile(slug);
		await this.putFile(path, json, `Publish page: ${slug}`, sha);
	}
}
