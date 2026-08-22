/**
 * Import-time silence.
 *
 * The whole sound family may be imported — by the package barrel, by a docs
 * page, by a consumer's `+layout.svelte` — without constructing an
 * AudioContext, without reading or writing `localStorage`, and without
 * attaching a single window listener. Preferences hydrate lazily, on the
 * first getter or method call, and exactly once.
 *
 * Every spy here is installed BEFORE `vi.resetModules()` + the dynamic
 * import, which is the only ordering that can observe module-evaluation
 * side effects.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installFakeAudioContext } from "./web-audio-mock.js";
import { SOUND_STORAGE_KEY } from "./types.js";

let audio: ReturnType<typeof installFakeAudioContext>;
let getItem: ReturnType<typeof vi.spyOn>;
let setItem: ReturnType<typeof vi.spyOn>;
let removeItem: ReturnType<typeof vi.spyOn>;
let addListener: ReturnType<typeof vi.spyOn>;

/** Every localStorage entry point the controller could reach for. */
function storageCalls(): number {
	return getItem.mock.calls.length + setItem.mock.calls.length + removeItem.mock.calls.length;
}

beforeEach(() => {
	window.localStorage.clear();
	audio = installFakeAudioContext();
	// jsdom implements `localStorage` as a Proxy, so `vi.spyOn(localStorage, …)`
	// installs a spy the proxy never consults — it silently records nothing.
	// The prototype is the only seam that actually observes the calls.
	getItem = vi.spyOn(Storage.prototype, "getItem");
	setItem = vi.spyOn(Storage.prototype, "setItem");
	removeItem = vi.spyOn(Storage.prototype, "removeItem");
	addListener = vi.spyOn(window, "addEventListener");
	vi.resetModules();
});

afterEach(() => {
	audio.restore();
	vi.restoreAllMocks();
	window.localStorage.clear();
});

describe("sound barrel — module evaluation is inert", () => {
	it("importing ./index.js constructs no AudioContext and touches no storage", async () => {
		const barrel = await import("./index.js");
		expect(barrel.sound).toBeTruthy();
		expect(audio.instances.length).toBe(0);
		expect(getItem).not.toHaveBeenCalled();
		expect(setItem).not.toHaveBeenCalled();
		expect(removeItem).not.toHaveBeenCalled();
		expect(addListener).not.toHaveBeenCalled();
	});

	it("importing each module directly is equally inert", async () => {
		await Promise.all([
			import("./engine.js"),
			import("./themes.js"),
			import("./types.js"),
			import("./sound.svelte.js"),
			import("./sound-feedback.js"),
			import("./SoundToggle.svelte"),
		]);
		expect(audio.instances.length).toBe(0);
		expect(storageCalls()).toBe(0);
		expect(addListener).not.toHaveBeenCalled();
	});

	it("createSoundEngine() allocates nothing until it is asked to play", async () => {
		const { createSoundEngine } = await import("./engine.js");
		const engine = createSoundEngine();
		expect(audio.instances.length).toBe(0);
		expect(engine.voiceCount).toBe(0);
		expect(engine.state).toBe("idle");
	});

	it("the theme data is available with no side effect at all", async () => {
		const { FANCY_SOUND_THEME, SOUND_CUES } = await import("./index.js");
		expect(Object.keys(FANCY_SOUND_THEME.cues).sort()).toEqual([...SOUND_CUES].sort());
		expect(audio.instances.length).toBe(0);
		expect(storageCalls()).toBe(0);
	});
});

describe("sound barrel — lazy hydration", () => {
	it("the first preference read performs exactly one getItem and no construction", async () => {
		const { sound } = await import("./index.js");
		expect(storageCalls()).toBe(0);

		expect(sound.enabled).toBe(false);

		expect(getItem).toHaveBeenCalledTimes(1);
		expect(getItem).toHaveBeenCalledWith(SOUND_STORAGE_KEY);
		expect(setItem).not.toHaveBeenCalled();
		expect(audio.instances.length).toBe(0);
	});

	it("subsequent reads never hit storage again", async () => {
		const { sound, getSoundStatus } = await import("./index.js");
		void sound.enabled;
		expect(getItem).toHaveBeenCalledTimes(1);

		void sound.enabled;
		void sound.volume;
		void sound.theme;
		void sound.preferences;
		void sound.status;
		void getSoundStatus();

		expect(getItem).toHaveBeenCalledTimes(1);
		expect(audio.instances.length).toBe(0);
	});

	it("hydration adopts a stored preference on that first read", async () => {
		window.localStorage.setItem(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.25, theme: "fancy" })
		);
		setItem.mockClear();

		const { sound } = await import("./index.js");
		expect(sound.enabled).toBe(true);
		expect(sound.volume).toBe(0.25);
		expect(getItem).toHaveBeenCalledTimes(1);
		// Reading a preference must never write one back.
		expect(setItem).not.toHaveBeenCalled();
		expect(audio.instances.length).toBe(0);
	});

	it("probes Web Audio support without constructing a context", async () => {
		const { sound } = await import("./index.js");
		expect(sound.status.supported).toBe(true);
		expect(audio.instances.length).toBe(0);
	});
});

describe("sound barrel — first real playback", () => {
	// jsdom's navigator has no `userActivation`, so the engine's default
	// `canCreateContext` (`navigator.userActivation?.isActive ?? true`) reports
	// TRUE here: this environment behaves like a browser that never blocks
	// context creation. The contract's gesture gate is therefore exercised
	// explicitly in engine.test.ts / sound.integration.test.ts with an injected
	// `canCreateContext`, and what this file pins down is the ceiling: at most
	// ONE context is ever constructed, and only after an explicit call.
	it("jsdom reports no userActivation, so the default gate is permissive", () => {
		expect("userActivation" in navigator).toBe(false);
	});

	it("enable() persists once and constructs exactly one context (the permissive jsdom gate)", async () => {
		const { sound } = await import("./index.js");
		void sound.enabled;
		getItem.mockClear();

		expect(() => sound.enable()).not.toThrow();

		expect(sound.enabled).toBe(true);
		expect(setItem).toHaveBeenCalledTimes(1);
		expect(setItem).toHaveBeenCalledWith(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.5, theme: "fancy" })
		);
		await sound.unlock();
		expect(audio.instances.length).toBe(1);
	});

	it("repeated play() reuses the single context and never throws", async () => {
		const { sound } = await import("./index.js");
		sound.enable();
		for (let i = 0; i < 20; i++) {
			expect(() => sound.play("press")).not.toThrow();
			expect(() => sound.play("hover")).not.toThrow();
		}
		await sound.unlock();
		expect(audio.instances.length).toBe(1);
	});

	it("play() while disabled constructs nothing", async () => {
		const { sound } = await import("./index.js");
		void sound.enabled;
		expect(sound.enabled).toBe(false);
		for (let i = 0; i < 10; i++) sound.play("press");
		expect(audio.instances.length).toBe(0);
		expect(sound.status.lastCue).toBeNull();
	});
});
