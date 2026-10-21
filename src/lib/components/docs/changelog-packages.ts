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
