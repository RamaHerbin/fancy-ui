import type { PageDocument } from "../types/page.js";

const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidSlug(slug: string): boolean {
	return SLUG_RE.test(slug);
}

export interface PageListItem {
	slug: string;
	title: string;
	status: string;
	updatedAt: string;
}

export interface PageStorage {
	/** List all pages (metadata only) */
	list(): Promise<PageListItem[]>;

	/** Get a full page document by slug */
	get(slug: string): Promise<PageDocument>;

	/** Save (create or update) a page. Sets updatedAt automatically. */
	save(page: PageDocument): Promise<void>;

	/** Delete a page by slug */
	delete(slug: string): Promise<void>;

	/** Set a page's status to published */
	publish(slug: string): Promise<void>;
}

/** Validate that an object looks like a valid PageDocument */
export function isValidPageDocument(doc: unknown): doc is PageDocument {
	if (!doc || typeof doc !== "object") return false;
	const d = doc as Record<string, unknown>;
	if (d.version !== 1) return false;
	if (!d.meta || typeof d.meta !== "object") return false;
	const meta = d.meta as Record<string, unknown>;
	if (!meta.title || typeof meta.title !== "string") return false;
	if (!meta.slug || typeof meta.slug !== "string") return false;
	if (!Array.isArray(d.body)) return false;
	return true;
}
