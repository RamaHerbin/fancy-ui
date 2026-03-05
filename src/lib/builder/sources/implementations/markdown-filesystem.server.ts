import { readdir, readFile, stat } from "fs/promises";
import { join, resolve } from "path";
import matter from "gray-matter";
import { StorageError } from "../../storage/errors.js";
import type { ContentSource, ContentSourceItem, RawContent } from "../types.js";

export class MarkdownFilesystemSource implements ContentSource {
	readonly name = "Local Markdown Files";
	readonly type = "markdown-filesystem";
	private dir: string;

	constructor(dir: string) {
		this.dir = resolve(dir);
	}

	private validateId(id: string): void {
		if (id.includes("..") || id.includes("/") || id.includes("\\")) {
			throw new StorageError("AUTH", `Invalid content ID: ${id}`);
		}
	}

	async list(): Promise<ContentSourceItem[]> {
		let files: string[];
		try {
			files = await readdir(this.dir);
		} catch {
			return [];
		}

		const items: ContentSourceItem[] = [];

		for (const file of files) {
			if (!file.endsWith(".md")) continue;
			try {
				const filePath = join(this.dir, file);
				const raw = await readFile(filePath, "utf-8");
				const fileStat = await stat(filePath);
				const { data: frontmatter } = matter(raw);

				items.push({
					id: file,
					title: (frontmatter.title as string) || file.replace(/\.md$/, ""),
					updatedAt: frontmatter.updatedAt || fileStat.mtime.toISOString(),
					meta: frontmatter,
				});
			} catch {
				// Skip unreadable files
			}
		}

		items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
		return items;
	}

	async get(id: string): Promise<RawContent> {
		this.validateId(id);

		let raw: string;
		try {
			raw = await readFile(join(this.dir, id), "utf-8");
		} catch (err: unknown) {
			if (err && typeof err === "object" && "code" in err && err.code === "ENOENT") {
				throw StorageError.notFound(id);
			}
			throw err;
		}

		const { content, data: frontmatter } = matter(raw);
		return {
			id,
			content,
			meta: frontmatter,
		};
	}
}
