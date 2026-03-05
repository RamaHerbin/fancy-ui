import type { PageDocument } from "../types/page.js";

export interface ContentSourceItem {
	/** Identifier within the source (filename, DB row ID, etc.) */
	id: string;
	title: string;
	updatedAt: string;
	meta?: Record<string, unknown>;
}

export interface RawContent {
	id: string;
	/** Raw content string (markdown, HTML, etc.) */
	content: string;
	/** Metadata extracted from the source (frontmatter, DB fields, etc.) */
	meta: Record<string, unknown>;
}

export interface ContentSource {
	/** Human-readable name (e.g. "Local Markdown Files") */
	readonly name: string;
	/** Machine identifier (e.g. "markdown-filesystem") */
	readonly type: string;

	/** List available content items (metadata only) */
	list(): Promise<ContentSourceItem[]>;
	/** Get a single content item by ID */
	get(id: string): Promise<RawContent>;
}

export interface ContentTransformer {
	/** Human-readable name */
	readonly name: string;
	/** Source types this transformer can handle */
	readonly supportedTypes: string[];

	/** Transform raw content into a PageDocument */
	parse(raw: RawContent): PageDocument;
	/** Optional: serialize a PageDocument back to raw format */
	serialize?(page: PageDocument): string;
}
