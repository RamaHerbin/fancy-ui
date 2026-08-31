import { createElement } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import * as pkg from "./index.js";
import * as cam from "./cameleon/index.js";

/**
 * Package-wide hydration gate.
 *
 * Every capitalised export of the package root and of `./cameleon` is server
 * rendered with a single `children` prop, planted into a container, and then
 * hydrated. Any React hydration diagnostic (`console.error`) fails the suite.
 *
 * Self-contained on purpose: the sweep renders and hydrates inside this one
 * file. An earlier version handed HTML between two test files through a JSON
 * file on disk, which pinned an absolute path and relied on vitest running the
 * files in filename order — neither of which holds outside one machine.
 */

type Exported = readonly [name: string, value: unknown];

function exportedComponents(): Exported[] {
	const out: Exported[] = [];
	for (const [name, value] of Object.entries({ ...pkg, ...cam })) {
		if (typeof value !== "function" && typeof value !== "object") continue;
		if (typeof value === "object" && !(value && "$$typeof" in (value as object))) continue;
		if (!/^[A-Z]/.test(name)) continue;
		out.push([name, value]);
	}
	return out;
}

/**
 * Components whose *client* mount throws under jsdom, so hydration cannot be
 * observed for them here. Asserted for exact equality, not as a `>=` budget:
 * a new name appearing (a component that silently stopped hydrating) and a
 * name disappearing (one that now can be swept) both turn this suite red on
 * purpose, so the hole is never allowed to grow unnoticed.
 *
 * Two distinct reasons, both recorded rather than merged:
 *  - a graphics context jsdom does not provide;
 *  - a required prop this sweep does not pass, which the server pass tolerates
 *    (it never reads it) but the mount effect dereferences. That is a limit of
 *    the sweep's single-prop call, not a defect: each of those components has a
 *    colocated suite that mounts it with real props.
 */
const CANNOT_HYDRATE_UNDER_JSDOM = [
	// jsdom's canvas has no 2D context (test-setup returns null from getContext).
	"Confetti",
	// WebGL context creation fails under jsdom.
	"DisplacementText",
	"NoiseReveal",
	// Mount effect dereferences a required prop the sweep does not pass.
	"EditorialEngine",
	"LineReveal",
	"ReasoningPanel",
	"StreamingText",
	"TerminalText",
] as const;

/**
 * Text of a hydration diagnostic, whichever channel it arrives on.
 *
 * React 19 does NOT `console.error` a hydration mismatch: it routes the error
 * to the root's `onRecoverableError`, whose default implementation is
 * `reportError` — so a sweep that only spies on `console.error` sees nothing
 * and passes through a real mismatch. `hydrateAll` therefore supplies its own
 * `onRecoverableError` (which also stops the error surfacing as an unhandled
 * rejection with no component attached to it) and keeps the `console.error`
 * spy alongside for diagnostics React still logs that way.
 */
const HYDRATION_DIAGNOSTIC = /hydrat|did not match|Text content|server render/i;

/**
 * Server HTML for every export the sweep can render from `{ children: "x" }`
 * alone. An export whose server render throws (it needs props this sweep does
 * not pass) is out of scope and covered by its own colocated suite.
 */
function renderAll(): { rendered: Array<readonly [string, unknown, string]>; skipped: string[] } {
	const rendered: Array<readonly [string, unknown, string]> = [];
	const skipped: string[] = [];
	for (const [name, value] of exportedComponents()) {
		try {
			rendered.push([
				name,
				value,
				renderToString(createElement(value as never, { children: "x" } as never)),
			]);
		} catch {
			skipped.push(name);
		}
	}
	return { rendered, skipped };
}

interface HydrateResult {
	/** `name:: first diagnostic` for each component React complained about. */
	mismatched: string[];
	/** Names whose client mount threw before hydration could be judged. */
	threw: string[];
	/** Names that hydrated cleanly. */
	hydrated: number;
}

async function hydrateAll(
	rendered: Array<readonly [string, unknown, string]>
): Promise<HydrateResult> {
	const result: HydrateResult = { mismatched: [], threw: [], hydrated: 0 };

	for (const [name, value, html] of rendered) {
		const container = document.createElement("div");
		container.innerHTML = html;
		document.body.appendChild(container);

		const seen: string[] = [];
		const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
			seen.push(args.map(String).join(" "));
		});
		try {
			let root: ReturnType<typeof hydrateRoot> | undefined;
			await act(async () => {
				root = hydrateRoot(container, createElement(value as never, { children: "x" } as never), {
					onRecoverableError: (error: unknown) => seen.push(String(error)),
				});
			});
			await act(async () => {
				root?.unmount();
			});
			result.hydrated += 1;
		} catch {
			// Recorded, never dropped: the allowlist assertion below is what keeps
			// this branch from quietly swallowing a component that stopped working.
			result.threw.push(name);
		} finally {
			spy.mockRestore();
			container.remove();
		}

		const diagnostics = seen.filter((message) => HYDRATION_DIAGNOSTIC.test(message));
		if (diagnostics.length) result.mismatched.push(`${name}:: ${diagnostics[0]!.slice(0, 400)}`);
	}

	return result;
}

/** The default jsdom environment test-setup installs: nothing matches. */
function installDefaultMatchMedia() {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: false,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		}),
	});
}

describe("hydration sweep", () => {
	afterEach(() => {
		// Both are global mutations; restore them so test order cannot matter.
		window.localStorage.clear();
		installDefaultMatchMedia();
	});

	it("hydrates server HTML without mismatch", async () => {
		const { rendered, skipped } = renderAll();
		const { mismatched, threw, hydrated } = await hydrateAll(rendered);

		expect(mismatched).toEqual([]);
		expect([...threw].sort()).toEqual([...CANNOT_HYDRATE_UNDER_JSDOM].sort());
		// Coverage floor: the two assertions above also pass on empty input, so a
		// refactor that made the sweep stop reaching the components (a broken
		// barrel, a render that throws for everything) would read as green.
		expect(hydrated).toBeGreaterThan(150);
		expect(skipped.length).toBeLessThan(exportedComponents().length / 2);
	}, 120000);

	it("hydrates server HTML in a client whose environment answers differently", async () => {
		// The real hazard an SSR app hits: the server renders with no media
		// queries and no persisted storage, and the browser that hydrates reports
		// reduced motion and already has sound preferences saved. A component that
		// reads either during render — instead of in an effect — mismatches here
		// while passing the sweep above. The render therefore runs BEFORE the
		// environment is changed; only hydration sees the new answers.
		const { rendered } = renderAll();

		Object.defineProperty(window, "matchMedia", {
			writable: true,
			configurable: true,
			value: (query: string) => ({
				matches: true,
				media: query,
				onchange: null,
				addEventListener: () => {},
				removeEventListener: () => {},
				dispatchEvent: () => false,
				addListener: () => {},
				removeListener: () => {},
			}),
		});
		window.localStorage.setItem(
			"fancy-ui-sound",
			JSON.stringify({ v: 1, enabled: true, volume: 0.9, theme: "fancy" })
		);

		const { mismatched, threw, hydrated } = await hydrateAll(rendered);

		expect(mismatched).toEqual([]);
		expect([...threw].sort()).toEqual([...CANNOT_HYDRATE_UNDER_JSDOM].sort());
		expect(hydrated).toBeGreaterThan(150);
	}, 180000);
});
