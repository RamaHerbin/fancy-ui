import { readdir, readFile, writeFile, unlink, mkdir } from "fs/promises";
import { join, resolve } from "path";
import type { PageDocument } from "../types/page.js";
import type { SiteConfig } from "../types/site.js";
import { isValidSiteConfig } from "../types/site.js";
import type { PageStorage, PageListItem } from "./types.js";
import { StorageError } from "./errors.js";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function validateSlug(slug: string): void {
	if (!SLUG_RE.test(slug)) {
		throw new Error(`Invalid page slug: ${slug}`);
	}
}

export class FilesystemStorage implements PageStorage {
	private dir: string;

	constructor(dir?: string) {
		this.dir = dir ?? resolve(process.cwd(), "content", "pages");
	}

	private async ensureDir(): Promise<void> {
		await mkdir(this.dir, { recursive: true });
	}

	private filePath(slug: string): string {
		return join(this.dir, `${slug}.json`);
	}

	async list(): Promise<PageListItem[]> {
		await this.ensureDir();

		let files: string[];
		try {
			files = await readdir(this.dir);
		} catch {
			return [];
		}

		const pages: PageListItem[] = [];

		for (const file of files) {
			if (!file.endsWith(".json")) continue;
			try {
				const raw = await readFile(join(this.dir, file), "utf-8");
				const doc: PageDocument = JSON.parse(raw);
				pages.push({
					slug: doc.meta.slug,
					title: doc.meta.title,
					status: doc.meta.status,
					updatedAt: doc.meta.updatedAt,
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

		let raw: string;
		try {
			raw = await readFile(this.filePath(slug), "utf-8");
		} catch (err: unknown) {
			if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
				throw StorageError.notFound(slug);
			}
			throw err;
		}
		const page: PageDocument = JSON.parse(raw);

		if (page.version !== 1) {
			throw new Error(`Unsupported page version: ${page.version}`);
		}
		if (!page.meta || !page.meta.title || !page.meta.slug || !Array.isArray(page.body)) {
			throw new Error("Malformed page document: missing required fields");
		}

		return page;
	}

	async save(page: PageDocument): Promise<void> {
		validateSlug(page.meta.slug);
		await this.ensureDir();

		page.meta.updatedAt = new Date().toISOString();
		const json = JSON.stringify(page, null, 2);
		await writeFile(this.filePath(page.meta.slug), json, "utf-8");
	}

	async delete(slug: string): Promise<void> {
		validateSlug(slug);
		try {
			await unlink(this.filePath(slug));
		} catch (err: unknown) {
			if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
				throw StorageError.notFound(slug);
			}
			throw err;
		}
	}

	async publish(slug: string): Promise<void> {
		const page = await this.get(slug);
		page.meta.status = "published";
		await this.save(page);
	}

	private get siteConfigPath(): string {
		return resolve(this.dir, "..", "site.json");
	}

	async getSiteConfig(): Promise<SiteConfig | null> {
		try {
			const raw = await readFile(this.siteConfigPath, "utf-8");
			const doc = JSON.parse(raw);
			if (!isValidSiteConfig(doc)) return null;
			return doc;
		} catch (err: unknown) {
			if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
				return null;
			}
			throw err;
		}
	}

	async saveSiteConfig(config: SiteConfig): Promise<void> {
		await this.ensureDir();
		config.updatedAt = new Date().toISOString();
		const json = JSON.stringify(config, null, 2);
		await writeFile(this.siteConfigPath, json, "utf-8");
	}
}

let _instance: FilesystemStorage | undefined;

export function getStorage(): PageStorage {
	if (!_instance) {
		_instance = new FilesystemStorage();
	}
	return _instance;
}
