/**
 * What the registry generator needs to know about one package: where its
 * sources live, which files ship, how they group into items, where they land
 * in the consumer project and how their text changes on the way.
 *
 * One `RegistryStack` per package (`./stacks/react.ts`, `./stacks/svelte.ts`);
 * `./build.ts` is the same for all of them.
 */

import type { RegistryItemType } from "./types.js";

export type { RegistryItemType } from "./types.js";

/** Build options a stack's `transform` may read. */
export interface TransformContext {
	/** React only: ".js" paths (relative to the source root) that ship without the client directive. */
	serverModules: ReadonlySet<string>;
	/** React only: strip ".js" from relative specifiers. */
	stripJsExtension: boolean;
}

export interface SharedItem {
	title: string;
	description: string;
}

export interface RegistryStack {
	id: "react" | "svelte" | "vue";
	/** Repo path prefix written in `path` and in error messages, e.g. "react/src". */
	sourceRoot: string;
	/** URL path of this registry under the site, e.g. "/r", "/r/svelte". */
	urlPath: string;
	schemaUrl: string;
	itemSchemaUrl: string;
	registryName: string;
	/**
	 * Write `registryDependencies` even when empty. The Svelte CLI's registry
	 * schema requires the key on every index entry.
	 */
	alwaysListRegistryDependencies?: boolean;
	/** File kinds that ship at all. */
	isKeptKind(relPath: string): boolean;
	/** Kinds whose text is scanned for imports (code, not css). */
	isCode(relPath: string): boolean;
	/** Tests, harnesses, mocks, READMEs, templates. */
	isExcluded(relPath: string): boolean;
	/** Item a file belongs to, or null (root barrels, templates, …). */
	groupOf(relPath: string): string | null;
	/** Component folder a file sits in (its slug), or null for shared and root files. */
	componentOf(relPath: string): string | null;
	/** Is this item name a component (true) or a shared module (false)? */
	isComponent(name: string): boolean;
	shared: Readonly<Record<string, SharedItem>>;
	/** Bare specifiers that are the framework itself, never a dependency. */
	isFrameworkPackage(spec: string): boolean;
	/** Type packages per runtime dependency (shipped as devDependencies). */
	typePackages: Readonly<Record<string, readonly string[]>>;
	itemType(isComponent: boolean): RegistryItemType;
	/** File type; some CLIs place files by file type, not item type. */
	fileType(itemType: RegistryItemType): RegistryItemType;
	/** `path` of a file in the output (repository path, or a steering path). */
	pathFor(relPath: string): string;
	/** Consumer-side target; undefined → the key is omitted. */
	targetFor(relPath: string): string | undefined;
	/** Shipped text of a code file. Throws (naming the file) on what cannot ship. */
	transform(relPath: string, source: string, ctx: TransformContext): string;
}

/**
 * Type packages a runtime dependency needs under TypeScript. They are not
 * imported anywhere, so the import scan cannot find them; the consumer gets
 * them as devDependencies.
 */
export const TYPE_PACKAGES: Readonly<Record<string, readonly string[]>> = Object.freeze({
	"canvas-confetti": ["@types/canvas-confetti"],
	three: ["@types/three"],
});

/** `a`, `a and b`, `a, b and c`. */
function listOf(names: readonly string[]): string {
	if (names.length <= 1) return names.join("");
	return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

/** The plain sentence a component item carries when it installs npm packages. */
export function docsFor(dependencies: readonly string[]): string {
	return `Installs ${listOf(dependencies)} as ${dependencies.length === 1 ? "a dependency" : "dependencies"}.`;
}
