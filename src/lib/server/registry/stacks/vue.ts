/**
 * The Vue package (`vue/src`): every kept file of a component folder or
 * shared module ships as a `registry:ui` file with NO target. The CLI then
 * places a file by its type (the consumer's `ui` alias) and by its `path`:
 * the path is a steering path, `src/components/ui/fancy/<rel>`, which the CLI
 * cuts after the `components/ui` alias segment, so every file lands at
 * `<ui>/fancy/<rel>` whatever the install set and the relative imports hold.
 * Sources ship byte-identical (relative ".js" specifiers kept; Vite resolves
 * them to the `.ts` source).
 */

import {
	REGISTRY_NAME,
	VUE_REGISTRY_ITEM_SCHEMA_URL,
	VUE_REGISTRY_SCHEMA_URL,
} from "../constants.js";
import { TYPE_PACKAGES } from "../stack.js";
import type { RegistryStack, SharedItem } from "../stack.js";

/** Where every file lives in this repository, before the relative path. */
export const VUE_SOURCE_ROOT = "vue/src";
/** The steering path every shipped file's `path` starts with. */
export const VUE_PATH_PREFIX = "src/components/ui/fancy/";

/** The shared (non-component) items, in the order the groups are documented. */
export const VUE_SHARED_ITEMS: Readonly<Record<string, SharedItem>> = Object.freeze({
	utils: {
		title: "Shared utilities",
		description: "The class-name merge helper every component styles itself with.",
	},
	internals: {
		title: "Shared internals",
		description:
			"Composables and helpers the components share: positioning, focus, dismissal, ids, text streaming, portals and the streaming-safe markdown renderer with its styles.",
	},
	"internals-dom": {
		title: "Shared internals (DOM)",
		description: "Ref and context helpers for DOM-bound components.",
	},
	"internals-motion": {
		title: "Shared internals (motion)",
		description: "Animation primitives: easing, presence, stagger, in-view and motion tokens.",
	},
	"internals-hdr": {
		title: "Shared internals (HDR)",
		description:
			"The HDR light layer: a WebGPU overlay with extended tone mapping that glow components use to draw light above SDR white on HDR displays.",
	},
	sound: {
		title: "Sound",
		description: "The opt-in interface sound engine, its themes, composables and toggle.",
	},
});

/** `vue`, `vue/*`, `@vue/*`, `nuxt`, `nuxt/*`, `#imports`, `#app`, `#app/*`. */
const FRAMEWORK_PACKAGE = /^(vue(\/|$)|@vue\/|nuxt(\/|$)|#imports$|#app(\/|$))/;

const KEPT_KIND = /\.(vue|ts|css)$/;
const CODE_KIND = /\.(vue|ts)$/;

/** The component folder a file sits in (`components/<slug>/…`), or null. */
export function vueComponentOf(relPath: string): string | null {
	const parts = relPath.split("/");
	return parts[0] === "components" && parts.length >= 3 ? parts[1] : null;
}

/**
 * The registry item a source file belongs to, or `null` for files outside
 * every item (the root barrel, `cameleon/`, root tests and fixtures, the
 * test setup).
 */
export function vueGroupOf(relPath: string): string | null {
	if (relPath === "utils.ts") return "utils";
	const parts = relPath.split("/");
	if (parts[0] === "components" && parts.length >= 3) return parts[1];
	if (parts[0] === "sound" && parts.length >= 2) return "sound";
	if (parts[0] === "internals") {
		if (parts.length === 2) return "internals";
		if (parts.length === 3 && (parts[1] === "dom" || parts[1] === "motion" || parts[1] === "hdr")) {
			return `internals-${parts[1]}`;
		}
	}
	return null;
}

/** Tests, fixtures, the test setup, the Web Audio mock, READMEs and other kinds. */
export function vueIsExcluded(relPath: string): boolean {
	const file = relPath.split("/").pop() ?? relPath;
	if (!KEPT_KIND.test(file)) return true;
	if (/\.test\.ts$/.test(file)) return true;
	if (/\.fixtures\.ts$/.test(file)) return true;
	if (file === "test-setup.ts") return true;
	if (file === "web-audio-mock.ts") return true;
	if (/^README/i.test(file)) return true;
	return false;
}

export const vueStack: RegistryStack = Object.freeze<RegistryStack>({
	id: "vue",
	sourceRoot: VUE_SOURCE_ROOT,
	urlPath: "/r/vue",
	schemaUrl: VUE_REGISTRY_SCHEMA_URL,
	itemSchemaUrl: VUE_REGISTRY_ITEM_SCHEMA_URL,
	registryName: REGISTRY_NAME,
	isKeptKind: (relPath: string) => KEPT_KIND.test(relPath),
	isCode: (relPath: string) => CODE_KIND.test(relPath),
	isExcluded: vueIsExcluded,
	groupOf: vueGroupOf,
	componentOf: vueComponentOf,
	isComponent: (name: string) => !Object.prototype.hasOwnProperty.call(VUE_SHARED_ITEMS, name),
	shared: VUE_SHARED_ITEMS,
	isFrameworkPackage: (spec: string) => FRAMEWORK_PACKAGE.test(spec),
	typePackages: TYPE_PACKAGES,
	itemType: (isComponent: boolean) => (isComponent ? "registry:ui" : "registry:lib"),
	// The CLI places a file by its FILE type: everything goes under the `ui` alias.
	fileType: () => "registry:ui",
	pathFor: (relPath: string) => `${VUE_PATH_PREFIX}${relPath}`,
	// A target is resolved against the project root, aliases ignored: never emit one.
	targetFor: () => undefined,
	transform: (_relPath: string, source: string) => source,
});
