/**
 * Site-level configuration.
 *
 * Stored as `content/site.json` alongside page documents.
 * Provides shared navigation, footer, and page ordering.
 */

export interface NavItem {
	id: string;
	label: string;
	target:
		| { type: "page"; slug: string }
		| { type: "anchor"; anchorId: string }
		| { type: "url"; href: string; external?: boolean };
}

export interface SiteConfig {
	version: 1;
	title: string;
	description?: string;
	/** Ordered page slugs for sitemap / navigation */
	pageOrder: string[];
	/** Header navigation items */
	navigation: NavItem[];
	/** Footer configuration */
	footer?: {
		text?: string;
		links?: NavItem[];
	};
	createdAt: string;
	updatedAt: string;
}

/** Create a default SiteConfig */
export function createDefaultSiteConfig(): SiteConfig {
	const now = new Date().toISOString();
	return {
		version: 1,
		title: "My Site",
		description: "",
		pageOrder: [],
		navigation: [],
		footer: { text: "", links: [] },
		createdAt: now,
		updatedAt: now,
	};
}

/** Validate that an object looks like a valid SiteConfig */
export function isValidSiteConfig(doc: unknown): doc is SiteConfig {
	if (!doc || typeof doc !== "object") return false;
	const d = doc as Record<string, unknown>;
	if (d.version !== 1) return false;
	if (!d.title || typeof d.title !== "string") return false;
	if (!Array.isArray(d.pageOrder)) return false;
	if (!Array.isArray(d.navigation)) return false;
	return true;
}
