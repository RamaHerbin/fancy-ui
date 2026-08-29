/**
 * Controller unit tests. The engine is mocked here — its real Web Audio
 * behaviour is covered by `engine.test.ts`. This file is about the
 * controller's own contract: lazy hydration, persistence, preference
 * mutation, subscribers, cross-tab sync, and the React store surface layered
 * on top of them.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { SoundEngineState } from "./types.js";

const { engineSpy, createSoundEngineMock } = vi.hoisted(() => {
	const engineSpy = {
		state: "idle" as SoundEngineState,
		lastError: null as string | null,
		voiceCount: 0,
		play: vi.fn(() => true),
		unlock: vi.fn(() => Promise.resolve(true)),
		setMasterVolume: vi.fn(),
		setTheme: vi.fn(),
		dispose: vi.fn(),
	};
	const createSoundEngineMock = vi.fn(() => engineSpy);
	return { engineSpy, createSoundEngineMock };
});

vi.mock("./engine.js", () => ({
	createSoundEngine: createSoundEngineMock,
}));

import {
	getSoundSnapshot,
	getSoundServerSnapshot,
	getSoundStatus,
	hydrateSound,
	parseStoredPreferences,
	resetSoundForTests,
	sound,
	subscribeSound,
} from "./sound.js";
import { DEFAULT_SOUND_PREFERENCES, SOUND_STORAGE_KEY } from "./types.js";

describe("parseStoredPreferences", () => {
	it("returns the defaults for null", () => {
		expect(parseStoredPreferences(null)).toEqual({ ...DEFAULT_SOUND_PREFERENCES });
	});

	it("returns the defaults for malformed JSON", () => {
		expect(parseStoredPreferences("{not json")).toEqual({ ...DEFAULT_SOUND_PREFERENCES });
	});

	it("returns the defaults for a missing/mismatched version", () => {
		expect(
			parseStoredPreferences(JSON.stringify({ enabled: true, volume: 1, theme: "fancy" }))
		).toEqual({
			...DEFAULT_SOUND_PREFERENCES,
		});
		expect(
			parseStoredPreferences(JSON.stringify({ v: 2, enabled: true, volume: 1, theme: "fancy" }))
		).toEqual({ ...DEFAULT_SOUND_PREFERENCES });
	});

	it("clamps volume into [0, 1] and ignores a non-finite volume", () => {
		expect(
			parseStoredPreferences(JSON.stringify({ v: 1, enabled: true, volume: 4, theme: "fancy" }))
				.volume
		).toBe(1);
		expect(
			parseStoredPreferences(JSON.stringify({ v: 1, enabled: true, volume: -4, theme: "fancy" }))
				.volume
		).toBe(0);
		expect(
			parseStoredPreferences(JSON.stringify({ v: 1, enabled: true, volume: "nope", theme: "fancy" }))
				.volume
		).toBe(DEFAULT_SOUND_PREFERENCES.volume);
	});

	it("falls back to the default theme for an unknown theme name", () => {
		expect(
			parseStoredPreferences(JSON.stringify({ v: 1, enabled: true, volume: 0.5, theme: "nope" }))
				.theme
		).toBe(DEFAULT_SOUND_PREFERENCES.theme);
	});

	it("coerces enabled strictly to a boolean", () => {
		expect(
			parseStoredPreferences(JSON.stringify({ v: 1, enabled: "true", volume: 0.5, theme: "fancy" }))
				.enabled
		).toBe(false);
	});
});

function spyOnSetItem() {
	return vi.spyOn(Storage.prototype, "setItem");
}
function spyOnGetItem() {
	return vi.spyOn(Storage.prototype, "getItem");
}

describe("sound controller", () => {
	// jsdom implements `localStorage` as a Proxy, so `vi.spyOn(window.localStorage, …)`
	// installs a spy the proxy never consults — it silently observes nothing.
	// `Storage.prototype` is the seam that actually sees every call.
	let setItemSpy: ReturnType<typeof spyOnSetItem>;
	let getItemSpy: ReturnType<typeof spyOnGetItem>;

	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
		vi.clearAllMocks();
		engineSpy.play.mockReturnValue(true);
		engineSpy.unlock.mockResolvedValue(true);
		setItemSpy = spyOnSetItem();
		getItemSpy = spyOnGetItem();
	});

	afterEach(() => {
		setItemSpy.mockRestore();
		getItemSpy.mockRestore();
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("play() is a no-op while disabled", () => {
		expect(sound.enabled).toBe(false);
		sound.play("press");
		expect(engineSpy.play).not.toHaveBeenCalled();
		expect(sound.status.lastCue).toBeNull();
	});

	it("play() while enabled schedules through the engine and records the last cue", () => {
		sound.setEnabled(true);
		sound.play("press", { volume: 0.5 });
		expect(engineSpy.play).toHaveBeenCalledWith("press", { volume: 0.5 });
		expect(sound.status.lastCue).toBe("press");
		expect(sound.status.lastPlayedAt).not.toBeNull();
	});

	it("play() does not record the cue when the engine reports it dropped it", () => {
		sound.setEnabled(true);
		engineSpy.play.mockReturnValueOnce(false);
		sound.play("hover");
		expect(sound.status.lastCue).toBeNull();
	});

	it("enable() persists {v:1,...}, flips enabled, and fires unlock", async () => {
		sound.enable();
		expect(sound.enabled).toBe(true);
		expect(setItemSpy).toHaveBeenCalledWith(
			SOUND_STORAGE_KEY,
			JSON.stringify({
				v: 1,
				enabled: true,
				volume: DEFAULT_SOUND_PREFERENCES.volume,
				theme: "fancy",
			})
		);
		await Promise.resolve();
		expect(engineSpy.unlock).toHaveBeenCalledTimes(1);
	});

	it("enable() plays nothing itself", () => {
		sound.enable();
		expect(engineSpy.play).not.toHaveBeenCalled();
	});

	it("toggle() flips enabled and returns the new value", () => {
		expect(sound.toggle()).toBe(true);
		expect(sound.enabled).toBe(true);
		expect(sound.toggle()).toBe(false);
		expect(sound.enabled).toBe(false);
	});

	it("setVolume() clamps, mirrors into the engine, and ignores NaN", () => {
		sound.setEnabled(true); // creates the engine via ensureEngine on first play/unlock/enable
		sound.play("press"); // force engine creation
		engineSpy.setMasterVolume.mockClear();

		sound.setVolume(2);
		expect(sound.volume).toBe(1);
		expect(engineSpy.setMasterVolume).toHaveBeenCalledWith(1);

		sound.setVolume(-1);
		expect(sound.volume).toBe(0);

		sound.setVolume(Number.NaN);
		expect(sound.volume).toBe(0); // unchanged by the NaN call
	});

	it("setTheme() ignores unknown theme names", () => {
		sound.setTheme("unknown-theme" as never);
		expect(sound.theme).toBe("fancy");
	});

	it("subscribe() calls run immediately, then on every preference change, and unsubscribes cleanly", () => {
		const run = vi.fn();
		const unsubscribe = sound.subscribe(run);
		expect(run).toHaveBeenCalledTimes(1);
		expect(run).toHaveBeenLastCalledWith(sound.preferences);

		sound.setEnabled(true);
		expect(run).toHaveBeenCalledTimes(2);

		unsubscribe();
		sound.setEnabled(false);
		expect(run).toHaveBeenCalledTimes(2);
	});

	it("a storage event for the sound key applies the new preferences with no write-back", () => {
		void sound.enabled; // hydrate + attach the storage listener
		setItemSpy.mockClear();

		window.dispatchEvent(
			new StorageEvent("storage", {
				key: SOUND_STORAGE_KEY,
				newValue: JSON.stringify({ v: 1, enabled: true, volume: 0.75, theme: "fancy" }),
			})
		);

		expect(sound.enabled).toBe(true);
		expect(sound.volume).toBe(0.75);
		expect(setItemSpy).not.toHaveBeenCalled();
	});

	it("a storage event with key === null resets to the defaults", () => {
		void sound.enabled;
		sound.setEnabled(true);

		window.dispatchEvent(new StorageEvent("storage", { key: null, newValue: null }));

		expect(sound.enabled).toBe(false);
		expect(sound.volume).toBe(DEFAULT_SOUND_PREFERENCES.volume);
	});

	it("ignores a storage event for an unrelated key", () => {
		void sound.enabled;
		sound.setEnabled(true);

		window.dispatchEvent(
			new StorageEvent("storage", { key: "some-other-key", newValue: "whatever" })
		);

		expect(sound.enabled).toBe(true);
	});

	it("setItem throwing still updates in-memory state and reports storage: error", () => {
		setItemSpy.mockImplementation(() => {
			throw new Error("quota exceeded");
		});
		sound.setEnabled(true);
		expect(sound.enabled).toBe(true);
		expect(sound.status.storage).toBe("error");
		expect(sound.status.lastError).toBe("quota exceeded");
	});

	it("getItem throwing on first hydration reports storage: unavailable", () => {
		getItemSpy.mockImplementation(() => {
			throw new Error("blocked");
		});
		expect(sound.enabled).toBe(false);
		expect(sound.status.storage).toBe("unavailable");
	});

	it("getSoundStatus() returns a fresh plain object each call", () => {
		const a = getSoundStatus();
		const b = getSoundStatus();
		expect(a).toEqual(b);
		expect(a).not.toBe(b);
	});

	it("sound.status is a stable getter-backed view, not a fresh spread", () => {
		expect(sound.status).toBe(sound.status);
		sound.setEnabled(true);
		expect(sound.status.enabled).toBe(true);
		expect(JSON.parse(JSON.stringify(sound.status)).enabled).toBe(true);
	});

	// "The first access must not corrupt a reader that is mid-render" is proven by
	// `sound.hydration.test.tsx`: the store never reads storage from a render path,
	// so the server and hydration renders agree by construction.

	it("reports engine: unsupported at hydration when no AudioContext constructor exists", () => {
		const prevStd = Object.getOwnPropertyDescriptor(window, "AudioContext");
		const prevWebkit = Object.getOwnPropertyDescriptor(window, "webkitAudioContext");
		Object.defineProperty(window, "AudioContext", { value: undefined, configurable: true });
		if ("webkitAudioContext" in window)
			delete (window as { webkitAudioContext?: unknown }).webkitAudioContext;
		try {
			expect(sound.status.supported).toBe(false);
			expect(sound.status.engine).toBe("unsupported");
		} finally {
			if (prevStd) Object.defineProperty(window, "AudioContext", prevStd);
			else delete (window as { AudioContext?: unknown }).AudioContext;
			if (prevWebkit) Object.defineProperty(window, "webkitAudioContext", prevWebkit);
		}
	});

	it("toggle() and setEnabled(true) route through enable() and therefore unlock", () => {
		sound.toggle();
		expect(engineSpy.unlock).toHaveBeenCalledTimes(1);
		sound.toggle();
		expect(engineSpy.unlock).toHaveBeenCalledTimes(1);
		sound.setEnabled(true);
		expect(engineSpy.unlock).toHaveBeenCalledTimes(2);
	});

	it("keeps exactly one pending cue while the context is idle/suspended and replays it once unlocked", async () => {
		sound.setEnabled(true);
		vi.clearAllMocks();
		engineSpy.state = "suspended";
		let resolveUnlock!: (ok: boolean) => void;
		engineSpy.unlock.mockImplementation(
			() =>
				new Promise<boolean>((resolve) => {
					resolveUnlock = resolve;
				})
		);
		engineSpy.play.mockReturnValue(false);

		sound.play("press");
		sound.play("select"); // newer pending cue replaces the older one; no burst
		expect(engineSpy.unlock).toHaveBeenCalledTimes(1);
		expect(engineSpy.play).toHaveBeenCalledTimes(2);

		engineSpy.state = "ready";
		engineSpy.play.mockReturnValue(true);
		resolveUnlock(true);
		await Promise.resolve();
		await Promise.resolve();

		expect(engineSpy.play).toHaveBeenCalledTimes(3);
		expect(engineSpy.play).toHaveBeenLastCalledWith("select", undefined);
		expect(sound.status.lastCue).toBe("select");
		engineSpy.state = "idle";
	});

	// A resume() rejected outside a gesture leaves the engine "blocked". The next
	// cue does come from a gesture, so it is retryable — dropping it would cost
	// the user a second click on the same control.
	it("retains and replays a cue dropped while the engine is blocked", async () => {
		sound.setEnabled(true);
		vi.clearAllMocks();
		engineSpy.state = "blocked";
		engineSpy.play.mockReturnValue(false);
		engineSpy.unlock.mockImplementation(() => {
			engineSpy.state = "ready";
			engineSpy.play.mockReturnValue(true);
			return Promise.resolve(true);
		});

		sound.play("press");
		expect(engineSpy.unlock).toHaveBeenCalledTimes(1);
		await Promise.resolve();
		await Promise.resolve();

		expect(engineSpy.play).toHaveBeenCalledTimes(2);
		expect(engineSpy.play).toHaveBeenLastCalledWith("press", undefined);
		expect(sound.status.lastCue).toBe("press");
		engineSpy.state = "idle";
	});

	it("does not retry a cue the engine dropped for any reason other than an idle/suspended/blocked context", () => {
		sound.setEnabled(true);
		vi.clearAllMocks();
		engineSpy.state = "ready";
		engineSpy.play.mockReturnValue(false); // e.g. rate-limited
		sound.play("hover");
		expect(engineSpy.unlock).not.toHaveBeenCalled();
		engineSpy.state = "idle";
	});

	it("a storage event marks storage as ok for a tab that only ever received updates", () => {
		expect(sound.enabled).toBe(false); // hydrate → the cross-tab listener is attached
		window.dispatchEvent(
			new StorageEvent("storage", {
				key: SOUND_STORAGE_KEY,
				newValue: JSON.stringify({ v: 1, enabled: true, volume: 0.2, theme: "fancy" }),
			})
		);
		expect(sound.status.storage).toBe("ok");
		expect(sound.enabled).toBe(true);
	});

	it("an engine transition without an error does not erase the last storage error", () => {
		setItemSpy.mockImplementation(() => {
			throw new Error("QuotaExceededError");
		});
		sound.setVolume(0.3);
		expect(sound.status.lastError).toBe("QuotaExceededError");
		const calls = createSoundEngineMock.mock.calls as unknown as Array<
			[{ onStateChange?: (state: SoundEngineState, error: string | null) => void }]
		>;
		calls.at(-1)?.[0]?.onStateChange?.("ready", null);
		expect(sound.status.lastError).toBe("QuotaExceededError");
	});
});

describe("sound controller — the React store surface", () => {
	beforeEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
		vi.clearAllMocks();
		engineSpy.play.mockReturnValue(true);
		engineSpy.unlock.mockResolvedValue(true);
	});

	afterEach(() => {
		resetSoundForTests();
		window.localStorage.clear();
	});

	it("getSoundSnapshot() keeps one identity until something actually changes", () => {
		const first = getSoundSnapshot();
		expect(getSoundSnapshot()).toBe(first);
		expect(getSoundSnapshot()).toBe(first);

		sound.setEnabled(true);

		const second = getSoundSnapshot();
		expect(second).not.toBe(first);
		expect(second.enabled).toBe(true);
		expect(getSoundSnapshot()).toBe(second);
	});

	it("getSoundServerSnapshot() is the frozen defaults, stable across calls", () => {
		const server = getSoundServerSnapshot();
		expect(server).toBe(getSoundServerSnapshot());
		expect(Object.isFrozen(server)).toBe(true);
		expect(server.enabled).toBe(DEFAULT_SOUND_PREFERENCES.enabled);
		expect(server.volume).toBe(DEFAULT_SOUND_PREFERENCES.volume);
		expect(server.theme).toBe(DEFAULT_SOUND_PREFERENCES.theme);
		expect(server.status.storage).toBe("untouched");
		expect(server.status.supported).toBe(false);
	});

	it("getSoundSnapshot() never reads storage, and matches the server snapshot before hydration", () => {
		const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
		try {
			const snapshot = getSoundSnapshot();
			expect(getItemSpy).not.toHaveBeenCalled();
			expect(snapshot.enabled).toBe(getSoundServerSnapshot().enabled);
			expect(snapshot.volume).toBe(getSoundServerSnapshot().volume);
			expect(snapshot.theme).toBe(getSoundServerSnapshot().theme);
		} finally {
			getItemSpy.mockRestore();
		}
	});

	it("hydrateSound() reads storage exactly once and wakes every store listener", () => {
		window.localStorage.setItem(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: true, volume: 0.25, theme: "fancy" })
		);
		const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
		const listener = vi.fn();
		const unsubscribe = subscribeSound(listener);
		try {
			expect(getSoundSnapshot().enabled).toBe(false);

			hydrateSound();
			expect(getItemSpy).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledTimes(1);
			expect(getSoundSnapshot().enabled).toBe(true);
			expect(getSoundSnapshot().volume).toBe(0.25);

			hydrateSound();
			expect(getItemSpy).toHaveBeenCalledTimes(1);
			expect(listener).toHaveBeenCalledTimes(1);
		} finally {
			unsubscribe();
			getItemSpy.mockRestore();
		}
	});

	it("unsubscribing stops the listener without disturbing the others", () => {
		const a = vi.fn();
		const b = vi.fn();
		const unsubscribeA = subscribeSound(a);
		const unsubscribeB = subscribeSound(b);
		try {
			sound.setEnabled(true);
			expect(a).toHaveBeenCalled();
			expect(b).toHaveBeenCalled();

			const seenByB = b.mock.calls.length;
			unsubscribeA();
			a.mockClear();
			sound.setEnabled(false);

			expect(a).not.toHaveBeenCalled();
			expect(b.mock.calls.length).toBeGreaterThan(seenByB);
		} finally {
			unsubscribeA();
			unsubscribeB();
		}
	});

	it("a status-only change wakes store listeners but never the preference subscribers", () => {
		sound.setEnabled(true);
		const storeListener = vi.fn();
		const preferenceSubscriber = vi.fn();
		const unsubscribeStore = subscribeSound(storeListener);
		const unsubscribePrefs = sound.subscribe(preferenceSubscriber);
		preferenceSubscriber.mockClear();
		try {
			sound.play("press"); // markPlayed: status moves, preferences do not

			expect(storeListener).toHaveBeenCalled();
			expect(preferenceSubscriber).not.toHaveBeenCalled();
			expect(getSoundSnapshot().status.lastCue).toBe("press");
		} finally {
			unsubscribeStore();
			unsubscribePrefs();
		}
	});

	it("keeps the status object identity between mutations, so a status reader can bail out", () => {
		const first = getSoundSnapshot().status;
		expect(getSoundSnapshot().status).toBe(first);

		sound.setVolume(0.3);

		expect(getSoundSnapshot().status).not.toBe(first);
		expect(getSoundSnapshot().status.volume).toBe(0.3);
	});
});

describe("sound controller — lazy hydration at the module boundary", () => {
	afterEach(() => {
		vi.resetModules();
	});

	it("does not read localStorage on import; the first property access reads it exactly once", async () => {
		const getItemSpy = vi.spyOn(Storage.prototype, "getItem");
		getItemSpy.mockClear();

		vi.resetModules();
		const mod = await import("./sound.js");

		expect(getItemSpy).not.toHaveBeenCalled();

		void mod.sound.enabled;
		expect(getItemSpy).toHaveBeenCalledTimes(1);

		void mod.sound.enabled;
		void mod.sound.volume;
		expect(getItemSpy).toHaveBeenCalledTimes(1);

		getItemSpy.mockRestore();
	});
});
