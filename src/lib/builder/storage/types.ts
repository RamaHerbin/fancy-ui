import type { PageDocument, PageMeta } from '../types/page.js';

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
