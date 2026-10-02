// @vitest-environment node
import { describe, it, expect, vi, afterEach } from "vitest";
import { createSSRApp } from "vue";
import { renderToString } from "vue/server-renderer";
import TerminalText from "./TerminalText.vue";

/**
 * The imperative engine (timeout schedule, glitch chain, `onComplete`) belongs
 * to the mounted client only: the source's `$effect`s never run during a server
 * render. These cases pin that down — an `immediate` watcher would put the whole
 * engine, `Math.random` included, inside the SSR `setup` pass.
 */
describe("TerminalText (SSR)", () => {
	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("renders the empty shell without touching timers or randomness", async () => {
		const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");
		const randomSpy = vi.spyOn(Math, "random");
		const onComplete = vi.fn();

		const html = await renderToString(
			createSSRApp(TerminalText, {
				lines: ["hello world"],
				speed: 5,
				glitch: true,
				onComplete,
			})
		);

		expect(html).toContain("font-mono text-sm leading-relaxed");
		expect(setTimeoutSpy).not.toHaveBeenCalled();
		expect(randomSpy).not.toHaveBeenCalled();
		expect(onComplete).not.toHaveBeenCalled();
	});

	it("renders identically twice (no Math.random/Date.now drift)", async () => {
		const first = await renderToString(
			createSSRApp(TerminalText, { lines: ["hello world"], speed: 5 })
		);
		const second = await renderToString(
			createSSRApp(TerminalText, { lines: ["hello world"], speed: 5 })
		);
		expect(first).toBe(second);
	});

	it("renders without props, the way the package-wide sweep calls it", async () => {
		// `lines` is required, so Vue warns; the point is that the render still
		// resolves instead of throwing on `lines.length` inside `setup`.
		const app = createSSRApp(TerminalText, {});
		app.config.warnHandler = () => {};
		await expect(renderToString(app)).resolves.toContain("font-mono");
	});
});
