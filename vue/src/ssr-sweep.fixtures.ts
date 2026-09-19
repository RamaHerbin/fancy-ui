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
export const fixtures: Record<string, Record<string, unknown>> = {};

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
