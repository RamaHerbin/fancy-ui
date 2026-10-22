import { afterEach, describe, expect, it, vi } from "vitest";
import { flushSync } from "svelte";
import { cleanup, render } from "@testing-library/svelte";
import EggOverlayHost from "./EggOverlayHost.svelte";
import { eggRuntime } from "./runtime.svelte.js";

vi.mock("./registry.js", () => ({
	EGGS: [
		{
			id: "cheatcode",
			order: 10,
			title: "Party mode",
			hint: "h",
			trigger: { kind: "manual" },
			load: () => import("./__fixtures__/ProbePayload.svelte"),
		},
		{
			id: "matrix",
			order: 20,
			title: "Wake up",
			hint: "h",
			trigger: { kind: "manual" },
			load: () => import("./__fixtures__/ProbePayload.svelte"),
		},
	],
	EGG_TOTAL: 2,
}));

vi.mock("$lib/stores", () => ({ createMotionState: () => ({ paused: false }) }));

describe("EggOverlayHost", () => {
	afterEach(() => {
		eggRuntime.dismiss();
		cleanup();
	});

	it("renders only an empty, always-present live region while idle", () => {
		const { container } = render(EggOverlayHost);
		expect(container.querySelector("[data-egg-overlay]")).toBeNull();
		const live = container.querySelector("[data-egg-announcer]");
		expect(live?.getAttribute("role")).toBe("status");
		expect(live?.textContent).toBe("");
	});

	it("mounts the payload in a tagged, pointer-transparent host and removes it on dismiss", async () => {
		const { container } = render(EggOverlayHost);
		await eggRuntime.trigger("cheatcode");
		flushSync();
		const host = container.querySelector<HTMLElement>("[data-egg-overlay='cheatcode']");
		expect(host).not.toBeNull();
		expect(host!.style.zIndex).toBe("10000");
		expect(host!.className).toContain("pointer-events-none");
		expect(host!.hasAttribute("aria-live")).toBe(false);
		expect(host!.querySelector("[data-probe]")?.textContent).toBe("cheatcode:moving");
		const live = container.querySelector("[data-egg-announcer]")!;
		expect(live.textContent).toBe("Party mode. Press Escape to stop.");
		eggRuntime.dismiss();
		flushSync();
		expect(container.querySelector("[data-egg-overlay]")).toBeNull();
		expect(live.textContent).toBe("");
		// The live region itself is never re-created.
		expect(container.querySelector("[data-egg-announcer]")).toBe(live);
	});

	it("remounts the payload when one egg directly replaces another", async () => {
		const { container } = render(EggOverlayHost);
		await eggRuntime.trigger("cheatcode");
		flushSync();
		const first = container.querySelector("[data-probe]");
		expect(first?.textContent).toBe("cheatcode:moving");
		await eggRuntime.trigger("matrix");
		flushSync();
		expect(container.querySelector("[data-egg-overlay='cheatcode']")).toBeNull();
		const host = container.querySelector("[data-egg-overlay='matrix']");
		expect(host?.querySelector("[data-probe]")?.textContent).toBe("matrix:moving");
		expect(first?.isConnected).toBe(false);
		expect(container.querySelector("[data-egg-announcer]")?.textContent).toBe(
			"Wake up. Press Escape or Leave to exit."
		);
	});
});

describe("EggQuietNote", () => {
	it("is a static status pill with the found copy", async () => {
		const Note = (await import("./EggQuietNote.svelte")).default;
		const { container } = render(Note, { props: { title: "Party mode" } });
		const note = container.querySelector<HTMLElement>("[data-egg-note]");
		// Spoken by the host's live region; the pill itself is visual only.
		expect(note?.getAttribute("aria-hidden")).toBe("true");
		expect(note?.textContent?.trim()).toBe(
			"✦ Party mode — found. Motion is paused, so that's all you'll see."
		);
		cleanup();
	});
});
