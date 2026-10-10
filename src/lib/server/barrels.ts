/**
 * Export names per component folder, for each package, read from the real
 * barrels so nothing the site prints can drift from what the packages ship.
 *
 * Svelte barrels are executed (they are this app's own modules). React and
 * Vue barrels are read as text and never executed: the docs build must not
 * pull React or Vue in. Only value exports count; `export type` lines are
 * skipped, and so are lower-case names (constants, helpers).
 */

const svelteModules = import.meta.glob("../fancy-ui/*/index.ts", { eager: true }) as Record<
	string,
	Record<string, unknown>
>;

const reactBarrels = import.meta.glob("/react/src/components/*/index.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const vueBarrels = import.meta.glob("/vue/src/components/*/index.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/** Value exports of a barrel source: `export { A, b as B } from …` lines, PascalCase names only. */
export function parseBarrelExports(src: string): string[] {
	if (/^export\s+\*\s+from/m.test(src)) {
		throw new Error("Barrel uses `export *`: export names cannot be derived from its text");
	}
	const names: string[] = [];
	// Local re-exports (`export { X };`) and `from` re-exports both count.
	for (const m of src.matchAll(/^export\s+(?:type\s+)?\{([^}]+)\}/gm)) {
		if (/^export\s+type\s/.test(m[0])) continue;
		for (const part of m[1].split(",")) {
			const spec = part.trim();
			if (!spec || spec.startsWith("type ")) continue;
			const name = spec
				.split(/\s+as\s+/)
				.at(-1)
				?.trim();
			if (name && /^[A-Z]/.test(name)) names.push(name);
		}
	}
	return names;
}

function slugOf(path: string): string | undefined {
	return path.split("/").at(-2);
}

function fromSources(barrels: Record<string, string>): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const [path, src] of Object.entries(barrels)) {
		const slug = slugOf(path);
		if (!slug) continue;
		const names = parseBarrelExports(src);
		if (names.length) map.set(slug, names);
	}
	return map;
}

export const svelteExportsBySlug: ReadonlyMap<string, string[]> = new Map(
	Object.entries(svelteModules).flatMap(([path, module]) => {
		const slug = slugOf(path);
		return slug ? [[slug, Object.keys(module).filter((name) => /^[A-Z]/.test(name))]] : [];
	})
);

export const reactExportsBySlug: ReadonlyMap<string, string[]> = fromSources(reactBarrels);

export const vueExportsBySlug: ReadonlyMap<string, string[]> = fromSources(vueBarrels);
