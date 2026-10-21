/**
 * Export names per component folder, for each package, read from the real
 * barrels so nothing the site prints can drift from what the packages ship.
 *
 * Svelte barrels are executed (they are this app's own modules). React and
 * Vue barrels are read as text and never executed: the docs build must not
 * pull React or Vue in. Only value exports count; `export type` lines are
 * skipped, and so are lower-case names (constants, helpers).
 */

import { getComponent } from "$lib/fancy-ui/registry.js";

const svelteModules = import.meta.glob("../fancy-ui/*/index.ts", { eager: true }) as Record<
	string,
	Record<string, unknown>
>;

const reactComponentBarrels = import.meta.glob("/react/src/components/*/index.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const vueComponentBarrels = import.meta.glob("/vue/src/components/*/index.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

// Modules at the top of a port's `src/`, next to `components/`. One of them can
// be a docs page of its own (a shared module whose folder name is a registry
// slug, as in the Svelte package where every page is a top-level folder).
const reactModuleBarrels = import.meta.glob("/react/src/*/index.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

const vueModuleBarrels = import.meta.glob("/vue/src/*/index.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/** The top-level modules that a docs page documents; the others (theme kit, internals) are skipped. */
function documentedModules(barrels: Record<string, string>): Record<string, string> {
	return Object.fromEntries(
		Object.entries(barrels).filter(([path]) => {
			const slug = slugOf(path);
			return Boolean(slug && getComponent(slug));
		})
	);
}

const reactBarrels = { ...reactComponentBarrels, ...documentedModules(reactModuleBarrels) };
const vueBarrels = { ...vueComponentBarrels, ...documentedModules(vueModuleBarrels) };

/** Folder of each documented slug under a port's `src/`, read from where its barrel was found. */
function foldersOf(barrels: Record<string, string>, root: string): Map<string, string> {
	const map = new Map<string, string>();
	for (const path of Object.keys(barrels)) {
		const slug = slugOf(path);
		if (slug) map.set(slug, path.slice(root.length, -"/index.ts".length));
	}
	return map;
}

const PORT_FOLDERS: Record<"react" | "vue", Map<string, string>> = {
	react: foldersOf(reactBarrels, "/react/src/"),
	vue: foldersOf(vueBarrels, "/vue/src/"),
};

/**
 * Folder of a page's port under the React or Vue `src/`, e.g.
 * `components/border-beam`, or the module folder itself for a shared module
 * that sits next to `components/`. A slug with no port gets the components
 * folder it would have.
 */
export function portFolderOf(framework: "react" | "vue", slug: string): string {
	return PORT_FOLDERS[framework].get(slug) ?? `components/${slug}`;
}

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

const svelteBarrelSources = import.meta.glob("../fancy-ui/*/index.ts", {
	query: "?raw",
	import: "default",
	eager: true,
}) as Record<string, string>;

/**
 * Type exports of a barrel source: every name in `export type { … }`, the
 * `type X` specifiers of a mixed `export { … }`, and `export type X =` /
 * `export interface X` declarations. PascalCase names only, in source order.
 */
export function parseBarrelTypeExports(src: string): string[] {
	const found: { at: number; name: string }[] = [];
	for (const m of src.matchAll(/^export\s+(type\s+)?\{([^}]+)\}/gm)) {
		const typeOnly = Boolean(m[1]);
		for (const part of m[2].split(",")) {
			const spec = part.trim();
			if (!spec || (!typeOnly && !spec.startsWith("type "))) continue;
			const name = spec
				.replace(/^type\s+/, "")
				.split(/\s+as\s+/)
				.at(-1)
				?.trim();
			if (name && /^[A-Z]/.test(name)) found.push({ at: m.index ?? 0, name });
		}
	}
	for (const m of src.matchAll(/^export\s+(?:type|interface)\s+([A-Za-z_$][\w$]*)/gm)) {
		if (/^[A-Z]/.test(m[1])) found.push({ at: m.index ?? 0, name: m[1] });
	}
	return [...new Set(found.sort((a, b) => a.at - b.at).map((f) => f.name))];
}

function typesFromSources(barrels: Record<string, string>): Map<string, string[]> {
	const map = new Map<string, string[]>();
	for (const [path, src] of Object.entries(barrels)) {
		const slug = slugOf(path);
		if (!slug) continue;
		const names = parseBarrelTypeExports(src);
		if (names.length) map.set(slug, names);
	}
	return map;
}

export const svelteTypesBySlug: ReadonlyMap<string, string[]> =
	typesFromSources(svelteBarrelSources);

export const reactTypesBySlug: ReadonlyMap<string, string[]> = typesFromSources(reactBarrels);

export const vueTypesBySlug: ReadonlyMap<string, string[]> = typesFromSources(vueBarrels);
