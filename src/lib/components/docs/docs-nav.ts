/**
 * Reading-order navigation for the docs shell: the getting-started pages in
 * sidebar order, then the component gallery (alphabetical, matching
 * PrevNextNav). Used by the brutal skin's rail NEXT PAGE card; localized page
 * titles resolve through the caller's `t()` at render time via `key`.
 */
import { getAllComponents } from "$lib/fancy-ui/registry.js";
import { t } from "$lib/stores";

export interface DocsNavEntry {
	href: string;
	name: string;
}

const GETTING_STARTED = [
	{ href: "/docs/getting-started/introduction", key: "page.introduction" },
	{ href: "/docs/getting-started/installation", key: "page.installation" },
	{ href: "/docs/getting-started/theming", key: "page.theming" },
	{ href: "/docs/getting-started/theme-generator", key: "page.themeGenerator" },
	{ href: "/docs/getting-started/changelog", key: "page.changelog" },
] as const;

/**
 * The page that follows `pathname` in reading order, or undefined when there
 * is no meaningful "next" (component pages already carry PrevNextNav, so they
 * intentionally resolve to undefined here to avoid a duplicate control).
 */
export function nextDocsPage(pathname: string): DocsNavEntry | undefined {
	const i = GETTING_STARTED.findIndex((p) => p.href === pathname);
	if (i === -1) return undefined;
	if (i < GETTING_STARTED.length - 1) {
		const next = GETTING_STARTED[i + 1];
		return { href: next.href, name: t(next.key) };
	}
	// Last getting-started page → first component alphabetically.
	const first = getAllComponents().sort((a, b) => a.name.localeCompare(b.name, "en"))[0];
	return first ? { href: `/docs/components/${first.slug}`, name: first.name } : undefined;
}
