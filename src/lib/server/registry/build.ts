/**
 * The registry generator: one package's sources in, index + items out.
 *
 * Pure (no file system, no Vite); `./sources.ts` feeds it. What differs per
 * package (which files ship, how they group, where they land, how their text
 * changes) is a `RegistryStack` (`./stacks/`). Output is deterministic:
 * items, files and arrays sorted.
 */

import {
	closure,
	npmDependencies,
	referencedTypePackages,
	relativeSpecifiers,
	resolveSpecifier,
} from "./graph.js";
import { docsFor } from "./stack.js";
import type { TransformContext } from "./stack.js";
import { reactStack } from "./stacks/react.js";
import type {
	BuildInput,
	BuildOutput,
	RegistryFile,
	RegistryIndex,
	RegistryItem,
} from "./types.js";

export type {
	BuildInput,
	BuildOutput,
	RegistryFile,
	RegistryIndex,
	RegistryItem,
} from "./types.js";
export type { RegistryStack, TransformContext } from "./stack.js";
export {
	SHARED_ITEMS,
	SOURCE_ROOT,
	TARGET_ROOT,
	TYPE_PACKAGES,
	USE_CLIENT,
	docsFor,
	reactStack,
} from "./stacks/react.js";
export { svelteStack } from "./stacks/svelte.js";

/** One output file; `target` only when the stack names one. */
function fileEntry(
	path: string,
	type: RegistryFile["type"],
	target: string | undefined,
	content?: string
): RegistryFile {
	return {
		path,
		...(content !== undefined ? { content } : {}),
		type,
		...(target !== undefined ? { target } : {}),
	};
}

/** Strip `content` from every file, for the index. */
function withoutContent(item: RegistryItem): RegistryItem {
	const copy: RegistryItem = {
		...item,
		files: item.files.map((f) => fileEntry(f.path, f.type, f.target)),
	};
	delete copy.$schema;
	return copy;
}

export function buildRegistry(input: BuildInput): BuildOutput {
	const stack = input.stack ?? reactStack;
	const root = stack.sourceRoot;
	const base = `${input.siteUrl.replace(/\/+$/, "")}${stack.urlPath}`;
	const ctx: TransformContext = {
		serverModules: input.serverModules ?? new Set(),
		stripJsExtension: input.stripJsExtension ?? false,
	};
	const allPaths = new Set(Object.keys(input.files));

	// 1. Candidate files: inside a group, of a kept kind and not excluded.
	const candidates = [...allPaths]
		.filter((p) => stack.groupOf(p) !== null && stack.isKeptKind(p) && !stack.isExcluded(p))
		.sort();
	const candidateSet = new Set(candidates);

	// 2. Import edges, with every failure mode named by path.
	const edges = new Map<string, string[]>();
	for (const path of candidates) {
		if (!stack.isCode(path)) continue;
		const targets: string[] = [];
		for (const spec of relativeSpecifiers(input.files[path])) {
			const resolved = resolveSpecifier(path, spec, allPaths);
			if (resolved === null) {
				throw new Error(
					`Registry: unresolved import "${spec}" in ${root}/${path} — no matching source file.`
				);
			}
			if (stack.groupOf(resolved) === null) {
				throw new Error(
					`Registry: ${root}/${path} imports "${spec}" (${root}/${resolved}), which belongs to no registry item.`
				);
			}
			if (!candidateSet.has(resolved)) {
				throw new Error(
					`Registry: ${root}/${path} imports "${spec}" (${root}/${resolved}), which is excluded from the registry (test, harness or mock file).`
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
		const group = stack.groupOf(path) as string;
		const list = groups.get(group) ?? [];
		list.push(path);
		groups.set(group, list);
	}

	const componentDirs = new Map<string, string>();
	for (const path of kept) {
		const slug = stack.componentOf(path);
		if (slug === null || componentDirs.has(slug)) continue;
		const parts = path.split("/");
		componentDirs.set(slug, parts.slice(0, parts.indexOf(slug) + 1).join("/"));
	}
	for (const [slug, dir] of componentDirs) {
		if (Object.prototype.hasOwnProperty.call(stack.shared, slug)) {
			throw new Error(
				`Registry: duplicate item name "${slug}" — ${root}/${dir}/ collides with a shared item.`
			);
		}
		if (!Object.prototype.hasOwnProperty.call(input.meta, slug)) {
			throw new Error(
				`Registry: ${root}/${dir}/ has no entry in the component registry (registry.ts).`
			);
		}
	}

	// 5. Group-level edges. Installing an item installs every file of it, so a
	//    dependency on one file of a group pulls in what the whole group needs.
	const groupEdges = new Map<string, string[]>();
	for (const [group, files] of groups) {
		const reached = new Set(
			files.flatMap((p) => (edges.get(p) ?? []).map((t) => stack.groupOf(t) as string))
		);
		reached.delete(group);
		groupEdges.set(group, [...reached].sort());
	}

	// 6. One item per group.
	const items: Record<string, RegistryItem> = {};
	for (const name of [...groups.keys()].sort()) {
		const files = (groups.get(name) as string[]).slice().sort();
		const isComponent = componentDirs.has(name) && stack.isComponent(name);
		const type = stack.itemType(isComponent);
		const fileType = stack.fileType(type);

		const registryDependencies = closure([name], groupEdges)
			.filter((dep) => dep !== name)
			.map((dep) => `${base}/${dep}.json`);

		const dependencies = [
			...new Set(
				files
					.filter(stack.isCode)
					.flatMap((p) => npmDependencies(input.files[p], stack.isFrameworkPackage))
			),
		].sort();
		const devDependencies = [
			...new Set([
				...dependencies.flatMap((dep) => stack.typePackages[dep] ?? []),
				...files.filter(stack.isCode).flatMap((p) => referencedTypePackages(input.files[p])),
			]),
		].sort();
		const pin = (name: string) =>
			input.versions?.[name] ? `${name}@${input.versions[name]}` : name;

		const registryFiles: RegistryFile[] = files.map((p) =>
			fileEntry(
				stack.pathFor(p),
				fileType,
				stack.targetFor(p),
				stack.isCode(p) ? stack.transform(p, input.files[p], ctx) : input.files[p]
			)
		);

		const meta = isComponent ? input.meta[name] : undefined;
		const shared = stack.shared[name];
		if (!meta && !shared) {
			throw new Error(`Registry: no metadata for item "${name}".`);
		}
		items[name] = {
			$schema: stack.itemSchemaUrl,
			name,
			type,
			title: meta ? meta.name : shared.title,
			description: meta ? meta.description : shared.description,
			...(meta ? { categories: [meta.category] } : {}),
			...(dependencies.length > 0 ? { dependencies: dependencies.map(pin) } : {}),
			...(devDependencies.length > 0 ? { devDependencies: devDependencies.map(pin) } : {}),
			...(registryDependencies.length > 0 ? { registryDependencies } : {}),
			...(isComponent && dependencies.length > 0 ? { docs: docsFor(dependencies) } : {}),
			files: registryFiles,
		};
	}

	const index: RegistryIndex = {
		$schema: stack.schemaUrl,
		name: stack.registryName,
		homepage: input.siteUrl,
		items: Object.keys(items)
			.sort()
			.map((name) => withoutContent(items[name])),
	};

	return { index, items };
}
