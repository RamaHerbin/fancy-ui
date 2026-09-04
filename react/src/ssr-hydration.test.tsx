import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { act } from "@testing-library/react";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
	NEEDS_PROPS,
	type Exported,
	exportedComponents,
	tree,
} from "./ssr-sweep.fixtures.js";

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
 *
 * One case per export, not one case for the whole sweep. The monolithic version
 * was a single `it` on a hard-coded 120-second budget, and it timed out under
 * load with no indication of which component was slow — a red gate that says
 * nothing trains a reviewer to re-run it rather than read it. Now a slow or
 * broken component fails its own case, under its own name.
 */

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
 * and passes through a real mismatch. `hydrateOne` therefore supplies its own
 * `onRecoverableError` (which also stops the error surfacing as an unhandled
 * rejection with no component attached to it) and keeps the `console.error`
 * spy alongside for diagnostics React still logs that way.
 */
const HYDRATION_DIAGNOSTIC = /hydrat|did not match|Text content|server render/i;

/** Server HTML per export, plus the names whose server render threw. */
interface Rendered {
	html: Map<string, string>;
	skipped: string[];
}

function renderAll(swept: Exported[]): Rendered {
	const html = new Map<string, string>();
	const skipped: string[] = [];
	for (const [name, value] of swept) {
		try {
			html.set(name, renderToString(tree(value)));
		} catch {
			skipped.push(name);
		}
	}
	return { html, skipped };
}

/**
 * Hydrate one export and assert on it: no diagnostic, and its membership of the
 * two frozen lists is what the run actually produced.
 */
async function hydrateOne(name: string, value: unknown, rendered: Rendered) {
	if (rendered.skipped.includes(name)) {
		expect(NEEDS_PROPS as readonly string[]).toContain(name);
		return;
	}
	expect(NEEDS_PROPS as readonly string[]).not.toContain(name);

	const container = document.createElement("div");
	container.innerHTML = rendered.html.get(name)!;
	document.body.appendChild(container);

	const seen: string[] = [];
	const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
		seen.push(args.map(String).join(" "));
	});
	// Recorded, never dropped: the assertion below is what keeps a failed mount
	// from being quietly swallowed. Both channels feed it — the error boundary,
	// which both React majors route a commit-phase throw through, and `act`
	// rethrowing, which is React 19's own path and is kept as a backstop.
	let threw = false;
	try {
		let root: ReturnType<typeof hydrateRoot> | undefined;
		await act(async () => {
			root = hydrateRoot(container, tree(value, () => (threw = true)), {
				onRecoverableError: (error: unknown) => seen.push(String(error)),
			});
		});
		await act(async () => {
			root?.unmount();
		});
	} catch {
		threw = true;
	} finally {
		spy.mockRestore();
		container.remove();
	}

	if (threw) {
		// A component that never mounted cannot be judged on hydration, so the
		// membership assertion is the whole result for it.
		expect(CANNOT_HYDRATE_UNDER_JSDOM as readonly string[]).toContain(name);
		return;
	}
	expect(CANNOT_HYDRATE_UNDER_JSDOM as readonly string[]).not.toContain(name);
	const diagnostics = seen.filter((message) => HYDRATION_DIAGNOSTIC.test(message));
	expect(diagnostics.map((message) => `${name}:: ${message.slice(0, 400)}`)).toEqual([]);
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

const swept = exportedComponents();

/** Both sweeps' coverage floor: the assertions above also pass on empty input. */
const HYDRATED_FLOOR = 150;
/** Per case, generous: the point is that one slow component names itself. */
const CASE_TIMEOUT = 30_000;
/** The whole render pass runs in one hook, so it gets the budget of a sweep. */
const RENDER_TIMEOUT = 120_000;

/** Every element comes from `tree()`, so both sweeps hydrate under StrictMode. */
describe("hydration sweep", () => {
	const rendered: Rendered = { html: new Map(), skipped: [] };

	beforeAll(() => {
		Object.assign(rendered, renderAll(swept));
	}, RENDER_TIMEOUT);

	afterEach(() => {
		// Both are global mutations; restore them so test order cannot matter.
		window.localStorage.clear();
		installDefaultMatchMedia();
	});

	it.each(swept)(
		"%s hydrates server HTML without mismatch",
		async (name, value) => {
			await hydrateOne(name, value, rendered);
		},
		CASE_TIMEOUT
	);

	it("sweeps the whole barrel, and the frozen lists have no stale names", () => {
		expect([...rendered.skipped].sort()).toEqual([...NEEDS_PROPS].sort());
		const names = new Set(swept.map(([name]) => name));
		expect(CANNOT_HYDRATE_UNDER_JSDOM.filter((name) => !names.has(name))).toEqual([]);
		expect(rendered.html.size).toBeGreaterThan(HYDRATED_FLOOR);
	});
});

describe("hydration sweep, in a client whose environment answers differently", () => {
	// The real hazard an SSR app hits: the server renders with no media queries
	// and no persisted storage, and the browser that hydrates reports reduced
	// motion and already has sound preferences saved. A component that reads
	// either during render — instead of in an effect — mismatches here while
	// passing the sweep above. The render therefore runs BEFORE the environment
	// is changed; only hydration sees the new answers.
	const rendered: Rendered = { html: new Map(), skipped: [] };

	beforeAll(() => {
		Object.assign(rendered, renderAll(swept));
	}, RENDER_TIMEOUT);

	beforeAll(() => {
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
	});

	afterAll(() => {
		window.localStorage.clear();
		installDefaultMatchMedia();
	});

	it.each(swept)(
		"%s hydrates server HTML without mismatch",
		async (name, value) => {
			await hydrateOne(name, value, rendered);
		},
		CASE_TIMEOUT
	);

	it("sweeps the whole barrel, and the frozen lists have no stale names", () => {
		expect([...rendered.skipped].sort()).toEqual([...NEEDS_PROPS].sort());
		expect(rendered.html.size).toBeGreaterThan(HYDRATED_FLOOR);
	});
});
