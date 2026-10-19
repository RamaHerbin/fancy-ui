/**
 * The registry generator: React package sources in, index + items out.
 *
 * Pure (no file system, no Vite); `./sources.ts` feeds it. Every kept file of
 * a component folder or shared module ships under `@ui/fancy/<path relative to
 * react/src>`, so the relative imports in the sources stay byte-identical on
 * the consumer side. Output is deterministic: items, files and arrays sorted.
 */

import { REGISTRY_ITEM_SCHEMA_URL, REGISTRY_NAME, REGISTRY_SCHEMA_URL } from "./constants.js";
import {
	closure,
	groupOf,
	isExcluded,
	npmDependencies,
	relativeSpecifiers,
	resolveSpecifier,
	stripJsExtensions,
} from "./graph.js";
import type {
	BuildInput,
	BuildOutput,
	RegistryFile,
	RegistryIndex,
	RegistryItem,
	RegistryItemType,
} from "./types.js";

export type {
	BuildInput,
	BuildOutput,
	RegistryFile,
	RegistryIndex,
	RegistryItem,
} from "./types.js";

/** Where every file lands in the consumer project, before the `react/src`-relative path. */
export const TARGET_ROOT = "@ui/fancy";
/** Where every file lives in this repository, before the `react/src`-relative path. */
export const SOURCE_ROOT = "react/src";
/** The directive prepended to every client module. */
export const USE_CLIENT = '"use client";';

/** The shared (non-component) items, in the order the groups are documented. */
export const SHARED_ITEMS: Readonly<Record<string, { title: string; description: string }>> =
	Object.freeze({
		utils: {
			title: "Shared utilities",
			description: "The class-name merge helper every component styles itself with.",
		},
		internals: {
			title: "Shared internals",
			description:
				"Hooks and helpers the components share: positioning, focus, dismissal, ids, text streaming and portals.",
		},
		"internals-dom": {
			title: "Shared internals (DOM)",
			description: "Ref, context and server-rendering helpers for DOM-bound components.",
		},
		"internals-motion": {
			title: "Shared internals (motion)",
			description: "Animation primitives: easing, presence, stagger, in-view and motion tokens.",
		},
		"internals-markdown": {
			title: "Shared internals (markdown)",
			description: "The streaming-safe markdown renderer and its styles.",
		},
		sound: {
			title: "Sound",
			description: "The opt-in interface sound engine, its themes, hooks and toggle.",
		},
	});

const isCode = (path: string) => /\.(ts|tsx)$/.test(path);

/** `a`, `a and b`, `a, b and c`. */
function listOf(names: readonly string[]): string {
	if (names.length <= 1) return names.join("");
	return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The plain sentence a component item carries when it installs npm packages. */
/**
 * Type packages a runtime dependency needs under TypeScript. They are not
 * imported anywhere, so the import scan cannot find them; the consumer gets
 * them as devDependencies.
 */
export const TYPE_PACKAGES: Readonly<Record<string, readonly string[]>> = Object.freeze({
	"canvas-confetti": ["@types/canvas-confetti"],
	three: ["@types/three"],
});

export function docsFor(dependencies: readonly string[]): string {
	return `Installs ${listOf(dependencies)} as ${dependencies.length === 1 ? "a dependency" : "dependencies"}.`;
}

/** `utils.ts` → `utils.js`: the output name `client-boundary.mjs` lists. */
function outputName(relPath: string): string {
	return relPath.replace(/\.tsx?$/, ".js");
}

/** The shipped text of one file: directive (client modules only) + optional extension strip. */
function shippedContent(relPath: string, source: string, input: BuildInput): string {
	if (!isCode(relPath)) return source;
	const body = input.stripJsExtension ? stripJsExtensions(source) : source;
	if (input.serverModules.has(outputName(relPath))) return body;
	if (/^\s*["']use client["'];?/.test(body)) return body;
	return `${USE_CLIENT}\n\n${body}`;
}

/** Strip `content` from every file, for the index. */
function withoutContent(item: RegistryItem): RegistryItem {
	const copy: RegistryItem = {
		...item,
		files: item.files.map((f) => ({ path: f.path, type: f.type, target: f.target })),
	};
	delete copy.$schema;
	return copy;
}

export function buildRegistry(input: BuildInput): BuildOutput {
	const base = `${input.siteUrl.replace(/\/+$/, "")}/r`;
	const allPaths = new Set(Object.keys(input.files));

	// 1. Candidate files: inside a group and not excluded.
	const candidates = [...allPaths].filter((p) => groupOf(p) !== null && !isExcluded(p)).sort();
	const candidateSet = new Set(candidates);

	// 2. Import edges, with every failure mode named by path.
	const edges = new Map<string, string[]>();
	for (const path of candidates) {
		if (!isCode(path)) continue;
		const targets: string[] = [];
		for (const spec of relativeSpecifiers(input.files[path])) {
			const resolved = resolveSpecifier(path, spec, allPaths);
			if (resolved === null) {
				throw new Error(
					`Registry: unresolved import "${spec}" in ${SOURCE_ROOT}/${path} — no matching source file.`
				);
			}
			if (groupOf(resolved) === null) {
				throw new Error(
					`Registry: ${SOURCE_ROOT}/${path} imports "${spec}" (${SOURCE_ROOT}/${resolved}), which belongs to no registry item.`
				);
			}
			if (!candidateSet.has(resolved)) {
				throw new Error(
					`Registry: ${SOURCE_ROOT}/${path} imports "${spec}" (${SOURCE_ROOT}/${resolved}), which is excluded from the registry (test, harness or mock file).`
				);
			}
			targets.push(resolved);
		}
		edges.set(path, [...new Set(targets)].sort());
	}

	// 3. `dev.ts` ships only when a kept file imports it.
	const imported = new Set([...edges.values()].flat());
	const kept = candidates.filter((p) => !/(^|\/)dev\.ts$/.test(p) || imported.has(p));

	// 4. Group the kept files.
	const groups = new Map<string, string[]>();
	for (const path of kept) {
		const group = groupOf(path) as string;
		const list = groups.get(group) ?? [];
		list.push(path);
		groups.set(group, list);
	}

	const componentSlugs = new Set(
		kept.filter((p) => p.startsWith("components/")).map((p) => p.split("/")[1])
	);
	for (const slug of componentSlugs) {
		if (slug in SHARED_ITEMS) {
			throw new Error(
				`Registry: duplicate item name "${slug}" — react/src/components/${slug}/ collides with a shared item.`
			);
		}
		if (!Object.prototype.hasOwnProperty.call(input.meta, slug)) {
			throw new Error(
				`Registry: ${SOURCE_ROOT}/components/${slug}/ has no entry in the component registry (registry.ts).`
			);
		}
	}

	// 5. Group-level edges. Installing an item installs every file of it, so a
	//    dependency on one file of a group pulls in what the whole group needs.
	const groupEdges = new Map<string, string[]>();
	for (const [group, files] of groups) {
		const reached = new Set(
			files.flatMap((p) => (edges.get(p) ?? []).map((t) => groupOf(t) as string))
		);
		reached.delete(group);
		groupEdges.set(group, [...reached].sort());
	}

	// 6. One item per group.
	const items: Record<string, RegistryItem> = {};
	for (const name of [...groups.keys()].sort()) {
		const files = (groups.get(name) as string[]).slice().sort();
		const isComponent = componentSlugs.has(name);
		const type: RegistryItemType = isComponent ? "registry:ui" : "registry:lib";

		const registryDependencies = closure([name], groupEdges)
			.filter((dep) => dep !== name)
			.map((dep) => `${base}/${dep}.json`);

		const dependencies = [
			...new Set(files.filter(isCode).flatMap((p) => npmDependencies(input.files[p]))),
		].sort();
		const devDependencies = dependencies.flatMap((dep) => TYPE_PACKAGES[dep] ?? []).sort();

		const registryFiles: RegistryFile[] = files.map((p) => ({
			path: `${SOURCE_ROOT}/${p}`,
			content: shippedContent(p, input.files[p], input),
			type,
			target: `${TARGET_ROOT}/${p}`,
		}));

		const meta = isComponent ? input.meta[name] : undefined;
		const shared = SHARED_ITEMS[name];
		if (!meta && !shared) {
			throw new Error(`Registry: no metadata for item "${name}".`);
		}
		items[name] = {
			$schema: REGISTRY_ITEM_SCHEMA_URL,
			name,
			type,
			title: meta ? meta.name : shared.title,
			description: meta ? meta.description : shared.description,
			...(meta ? { categories: [meta.category] } : {}),
			...(dependencies.length > 0 ? { dependencies } : {}),
			...(devDependencies.length > 0 ? { devDependencies } : {}),
			...(registryDependencies.length > 0 ? { registryDependencies } : {}),
			...(isComponent && dependencies.length > 0 ? { docs: docsFor(dependencies) } : {}),
			files: registryFiles,
		};
	}

	const index: RegistryIndex = {
		$schema: REGISTRY_SCHEMA_URL,
		name: REGISTRY_NAME,
		homepage: input.siteUrl,
		items: Object.keys(items)
			.sort()
			.map((name) => withoutContent(items[name])),
	};

	return { index, items };
}
