import * as pkg from "./index.js";
import * as cam from "./cameleon/index.js";

/**
 * What the two package-wide SSR sweeps agree on: which exports they visit and
 * which props (if any) each one needs to render at all.
 *
 * Shared rather than duplicated, for the same reason as the React package's
 * copy of this file: the export list and its fixtures are a frozen contract
 * both sweeps render against, and two copies is one update away from two
 * different contracts.
 *
 * Not part of the published package: excluded in `tsconfig.build.json`
 * alongside `test-setup.ts`, so no declaration for it reaches `dist`.
 */

export type Exported = readonly [key: string, value: unknown]; // key = "<barrel>:<Export>"

/**
 * Per-export prop fixtures for components that need more than the sweep's
 * default `default` slot with children "x". Empty until a migration wave adds
 * a component that needs one — most components need nothing beyond the slot.
 */
export const fixtures: Record<string, Record<string, unknown>> = {
	// `open` is required and renders nothing when falsy, so without it the sweep
	// would compare two empty strings and prove nothing about the panel.
	"root:Presence": { open: true },
	// The skin engine's provider requires a skin; the default one is the neutral fixture.
	"cameleon:FancyProvider": { skin: cam.defaultSkin },
	// The cameleon Tooltip requires its content.
	"cameleon:Tooltip": { content: "x" },
	// Keys are "<barrel>:<Export>" because the root barrel and the cameleon
	// barrel both export names such as `Select` (a headless listbox vs a
	// native-control primitive) with different prop shapes; a bare name could
	// only address one of them.
	// BEGIN generated fixtures (written by the registrar between waves from the port agents' reports; do not edit by hand)
	"root:Select": {"options":[{"value":"a","label":"A"},{"value":"b","label":"B"}],"value":"a"},
	// END generated fixtures
	// NO `Dialog` entry, and the omission is deliberate rather than an oversight.
	// An open dialog puts its panel behind a teleport, and the hydration sweep
	// server-renders under jsdom — where `document` exists, so the teleport is
	// handed an element rather than the selector string a server render requires.
	// The renderer then drops the whole teleport payload and the client hydration
	// mismatches, turning that sweep red for a reason that has nothing to do with
	// this component. A closed dialog hydrates clean, which is what it gets here
	// until the portal resolves to a selector string on ANY server render rather
	// than only when `document` is missing. Measured both ways; see the dialog
	// folder's notes.
};

/**
 * True when a barrel export looks like a Vue component: a plain function
 * (functional component) or an object carrying `setup`, `render`, or
 * `template` (options-API / SFC-compiled component).
 */
function isVueComponent(value: unknown): boolean {
	if (typeof value === "function") return true;
	if (typeof value === "object" && value !== null) {
		return "setup" in value || "render" in value || "template" in value;
	}
	return false;
}

/** Every capitalised Vue-component export of the root barrel and `./cameleon`, keyed by barrel. */
export function exportedComponents(): Exported[] {
	const out: Exported[] = [];
	for (const [barrel, mod] of [
		["root", pkg],
		["cameleon", cam],
	] as const) {
		for (const [name, value] of Object.entries(mod)) {
			if (!/^[A-Z]/.test(name)) continue;
			if (!isVueComponent(value)) continue;
			out.push([`${barrel}:${name}`, value]);
		}
	}
	return out;
}
