import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import { flushSync } from "svelte";
import SoundToggle from "./SoundToggle.svelte";
import Harness from "./SoundToggleHarness.test.svelte";
import { resetSoundForTests, sound } from "./sound.svelte.js";
import type { SoundStatus } from "./types.js";

function button(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button") as HTMLButtonElement;
}

function baseStatus(overrides: Partial<SoundStatus> = {}): SoundStatus {
	return {
		supported: true,
		enabled: false,
		volume: 0.5,
		theme: "fancy",
		engine: "idle",
		storage: "ok",
		lastCue: null,
		lastPlayedAt: null,
		lastError: null,
		...overrides,
	};
}

// A small self-consistent model of the controller, independent of whichever
// stage the real sound.svelte.ts implementation is at — this suite proves
// SoundToggle's own contract (§7), not the controller's (§5), and the two
// are built concurrently by different agents.
function mockController(initialEnabled = false) {
	let enabled = initialEnabled;
	const enabledGetter = vi.spyOn(sound, "enabled", "get").mockImplementation(() => enabled);
	const statusGetter = vi
		.spyOn(sound, "status", "get")
		.mockImplementation(() => baseStatus({ enabled }));
	const toggle = vi.spyOn(sound, "toggle").mockImplementation(() => {
		enabled = !enabled;
		return enabled;
	});
	const unlock = vi.spyOn(sound, "unlock").mockResolvedValue(false);
	const play = vi.spyOn(sound, "play").mockImplementation(() => {});
	return {
		toggle,
		unlock,
		play,
		enabledGetter,
		statusGetter,
		setEnabled(next: boolean) {
			enabled = next;
		},
	};
}

describe("SoundToggle", () => {
	afterEach(() => {
		vi.restoreAllMocks();
		cleanup();
	});

	it("renders a real switch button with a constant accessible name", () => {
		mockController(false);
		const { container } = render(SoundToggle, { props: {} });
		const el = button(container);

		expect(el.tagName).toBe("BUTTON");
		expect(el.getAttribute("type")).toBe("button");
		expect(el.getAttribute("role")).toBe("switch");
		expect(el.getAttribute("aria-label")).toBe("Sound");
	});

	it("reflects an initial 'off' controller state through aria-checked and data-state", () => {
		mockController(false);
		const { container } = render(SoundToggle, { props: {} });
		const el = button(container);

		expect(el.getAttribute("aria-checked")).toBe("false");
		expect(el.getAttribute("data-state")).toBe("off");
	});

	it("reflects an initial 'on' controller state through aria-checked and data-state", () => {
		mockController(true);
		const { container } = render(SoundToggle, { props: {} });
		const el = button(container);

		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(el.getAttribute("data-state")).toBe("on");
	});

	it("keeps the accessible name identical regardless of state — the state is carried by aria-checked alone", () => {
		mockController(true);
		const { container } = render(SoundToggle, { props: { label: "Sound" } });
		expect(button(container).getAttribute("aria-label")).toBe("Sound");
	});

	it("toggles the preference on click and reports the new value through onEnabledChange", async () => {
		const ctl = mockController(false);
		const onEnabledChange = vi.fn();
		const { container } = render(SoundToggle, { props: { onEnabledChange } });
		const el = button(container);

		await fireEvent.click(el);

		expect(ctl.toggle).toHaveBeenCalledTimes(1);
		expect(onEnabledChange).toHaveBeenCalledTimes(1);
		expect(onEnabledChange).toHaveBeenCalledWith(true);
	});

	it("toggles via Space, the same way a real browser's default action would (jsdom does not synthesize it)", async () => {
		const ctl = mockController(false);
		const onEnabledChange = vi.fn();
		const { container } = render(SoundToggle, { props: { onEnabledChange } });
		const el = button(container);
		el.focus();

		await fireEvent.keyDown(el, { key: " " });
		await fireEvent.click(el);

		expect(ctl.toggle).toHaveBeenCalledTimes(1);
		expect(onEnabledChange).toHaveBeenCalledWith(true);
	});

	it("plays the toggle-on confirmation only after unlock resolves true, and only when turning sound on", async () => {
		const ctl = mockController(false);
		ctl.unlock.mockResolvedValue(true);
		const { container } = render(SoundToggle, { props: {} });

		await fireEvent.click(button(container));
		await Promise.resolve();
		await Promise.resolve();

		expect(ctl.unlock).toHaveBeenCalledTimes(1);
		expect(ctl.play).toHaveBeenCalledTimes(1);
		expect(ctl.play).toHaveBeenCalledWith("toggle-on");
	});

	it("never plays a cue when unlock resolves false", async () => {
		const ctl = mockController(false);
		ctl.unlock.mockResolvedValue(false);
		const { container } = render(SoundToggle, { props: {} });

		await fireEvent.click(button(container));
		await Promise.resolve();
		await Promise.resolve();

		expect(ctl.unlock).toHaveBeenCalledTimes(1);
		expect(ctl.play).not.toHaveBeenCalled();
	});

	it("never calls unlock or play when the click turns sound off", async () => {
		const ctl = mockController(true);
		const { container } = render(SoundToggle, { props: {} });

		await fireEvent.click(button(container));

		expect(ctl.toggle).toHaveBeenCalledTimes(1);
		expect(ctl.unlock).not.toHaveBeenCalled();
		expect(ctl.play).not.toHaveBeenCalled();
	});

	it("plays nothing and calls nothing while disabled", async () => {
		const ctl = mockController(false);
		const onEnabledChange = vi.fn();
		const { container } = render(SoundToggle, { props: { disabled: true, onEnabledChange } });
		const el = button(container);

		expect(el.disabled).toBe(true);
		await fireEvent.click(el);

		expect(ctl.toggle).not.toHaveBeenCalled();
		expect(onEnabledChange).not.toHaveBeenCalled();
	});

	it("forces disabled when the engine reports unsupported and sound is off, even without the disabled prop", () => {
		mockController(false);
		vi.spyOn(sound, "status", "get").mockReturnValue(baseStatus({ engine: "unsupported" }));
		const { container } = render(SoundToggle, { props: {} });

		expect(button(container).disabled).toBe(true);
		expect(button(container).title).toMatch(/no Web Audio/);
	});

	it("never disables a switch that is currently on, even when unsupported — a stored preference must stay undoable", async () => {
		const ctl = mockController(true);
		vi.spyOn(sound, "status", "get").mockReturnValue(
			baseStatus({ engine: "unsupported", enabled: true })
		);
		const { container } = render(SoundToggle, { props: {} });

		expect(button(container).disabled).toBe(false);
		await fireEvent.click(button(container));
		expect(ctl.toggle).toHaveBeenCalledTimes(1);
	});

	it("renders against the real controller without a reactivity error (first access happens inside a $derived)", () => {
		resetSoundForTests();
		const { container } = render(SoundToggle, { props: {} });
		expect(button(container).getAttribute("aria-checked")).toBe("false");
		expect(button(container).getAttribute("role")).toBe("switch");
	});

	it("keeps tracking the real controller after being its very first reader (the header case)", () => {
		resetSoundForTests();
		const { container } = render(SoundToggle, { props: {} });
		expect(button(container).getAttribute("aria-checked")).toBe("false");

		sound.enable();
		flushSync();
		expect(button(container).getAttribute("aria-checked")).toBe("true");

		sound.disable();
		flushSync();
		expect(button(container).getAttribute("aria-checked")).toBe("false");
		resetSoundForTests();
	});

	it("stays enabled when supported and the disabled prop is left at its default", () => {
		mockController(false);
		const { container } = render(SoundToggle, { props: {} });
		expect(button(container).disabled).toBe(false);
	});

	it("keeps both glyph states in the DOM at all times, switching only which one is styled active via data-state", () => {
		mockController(true);
		const { container } = render(SoundToggle, { props: {} });
		const svg = container.querySelector("svg") as SVGElement;

		expect(svg.querySelector(".ft-sound-toggle-glyph-on")).not.toBeNull();
		expect(svg.querySelector(".ft-sound-toggle-glyph-off")).not.toBeNull();
		expect(button(container).getAttribute("data-state")).toBe("on");
	});

	it("hides the label and state words from the accessible tree when showLabel is set", () => {
		mockController(false);
		const { container } = render(SoundToggle, {
			props: { showLabel: true, label: "Sound", labelOff: "Off" },
		});
		const spans = container.querySelectorAll("button > span");

		expect(spans.length).toBe(2);
		spans.forEach((span) => expect(span.getAttribute("aria-hidden")).toBe("true"));
		expect(spans[0].textContent).toBe("Sound");
		expect(spans[1].textContent).toBe("Off");
	});

	it("renders no visible label words when showLabel is left at its default", () => {
		mockController(false);
		const { container } = render(SoundToggle, { props: {} });
		expect(container.querySelectorAll("button > span").length).toBe(0);
	});

	it("carries data-sound-toggle, data-size and data-variant as stable hooks", () => {
		mockController(false);
		const { container } = render(SoundToggle, { props: { size: "lg", variant: "ghost" } });
		const el = button(container);

		expect(el.hasAttribute("data-sound-toggle")).toBe(true);
		expect(el.getAttribute("data-size")).toBe("lg");
		expect(el.getAttribute("data-variant")).toBe("ghost");
	});

	it.each([
		["sm", "h-8"],
		["md", "h-9"],
		["lg", "h-10"],
	] as const)("sizes %s to the %s header-scale height", (size, heightClass) => {
		mockController(false);
		const { container } = render(SoundToggle, { props: { size } });
		expect(button(container).className).toContain(heightClass);
	});

	it("the outline md variant matches the docs header trigger scale exactly", () => {
		mockController(false);
		const { container } = render(SoundToggle, { props: { size: "md", variant: "outline" } });
		const classes = button(container).className;

		for (const token of [
			"h-9",
			"rounded-md",
			"border",
			"border-border",
			"bg-background",
			"px-2",
			"hover:bg-accent",
			"hover:text-accent-foreground",
		]) {
			expect(classes).toContain(token);
		}
	});

	it("the ghost variant carries no resting border", () => {
		mockController(false);
		const { container } = render(SoundToggle, { props: { variant: "ghost" } });
		expect(button(container).className).not.toContain("border-border");
	});

	it("round-trips the button element through bind:ref", () => {
		mockController(false);
		const { container } = render(Harness);
		flushSync();
		expect(button(container).getAttribute("data-bound-ref")).toBe("yes");
	});
});
