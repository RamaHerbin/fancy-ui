import { searchComponents } from "$lib/fancy-ui/registry.js";
import type { ComponentMeta } from "$lib/types.js";

/**
 * Ranked search on top of `searchComponents`: the registry decides WHAT
 * matches, this module only decides the ORDER. Best first:
 *   0 exact name or slug, 1 name/slug prefix (or a word of the name),
 *   2 name contains it, 3 tag, 4 description.
 * Ties go core before fancy, then alphabetical.
 */

/** Three queries offered when a search comes back empty; each is tested to hit. */
export const NO_RESULT_SUGGESTIONS = ["button", "scroll", "glow"] as const;

const norm = (s: string) => s.trim().toLowerCase();

/** Lower is better; Infinity when the component does not match at all. */
export function scoreComponent(component: ComponentMeta, query: string): number {
	const q = norm(query);
	if (!q) return Number.POSITIVE_INFINITY;
	const name = component.name.toLowerCase();
	const slug = component.slug.toLowerCase();
	const dashed = q.replace(/\s+/g, "-");
	if (name === q || slug === q || slug === dashed) return 0;
	if (
		name.startsWith(q) ||
		slug.startsWith(dashed) ||
		name.split(/[\s-]+/).some((w) => w.startsWith(q))
	) {
		return 1;
	}
	if (name.includes(q) || slug.includes(dashed)) return 2;
	if (component.tags?.some((t) => t.toLowerCase().includes(q))) return 3;
	if (component.description.toLowerCase().includes(q)) return 4;
	return Number.POSITIVE_INFINITY;
}

const groupWeight = (c: ComponentMeta) => (c.group === "core" ? 0 : 1);

/**
 * Matching components, best first. An empty query ranks nothing. Pass `pool`
 * to rank a custom list (tests); by default it ranks `searchComponents(query)`.
 */
export function rankComponents(
	query: string,
	pool: ComponentMeta[] = searchComponents(query)
): ComponentMeta[] {
	if (!norm(query)) return [];
	return pool
		.map((c) => ({ c, s: scoreComponent(c, query) }))
		.filter((x) => x.s !== Number.POSITIVE_INFINITY)
		.sort(
			(a, b) => a.s - b.s || groupWeight(a.c) - groupWeight(b.c) || a.c.name.localeCompare(b.c.name)
		)
		.map((x) => x.c);
}
