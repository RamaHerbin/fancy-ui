import { createSSRApp, defineComponent, h, nextTick } from "vue";
import { renderToString } from "vue/server-renderer";
import { render } from "@testing-library/vue";
import { describe, expect, it, vi } from "vitest";
import { useMediaQuery, useReducedMotion } from "./use-media-query.js";
import { REDUCED_MOTION_QUERY } from "./media-query.js";

/** Same fake `window.matchMedia` shape as `media-query.test.ts`, with the
 * change handler exposed so a test can simulate a live preference flip. */
function stubMatchMedia(matches: boolean) {
	let handler: ((event: MediaQueryListEvent) => void) | undefined;
	let currentMatches = matches;
	const mql = {
		get matches() {
			return currentMatches;
		},
		media: "",
		onchange: null,
		addEventListener: vi.fn((_type: string, h: (event: MediaQueryListEvent) => void) => {
			handler = h;
		}),
		removeEventListener: vi.fn(),
		addListener: () => {},
		removeListener: () => {},
		dispatchEvent: () => false,
	} as unknown as MediaQueryList;

	const matchMedia = vi.fn(() => mql);
	Object.defineProperty(window, "matchMedia", {
		value: matchMedia,
		writable: true,
		configurable: true,
	});

	return {
		matchMedia,
		fireChange(next: boolean) {
			currentMatches = next;
			handler?.({ matches: next } as MediaQueryListEvent);
		},
	};
}

function Probe(useHook: () => { value: boolean }) {
	return defineComponent({
		name: "Probe",
		setup() {
			const current = useHook();
			return () => h("div", { "data-testid": "value" }, String(current.value));
		},
	});
}

describe("useMediaQuery", () => {
	it("paints the fallback first, and only adopts the browser's answer on the next flush", async () => {
		// No stub installed: the default test-setup matchMedia always reports
		// matches: false, so a `true` fallback proves the FIRST painted value
		// came from the fallback and not from the browser.
		const { getByTestId } = render(Probe(() => useMediaQuery("(min-width: 1px)", true)));
		// onMounted has already run by the time render() returns (Vue mounts
		// synchronously), but the DOM patch from the resulting ref write is
		// scheduled, not synchronous — so what is on screen right now is still
		// exactly what the render function produced.
		expect(getByTestId("value").textContent).toBe("true");
		await nextTick();
		expect(getByTestId("value").textContent).toBe("false");
	});

	it("renders `fallback` on the server, never the browser's answer", async () => {
		stubMatchMedia(false);
		const html = await renderToString(
			createSSRApp(Probe(() => useMediaQuery("(min-width: 1px)", true)))
		);
		// `true` is the fallback; the stub reports false. start() is never
		// called on the server, so matchMedia is not consulted at all.
		expect(html).toContain(">true<");
	});

	it("hydrates with the fallback, warning-free, then adopts the live answer", async () => {
		const stub = stubMatchMedia(false);
		const App = Probe(() => useMediaQuery("(min-width: 1px)", true));

		const html = await renderToString(createSSRApp(App));
		const container = document.createElement("div");
		container.innerHTML = html;
		document.body.appendChild(container);

		const warnings: string[] = [];
		const app = createSSRApp(App);
		app.config.warnHandler = (msg) => {
			if (/hydrat|mismatch/i.test(msg)) warnings.push(msg);
		};
		app.mount(container);

		// The hydration render read the same `fallback` the server did — this
		// is the property C-7 exists for, and the one the brief names.
		expect(container.textContent).toBe("true");
		expect(warnings).toEqual([]);
		expect(stub.matchMedia).toHaveBeenCalledTimes(1); // onMounted, not the render

		await nextTick();
		expect(container.textContent).toBe("false");

		app.unmount();
		container.remove();
	});

	it("starts the query in onMounted and reflects the live answer", async () => {
		stubMatchMedia(true);
		const { getByTestId } = render(Probe(() => useMediaQuery("(min-width: 1px)", false)));
		await nextTick();
		expect(getByTestId("value").textContent).toBe("true");
	});

	it("reacts to a dispatched change event", async () => {
		const stub = stubMatchMedia(false);
		const { getByTestId } = render(Probe(() => useMediaQuery("(min-width: 1px)", false)));
		expect(getByTestId("value").textContent).toBe("false");

		stub.fireChange(true);
		await nextTick();
		expect(getByTestId("value").textContent).toBe("true");
	});

	it("stops tracking on unmount (does not throw, listener is removed)", () => {
		const stub = stubMatchMedia(false);
		const { unmount } = render(Probe(() => useMediaQuery("(min-width: 1px)", false)));
		expect(() => unmount()).not.toThrow();
		// The MediaQueryList mock is shared across the test; the removeEventListener
		// call proves stop() ran as the scope disposed.
		const mql = stub.matchMedia.mock.results[0]?.value as MediaQueryList;
		expect(mql.removeEventListener).toHaveBeenCalledWith("change", expect.any(Function));
	});
});

describe("useReducedMotion", () => {
	it("queries REDUCED_MOTION_QUERY with fallback false", () => {
		const stub = stubMatchMedia(false);
		render(Probe(() => useReducedMotion()));
		expect(stub.matchMedia).toHaveBeenCalledWith(REDUCED_MOTION_QUERY);
	});

	it("reflects matches: true when the browser reports the preference", async () => {
		stubMatchMedia(true);
		const { getByTestId } = render(Probe(() => useReducedMotion()));
		await nextTick();
		expect(getByTestId("value").textContent).toBe("true");
	});
});
