/**
 * Page document types for the site builder.
 *
 * Each page is stored as a JSON file in content/pages/.
 * The document contains metadata and a tree of BlockNodes.
 */

export type PageStatus = "draft" | "published";

export interface PageMeta {
	title: string;
	slug: string;
	description?: string;
	status: PageStatus;
	createdAt: string;
	updatedAt: string;
}

export interface BlockNode {
	/** Unique ID (nanoid) */
	id: string;
	/** Component type slug from builder registry, or layout primitive prefixed with _ */
	type: string;
	/** Props passed to the component */
	props: Record<string, unknown>;
	/** Nested children (for layout primitives and components that accept children) */
	children?: BlockNode[];
}

export interface PageDocument {
	/** Schema version for future migration */
	version: 1;
	/** Page metadata */
	meta: PageMeta;
	/** Root-level blocks */
	body: BlockNode[];
}
