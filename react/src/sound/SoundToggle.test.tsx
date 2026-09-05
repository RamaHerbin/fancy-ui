/**
 * Transposed from `SoundToggle.test.ts` on the Svelte side, assertion for
 * assertion. Two Svelte-only mechanics are gone: the `SoundToggleHarness`
 * component (React declares a ref inline) and the `$derived`/`flushSync`
 * plumbing.
 *
 * The controller mock also had to change shape. The Svelte component read
 * `sound.enabled` / `sound.status` directly, so the suite spied their getters;
 * the React component reads the store through `useSoundEnabled()` /
 * `useSoundStatus()`, which never touch those getters. So the rendered state is
 * driven through the real store — a seeded `localStorage` entry for "on", and
 * the presence or absence of an `AudioContext` constructor for engine support —
 * while `toggle` / `unlock` / `play` stay spied exactly as before.
 */
import { cleanup, fireEvent, render } from "@testing-library/react";
import { Profiler, act, createRef } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SoundToggle } from "./SoundToggle.js";
import { getSoundStatus, resetSoundForTests, sound } from "./sound.js";
import { SOUND_STORAGE_KEY } from "./types.js";
import { installFakeAudioContext } from "./web-audio-mock.js";

function button(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button") as HTMLButtonElement;
}

let audio: { restore(): void };

/** Makes the engine probe report "unsupported" on the next hydration. */
function withoutWebAudio(): void {
	audio.restore();
	audio = { restore() {} };
}

// A small self-consistent model of the controller: the rendered preference
// comes from the real store (seeded before the first render, which is when
// hydration runs), and the three imperative entry points the toggle calls are
// spied. This suite proves SoundToggle's own contract, not the controller's.
function mockController(initialEnabled = false) {
	if (initialEnabled) {
		window.localStorage.setItem(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.5, theme: "fancy" })
		);
	}
	let enabled = initialEnabled;
	const toggle = vi.spyOn(sound, "toggle").mockImplementation(() => {
		enabled = !enabled;
		return enabled;
	});
	const unlock = vi.spyOn(sound, "unlock").mockResolvedValue(false);
	const play = vi.spyOn(sound, "play").mockImplementation(() => {});
	return { toggle, unlock, play };
}

describe("SoundToggle", () => {
	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
		audio = installFakeAudioContext(window as unknown as Record<string, unknown>);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		audio.restore();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("renders a real switch button with a constant accessible name", () => {
		mockController(false);
		const { container } = render(<SoundToggle />);
		const el = button(container);

		expect(el.tagName).toBe("BUTTON");
		expect(el.getAttribute("type")).toBe("button");
		expect(el.getAttribute("role")).toBe("switch");
		expect(el.getAttribute("aria-label")).toBe("Sound");
	});

	it("reflects an initial 'off' controller state through aria-checked and data-state", () => {
		mockController(false);
		const { container } = render(<SoundToggle />);
		const el = button(container);

		expect(el.getAttribute("aria-checked")).toBe("false");
		expect(el.getAttribute("data-state")).toBe("off");
	});

	it("reflects an initial 'on' controller state through aria-checked and data-state", () => {
		mockController(true);
		const { container } = render(<SoundToggle />);
		const el = button(container);

		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(el.getAttribute("data-state")).toBe("on");
	});

	it("keeps the accessible name identical regardless of state — the state is carried by aria-checked alone", () => {
		mockController(true);
		const { container } = render(<SoundToggle label="Sound" />);
		expect(button(container).getAttribute("aria-label")).toBe("Sound");
	});

	it("toggles the preference on click and reports the new value through onEnabledChange", () => {
		const ctl = mockController(false);
		const onEnabledChange = vi.fn();
		const { container } = render(<SoundToggle onEnabledChange={onEnabledChange} />);
		const el = button(container);

		fireEvent.click(el);

		expect(ctl.toggle).toHaveBeenCalledTimes(1);
		expect(onEnabledChange).toHaveBeenCalledTimes(1);
		expect(onEnabledChange).toHaveBeenCalledWith(true);
	});

	it("toggles via Space, the same way a real browser's default action would (jsdom does not synthesize it)", () => {
		const ctl = mockController(false);
		const onEnabledChange = vi.fn();
		const { container } = render(<SoundToggle onEnabledChange={onEnabledChange} />);
		const el = button(container);
		el.focus();

		fireEvent.keyDown(el, { key: " " });
		fireEvent.click(el);

		expect(ctl.toggle).toHaveBeenCalledTimes(1);
		expect(onEnabledChange).toHaveBeenCalledWith(true);
	});

	it("plays the toggle-on confirmation only after unlock resolves true, and only when turning sound on", async () => {
		const ctl = mockController(false);
		ctl.unlock.mockResolvedValue(true);
		const { container } = render(<SoundToggle />);

		fireEvent.click(button(container));
		await Promise.resolve();
		await Promise.resolve();

		expect(ctl.unlock).toHaveBeenCalledTimes(1);
		expect(ctl.play).toHaveBeenCalledTimes(1);
		expect(ctl.play).toHaveBeenCalledWith("toggle-on");
	});

	it("never plays a cue when unlock resolves false", async () => {
		const ctl = mockController(false);
		ctl.unlock.mockResolvedValue(false);
		const { container } = render(<SoundToggle />);

		fireEvent.click(button(container));
		await Promise.resolve();
		await Promise.resolve();

		expect(ctl.unlock).toHaveBeenCalledTimes(1);
		expect(ctl.play).not.toHaveBeenCalled();
	});

	it("never calls unlock or play when the click turns sound off", () => {
		const ctl = mockController(true);
		const { container } = render(<SoundToggle />);

		fireEvent.click(button(container));

		expect(ctl.toggle).toHaveBeenCalledTimes(1);
		expect(ctl.unlock).not.toHaveBeenCalled();
		expect(ctl.play).not.toHaveBeenCalled();
	});

	it("plays nothing and calls nothing while disabled", () => {
		const ctl = mockController(false);
		const onEnabledChange = vi.fn();
		const { container } = render(<SoundToggle disabled onEnabledChange={onEnabledChange} />);
		const el = button(container);

		expect(el.disabled).toBe(true);
		fireEvent.click(el);

		expect(ctl.toggle).not.toHaveBeenCalled();
		expect(onEnabledChange).not.toHaveBeenCalled();
	});

	it("forces disabled when the engine reports unsupported and sound is off, even without the disabled prop", () => {
		mockController(false);
		withoutWebAudio();
		const { container } = render(<SoundToggle />);

		expect(button(container).disabled).toBe(true);
		expect(button(container).title).toMatch(/no Web Audio/);
	});

	it("never disables a switch that is currently on, even when unsupported — a stored preference must stay undoable", () => {
		const ctl = mockController(true);
		withoutWebAudio();
		const { container } = render(<SoundToggle />);

		expect(button(container).disabled).toBe(false);
		fireEvent.click(button(container));
		expect(ctl.toggle).toHaveBeenCalledTimes(1);
	});

	it("renders against the real controller", () => {
		const { container } = render(<SoundToggle />);
		expect(button(container).getAttribute("aria-checked")).toBe("false");
		expect(button(container).getAttribute("role")).toBe("switch");
	});

	it("keeps tracking the real controller after being its very first reader (the header case)", () => {
		// The engine's own gesture-bound unlock is out of scope here; stubbing it
		// keeps `enable()` to the preference write the assertion is about.
		vi.spyOn(sound, "unlock").mockResolvedValue(false);
		const { container } = render(<SoundToggle />);
		expect(button(container).getAttribute("aria-checked")).toBe("false");

		act(() => {
			sound.enable();
		});
		expect(button(container).getAttribute("aria-checked")).toBe("true");

		act(() => {
			sound.disable();
		});
		expect(button(container).getAttribute("aria-checked")).toBe("false");
	});

	it("stays enabled when supported and the disabled prop is left at its default", () => {
		mockController(false);
		const { container } = render(<SoundToggle />);
		expect(button(container).disabled).toBe(false);
	});

	it("keeps both glyph states in the DOM at all times, switching only which one is styled active via data-state", () => {
		mockController(true);
		const { container } = render(<SoundToggle />);
		const svg = container.querySelector("svg") as SVGElement;

		expect(svg.querySelector(".ft-sound-toggle-glyph-on")).not.toBeNull();
		expect(svg.querySelector(".ft-sound-toggle-glyph-off")).not.toBeNull();
		expect(button(container).getAttribute("data-state")).toBe("on");
	});

	it("hides the label and state words from the accessible tree when showLabel is set", () => {
		mockController(false);
		const { container } = render(<SoundToggle showLabel label="Sound" labelOff="Off" />);
		const spans = container.querySelectorAll("button > span");

		expect(spans.length).toBe(2);
		spans.forEach((span) => expect(span.getAttribute("aria-hidden")).toBe("true"));
		expect(spans[0]?.textContent).toBe("Sound");
		expect(spans[1]?.textContent).toBe("Off");
	});

	it("renders no visible label words when showLabel is left at its default", () => {
		mockController(false);
		const { container } = render(<SoundToggle />);
		expect(container.querySelectorAll("button > span").length).toBe(0);
	});

	it("carries data-sound-toggle, data-size and data-variant as stable hooks", () => {
		mockController(false);
		const { container } = render(<SoundToggle size="lg" variant="ghost" />);
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
		const { container } = render(<SoundToggle size={size} />);
		expect(button(container).className).toContain(heightClass);
	});

	it("the outline md variant matches the docs header trigger scale exactly", () => {
		mockController(false);
		const { container } = render(<SoundToggle size="md" variant="outline" />);
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
		const { container } = render(<SoundToggle variant="ghost" />);
		expect(button(container).className).not.toContain("border-border");
	});

	it("round-trips the button element through the forwarded ref", () => {
		mockController(false);
		const ref = createRef<HTMLButtonElement>();
		const { container } = render(<SoundToggle ref={ref} />);

		expect(ref.current).toBe(button(container));
	});

	// No controller mock here: the toggle reads the real store, and a real cue
	// has to reach `markPlayed()` for the assertion to mean anything.
	it("does not re-render when a cue is played elsewhere on the page", async () => {
		let commits = 0;
		render(
			<Profiler
				id="sound-toggle"
				onRender={() => {
					commits += 1;
				}}
			>
				<SoundToggle />
			</Profiler>
		);

		await act(async () => {
			sound.enable();
			await sound.unlock();
		});
		const initial = commits;

		act(() => {
			sound.play("press");
		});

		// The cue landed, so `status.lastCue`/`lastPlayedAt` moved — and the
		// toggle, which renders neither, stayed put.
		expect(getSoundStatus().lastCue).toBe("press");
		expect(commits).toBe(initial);
	});
});
