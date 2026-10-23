/**
 * The React package (`react/src`): every kept file of a component folder or
 * shared module ships under `@ui/fancy/<path relative to react/src>`, so the
 * relative imports stay byte-identical on the consumer side. Client modules
 * get the `"use client"` directive; the site strips ".js" from relative
 * specifiers for the Next bundlers.
 */

import { REGISTRY_ITEM_SCHEMA_URL, REGISTRY_NAME, REGISTRY_SCHEMA_URL } from "../constants.js";
import { stripJsExtensions } from "../graph.js";
import { TYPE_PACKAGES, docsFor } from "../stack.js";
import type { RegistryStack, SharedItem, TransformContext } from "../stack.js";

export { TYPE_PACKAGES, docsFor };

/** Where every file lands in the consumer project, before the `react/src`-relative path. */
export const TARGET_ROOT = "@ui/fancy";
/** Where every file lives in this repository, before the `react/src`-relative path. */
export const SOURCE_ROOT = "react/src";
/** The directive prepended to every client module. */
export const USE_CLIENT = '"use client";';

/** The shared (non-component) items, in the order the groups are documented. */
export const SHARED_ITEMS: Readonly<Record<string, SharedItem>> = Object.freeze({
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
	"internals-hdr": {
		title: "Shared internals (HDR)",
		description:
			"The HDR light layer: a WebGPU overlay with extended tone mapping that glow components use to draw light above SDR white on HDR displays.",
	},
	sound: {
		title: "Sound",
		description: "The opt-in interface sound engine, its themes, hooks and toggle.",
	},
});

/** Anything in the react / react-dom family, JSX runtimes included. */
const REACT_PACKAGE = /^react(-dom)?(\/|$)/;

const isCode = (relPath: string) => /\.(ts|tsx)$/.test(relPath);

/**
 * The registry item a source file belongs to, or `null` for files outside
 * every item (the root barrel, `cameleon/`, test setup).
 */
export function groupOf(relPath: string): string | null {
	if (relPath === "utils.ts") return "utils";
	const parts = relPath.split("/");
	if (parts[0] === "components" && parts.length >= 3) return parts[1];
	if (parts[0] === "sound" && parts.length >= 2) return "sound";
	if (parts[0] === "internals") {
		if (parts.length === 2) return "internals";
		if (
			parts[1] === "dom" ||
			parts[1] === "motion" ||
			parts[1] === "markdown" ||
			parts[1] === "hdr"
		) {
			return `internals-${parts[1]}`;
		}
	}
	return null;
}

/**
 * Files that never ship: tests, harnesses, the Web Audio mock, READMEs and
 * anything that is not `.ts` / `.tsx` / `.css`. (`dev.ts` is decided by the
 * builder, which keeps it only when a kept file imports it.)
 */
export function isExcluded(relPath: string): boolean {
	const file = relPath.split("/").pop() ?? relPath;
	if (!/\.(ts|tsx|css)$/.test(file)) return true;
	if (/\.test\.tsx?$/.test(file)) return true;
	if (/Harness\.tsx?$/.test(file)) return true;
	if (/^web-audio-mock\.ts$/.test(file)) return true;
	if (/^README/i.test(file)) return true;
	return false;
}

/** `utils.ts` → `utils.js`: the output name `client-boundary.mjs` lists. */
function outputName(relPath: string): string {
	return relPath.replace(/\.tsx?$/, ".js");
}

/** Optional extension strip, then the directive on client modules only. */
function transform(relPath: string, source: string, ctx: TransformContext): string {
	const body = ctx.stripJsExtension ? stripJsExtensions(source) : source;
	if (ctx.serverModules.has(outputName(relPath))) return body;
	if (/^\s*["']use client["'];?/.test(body)) return body;
	return `${USE_CLIENT}\n\n${body}`;
}

export const reactStack: RegistryStack = Object.freeze<RegistryStack>({
	id: "react",
	sourceRoot: SOURCE_ROOT,
	urlPath: "/r",
	schemaUrl: REGISTRY_SCHEMA_URL,
	itemSchemaUrl: REGISTRY_ITEM_SCHEMA_URL,
	registryName: REGISTRY_NAME,
	isKeptKind: (relPath: string) => /\.(ts|tsx|css)$/.test(relPath),
	isCode,
	isExcluded,
	groupOf,
	componentOf: (relPath: string) => {
		const parts = relPath.split("/");
		return parts[0] === "components" && parts.length >= 3 ? parts[1] : null;
	},
	isComponent: (name: string) => !Object.prototype.hasOwnProperty.call(SHARED_ITEMS, name),
	shared: SHARED_ITEMS,
	isFrameworkPackage: (spec: string) => REACT_PACKAGE.test(spec),
	typePackages: TYPE_PACKAGES,
	itemType: (isComponent: boolean) => (isComponent ? "registry:ui" : "registry:lib"),
	fileType: (itemType) => itemType,
	pathFor: (relPath: string) => `${SOURCE_ROOT}/${relPath}`,
	targetFor: (relPath: string) => `${TARGET_ROOT}/${relPath}`,
	transform,
});
