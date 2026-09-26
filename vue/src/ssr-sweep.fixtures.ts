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

export type Exported = readonly [name: string, value: unknown];

/**
 * Per-export prop fixtures for components that need more than the sweep's
 * default `default` slot with children "x". Empty until a migration wave adds
 * a component that needs one — most components need nothing beyond the slot.
 */
export const fixtures: Record<string, Record<string, unknown>> = {
	// `open` is required and renders nothing when falsy, so without it the sweep
	// would compare two empty strings and prove nothing about the panel.
	Presence: { open: true },
	// The skin engine's provider requires a skin; the default one is the neutral fixture.
	FancyProvider: { skin: cam.defaultSkin },
	// The cameleon Tooltip requires its content (the root barrel has no Tooltip yet).
	Tooltip: { content: "x" },
	// NO `Select` entry, deliberately, even though the component needs one: the
	// key space below cannot address it. `exportedComponents()` merges the root
	// barrel with the `./cameleon` barrel and spreads cameleon LAST, and both
	// export the name `Select` — so the key `Select` resolves to the cameleon
	// primitive (a native-control wrapper with a different prop shape), and a
	// fixture written for the root component would be handed to that one
	// instead: its unknown keys fall through as attributes and land on the
	// primitive's own element. Measured by identity, not inferred. Whoever owns
	// the sweep has to key the two barrels apart first; the root `Select` needs
	// `{ options: [{ value, label }, …], value }` the moment it can be reached,
	// since `options` is required and the trigger renders its label off it.

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

/** Every capitalised Vue-component export of the root barrel and `./cameleon`. */
export function exportedComponents(): Exported[] {
	const out: Exported[] = [];
	for (const [name, value] of Object.entries({ ...pkg, ...cam })) {
		if (!/^[A-Z]/.test(name)) continue;
		if (!isVueComponent(value)) continue;
		out.push([name, value]);
	}
	return out;
}
