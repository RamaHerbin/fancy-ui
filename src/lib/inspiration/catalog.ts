/**
 * The Inspiration catalog: every entry file under `./entries/`, collected
 * once, with the one place that decides what is public. Listings, counts,
 * the sitemap, prerender entries and briefs all read `PUBLISHED`; drafts and
 * archived entries exist only for the editor and the bookmark store.
 */

import { COLLECTIONS, type Collection, type Reference, type FancyUIReference } from "./types.js";
import manifest from "./media.json";

const modules = import.meta.glob("./entries/*.ts", { eager: true }) as Record<
	string,
	{ default?: Reference; entry?: Reference }
>;

/** Poster dimensions written by `scripts/build-inspiration-media.mjs`. */
export const MEDIA_MANIFEST: Record<string, { width: number; height: number }> = manifest;

/** Every entry, in file-name order. Drafts included. */
export const ENTRIES: readonly Reference[] = Object.keys(modules)
	.sort()
	.map((path) => {
		const mod = modules[path];
		const entry = mod.default ?? mod.entry;
		if (!entry) throw new Error(`Inspiration entry ${path} exports neither default nor \`entry\``);
		return entry;
	});

/** Published entries, catalog order (sorting is the gallery's job). */
export const PUBLISHED: readonly Reference[] = ENTRIES.filter(
	(entry) => entry.status === "published"
);

const bySlug = new Map(ENTRIES.map((entry) => [entry.slug, entry]));
const byId = new Map(ENTRIES.map((entry) => [entry.id, entry]));

/** Any entry, whatever its status — editor and bookmark use only. */
export function getEntry(slug: string): Reference | undefined {
	return bySlug.get(slug);
}

export function getEntryById(id: string): Reference | undefined {
	return byId.get(id);
}

/** Undefined for drafts and archived entries: the detail route 404s on it. */
export function getPublished(slug: string): Reference | undefined {
	const entry = bySlug.get(slug);
	return entry?.status === "published" ? entry : undefined;
}

export function publishedSlugs(): string[] {
	return PUBLISHED.map((entry) => entry.slug);
}

/** Ids of every entry (any status): the saved store prunes against this, not against PUBLISHED. */
export const KNOWN_IDS: ReadonlySet<string> = new Set(ENTRIES.map((entry) => entry.id));

export function isFancyUI(entry: Reference): entry is FancyUIReference {
	return entry.origin === "fancyui";
}

/** The poster for a card: explicit media first, then the captured manifest. */
export function posterFor(
	entry: Reference
): { src: string; width: number; height: number; alt: string } | null {
	if (entry.media) {
		const { src, poster, width, height, alt } = entry.media;
		return { src: entry.media.type === "video" ? (poster ?? src) : src, width, height, alt };
	}
	const captured = MEDIA_MANIFEST[entry.slug];
	if (!captured) return null;
	return {
		src: `/inspiration/${entry.slug}.webp`,
		width: captured.width,
		height: captured.height,
		alt: `${entry.title} — preview`,
	};
}

export interface CollectionSummary {
	id: Collection;
	count: number;
	/** Up to four published entries, curated order, for the homepage tiles. */
	sample: Reference[];
}

/** Collections that have at least one published entry, in canonical order. */
export function collections(entries: readonly Reference[] = PUBLISHED): CollectionSummary[] {
	return COLLECTIONS.map((id) => {
		const members = entries.filter((entry) => entry.collections?.includes(id));
		const ranked = [...members].sort(
			(a, b) =>
				(a.curatedRank ?? Number.POSITIVE_INFINITY) - (b.curatedRank ?? Number.POSITIVE_INFINITY)
		);
		return { id, count: members.length, sample: ranked.slice(0, 4) };
	}).filter((summary) => summary.count > 0);
}

/** The homepage selection: the six lowest `curatedRank`s among published entries. */
export function featured(count = 6, entries: readonly Reference[] = PUBLISHED): Reference[] {
	return [...entries]
		.filter((entry) => entry.curatedRank !== undefined)
		.sort((a, b) => a.curatedRank! - b.curatedRank!)
		.slice(0, count);
}
