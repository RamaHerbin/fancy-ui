/**
 * The Svelte package (`src/lib/fancy-ui`): every kept file of a component
 * folder or shared module ships as a `registry:ui` file targeted at
 * `fancy/<path relative to src/lib/fancy-ui>`, which the CLI resolves against
 * the consumer's `ui` alias. Relative imports (".js" extensions included)
 * stay byte-identical; the one alias import, `$lib/utils.js`, becomes the
 * CLI's utils placeholder so the consumer's own class-name helper serves.
 */

import {
	REGISTRY_NAME,
	SVELTE_REGISTRY_ITEM_SCHEMA_URL,
	SVELTE_REGISTRY_SCHEMA_URL,
} from "../constants.js";
import { SVELTE_EXCLUSIONS, excludedBy } from "../exclusions.js";
import { rewriteSpecifiers, specifiers } from "../graph.js";
import { TYPE_PACKAGES } from "../stack.js";
import type { RegistryStack, SharedItem } from "../stack.js";

/** Where every file lives in this repository, before the relative path. */
export const SVELTE_SOURCE_ROOT = "src/lib/fancy-ui";
/** Where every file lands, relative to the consumer's `ui` alias directory. */
export const SVELTE_TARGET_ROOT = "fancy";
/** The only alias import the sources may use, and what it ships as. */
export const UTILS_SPECIFIER = "$lib/utils.js";
export const UTILS_PLACEHOLDER = "$UTILS$.js";

export const SVELTE_SHARED_ITEMS: Readonly<Record<string, SharedItem>> = Object.freeze({
	internals: {
		title: "Shared internals",
		description:
			"Actions and helpers the components share: positioning, focus, dismissal, ids, text streaming, markdown and portals.",
	},
	"internals-motion": {
		title: "Shared internals (motion)",
		description: "Animation primitives: easing, presence, stagger, in-view and motion tokens.",
	},
	sound: {
		title: "Sound",
		description: "The opt-in interface sound engine, its themes, the sound action and toggle.",
	},
});

/** `svelte`, `svelte/*`, `@sveltejs/*`, `$app/*`, `$env/*`. */
const FRAMEWORK_PACKAGE = /^(svelte(\/|$)|@sveltejs\/|\$app\/|\$env\/)/;

/** The component folder a file sits in, or null. */
export function svelteComponentOf(relPath: string): string | null {
	const parts = relPath.split("/");
	if (parts.length < 2 || parts[0].startsWith("_") || parts[0] === "sound") return null;
	return parts[0];
}

/**
 * The item a source file belongs to: `_internals/<file>` → `internals`,
 * `_internals/motion/<file>` → `internals-motion`, `sound/…` → `sound`,
 * `<slug>/…` → `<slug>`; root files and `_template/` → null.
 */
export function svelteGroupOf(relPath: string): string | null {
	const parts = relPath.split("/");
	if (parts[0] === "_internals") {
		if (parts.length === 2) return "internals";
		if (parts.length === 3 && parts[1] === "motion") return "internals-motion";
		return null;
	}
	if (parts[0] === "sound" && parts.length >= 2) return "sound";
	return svelteComponentOf(relPath);
}

/** Tests, test components, harnesses, the Web Audio mock, READMEs and the template (`../exclusions.ts`). */
export function svelteIsExcluded(relPath: string): boolean {
	return excludedBy(SVELTE_EXCLUSIONS, relPath);
}

/** `$lib/utils.js` → the utils placeholder; any other `$lib/` import cannot ship. */
function transform(relPath: string, source: string): string {
	const out = rewriteSpecifiers(source, (spec) =>
		spec === UTILS_SPECIFIER ? UTILS_PLACEHOLDER : spec
	);
	const leaks = specifiers(out).filter((spec) => spec.startsWith("$lib/"));
	if (leaks.length > 0) {
		throw new Error(
			`Registry: ${SVELTE_SOURCE_ROOT}/${relPath} imports "${leaks[0]}" — only "${UTILS_SPECIFIER}" may be imported through $lib in a shipped file.`
		);
	}
	return out;
}

export const svelteStack: RegistryStack = Object.freeze<RegistryStack>({
	id: "svelte",
	sourceRoot: SVELTE_SOURCE_ROOT,
	urlPath: "/r/svelte",
	schemaUrl: SVELTE_REGISTRY_SCHEMA_URL,
	itemSchemaUrl: SVELTE_REGISTRY_ITEM_SCHEMA_URL,
	registryName: REGISTRY_NAME,
	alwaysListRegistryDependencies: true,
	isKeptKind: (relPath: string) => /\.(svelte|ts)$/.test(relPath),
	isCode: (relPath: string) => /\.(svelte|ts)$/.test(relPath),
	isExcluded: svelteIsExcluded,
	groupOf: svelteGroupOf,
	componentOf: svelteComponentOf,
	isComponent: (name: string) => !Object.prototype.hasOwnProperty.call(SVELTE_SHARED_ITEMS, name),
	shared: SVELTE_SHARED_ITEMS,
	isFrameworkPackage: (spec: string) => FRAMEWORK_PACKAGE.test(spec),
	typePackages: TYPE_PACKAGES,
	itemType: (isComponent: boolean) => (isComponent ? "registry:ui" : "registry:lib"),
	// The CLI places a file by its FILE type: everything goes under the `ui` alias.
	fileType: () => "registry:ui",
	pathFor: (relPath: string) => `${SVELTE_SOURCE_ROOT}/${relPath}`,
	targetFor: (relPath: string) => `${SVELTE_TARGET_ROOT}/${relPath}`,
	transform,
});
