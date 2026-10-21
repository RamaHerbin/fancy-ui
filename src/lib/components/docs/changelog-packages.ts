/** The three published packages whose changelogs the docs page shows, in tab order. */
export const CHANGELOG_PACKAGES = [
	{ id: "svelte", name: "fancy-ui-svelte" },
	{ id: "react", name: "fancy-ui-react" },
	{ id: "vue", name: "fancy-ui-vue" },
] as const;

export type ChangelogPackageId = (typeof CHANGELOG_PACKAGES)[number]["id"];

export interface ChangelogPackage {
	id: string;
	name: string;
	raw: string;
}

export function buildChangelogPackages(
	raws: Record<ChangelogPackageId, string>
): ChangelogPackage[] {
	return CHANGELOG_PACKAGES.map((p) => ({ id: p.id, name: p.name, raw: raws[p.id] }));
}

/**
 * The package a release anchor belongs to: `react-v0-5-0` and `vue-v0-2-0` name
 * theirs, a bare `v0-16-0` is the first (Svelte) list's. Null for any other hash.
 */
export function packageIdForAnchor(hash: string): ChangelogPackageId | null {
	const anchor = hash.replace(/^#/, "");
	for (const p of CHANGELOG_PACKAGES.slice(1)) {
		if (anchor.startsWith(`${p.id}-v`)) return p.id;
	}
	return /^v\d/.test(anchor) ? CHANGELOG_PACKAGES[0].id : null;
}
