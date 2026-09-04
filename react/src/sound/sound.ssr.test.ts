// @vitest-environment node
/**
 * Server-side safety net for the sound controller, its React bindings and the
 * feedback module.
 *
 * Runs in the `node` environment, so there is no `window`, no `document` and
 * no `localStorage`. Everything here proves the same single promise from a
 * different angle: importing or calling the sound modules on a server must be
 * inert — no throw, no allocation, no audio, no storage.
 *
 * The imports are dynamic and preceded by `vi.resetModules()` so the module
 * graph is evaluated *inside* the test run, with the node globals in place;
 * a static import would be hoisted and evaluated before any assertion could
 * observe it.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { beforeAll, describe, expect, it, vi } from "vitest";

type SoundModules = {
	barrel: typeof import("./index.js");
	controller: typeof import("./sound.js");
	engine: typeof import("./engine.js");
	feedback: typeof import("./sound-feedback.js");
	hooks: typeof import("./use-sound.js");
	themes: typeof import("./themes.js");
	types: typeof import("./types.js");
	SoundToggle: typeof import("./SoundToggle.js").SoundToggle;
};

let mods: SoundModules;
let importError: unknown = null;

beforeAll(async () => {
	vi.resetModules();
	try {
		const [barrel, controller, engine, feedback, hooks, themes, types, toggle] = await Promise.all([
			import("./index.js"),
			import("./sound.js"),
			import("./engine.js"),
			import("./sound-feedback.js"),
			import("./use-sound.js"),
			import("./themes.js"),
			import("./types.js"),
			import("./SoundToggle.js"),
		]);
		mods = {
			barrel,
			controller,
			engine,
			feedback,
			hooks,
			themes,
			types,
			SoundToggle: toggle.SoundToggle,
		};
	} catch (error) {
		importError = error;
	}
});

describe("sound — server environment", () => {
	it("really is a DOM-less environment", () => {
		expect(typeof window).toBe("undefined");
		expect(typeof document).toBe("undefined");
		expect(typeof localStorage).toBe("undefined");
	});

	it("imports every module without throwing", () => {
		expect(importError).toBeNull();
		expect(mods.barrel).toBeTruthy();
		expect(mods.engine.createSoundEngine).toBeTypeOf("function");
		expect(mods.controller.sound).toBeTruthy();
		expect(mods.feedback.attachSoundFeedback).toBeTypeOf("function");
		expect(mods.hooks.useSound).toBeTypeOf("function");
		expect(mods.themes.FANCY_SOUND_THEME).toBeTruthy();
	});

	it("exposes the same controller through the barrel and the module", () => {
		expect(mods.barrel.sound).toBe(mods.controller.sound);
	});

	it("reports sound as disabled without touching storage", () => {
		expect(mods.controller.sound.enabled).toBe(false);
		expect(mods.controller.sound.volume).toBe(0.5);
		expect(mods.controller.sound.theme).toBe("fancy");
	});

	it("play() is a silent no-op that returns undefined", () => {
		let result: unknown = "not called";
		expect(() => {
			result = mods.controller.sound.play("press");
		}).not.toThrow();
		expect(result).toBeUndefined();
	});

	it("play() stays silent for every cue", () => {
		for (const cue of mods.types.SOUND_CUES) {
			expect(() => mods.controller.sound.play(cue)).not.toThrow();
		}
		expect(mods.controller.getSoundStatus().lastCue).toBeNull();
		expect(mods.controller.getSoundStatus().lastPlayedAt).toBeNull();
	});

	it("unlock() resolves false and never rejects", async () => {
		await expect(mods.controller.sound.unlock()).resolves.toBe(false);
	});

	it("getSoundStatus() reports unsupported and untouched storage", () => {
		const status = mods.controller.getSoundStatus();
		expect(status.supported).toBe(false);
		expect(status.storage).toBe("untouched");
		expect(status.enabled).toBe(false);
		// A fresh plain object every call — safe to spread or JSON-serialise.
		expect(status).not.toBe(mods.controller.getSoundStatus());
		expect(() => JSON.stringify(status)).not.toThrow();
	});

	it("preference mutations stay in memory and never reach storage", () => {
		expect(() => mods.controller.sound.enable()).not.toThrow();
		expect(() => mods.controller.sound.setVolume(0.9)).not.toThrow();
		expect(() => mods.controller.sound.setTheme("fancy")).not.toThrow();
		expect(() => mods.controller.sound.disable()).not.toThrow();
		expect(mods.controller.getSoundStatus().storage).toBe("untouched");
		mods.controller.resetSoundForTests();
		expect(mods.controller.sound.enabled).toBe(false);
	});

	it("a bare engine reports failure instead of constructing anything", () => {
		const engine = mods.engine.createSoundEngine();
		expect(engine.play("press")).toBe(false);
		expect(engine.voiceCount).toBe(0);
		expect(["idle", "unsupported"]).toContain(engine.state);
		expect(() => engine.dispose()).not.toThrow();
	});

	it("the engine's unlock() resolves false on the server", async () => {
		await expect(mods.engine.createSoundEngine().unlock()).resolves.toBe(false);
	});

	it("themes are inert data that validate on the server", () => {
		expect(mods.themes.validateSoundTheme(mods.themes.FANCY_SOUND_THEME)).toEqual([]);
		expect(mods.themes.getSoundTheme("fancy")).toBe(mods.themes.FANCY_SOUND_THEME);
	});

	it("hydrateSound() is inert with no window", () => {
		expect(() => mods.controller.hydrateSound()).not.toThrow();
		expect(mods.controller.getSoundStatus().storage).toBe("untouched");
		mods.controller.resetSoundForTests();
	});

	it("the server snapshot is the frozen defaults", () => {
		const server = mods.controller.getSoundServerSnapshot();
		expect(server).toBe(mods.controller.getSoundServerSnapshot());
		expect(Object.isFrozen(server)).toBe(true);
		expect(server).toEqual({
			enabled: false,
			volume: 0.5,
			theme: "fancy",
			status: {
				supported: false,
				enabled: false,
				volume: 0.5,
				theme: "fancy",
				engine: "idle",
				storage: "untouched",
				lastCue: null,
				lastPlayedAt: null,
				lastError: null,
			},
		});
	});

	it("attachSoundFeedback returns an inert handle with no document", () => {
		// The Svelte action returns a bare `{}` here; the typed React handle is
		// two no-ops. Neither binds a listener.
		const handle = mods.feedback.attachSoundFeedback({} as HTMLElement);
		expect(() => handle.update()).not.toThrow();
		expect(() => handle.destroy()).not.toThrow();
		expect(mods.feedback.__soundFeedbackHoverInstances()).toBe(0);
	});

	it("renders the store hooks to markup with the default preferences", () => {
		function Probe() {
			const { enabled, volume, theme, status } = mods.hooks.useSound();
			return createElement("span", {
				"data-enabled": String(enabled),
				"data-volume": String(volume),
				"data-theme": theme,
				"data-storage": status.storage,
				"data-engine": status.engine,
			});
		}

		const html = renderToString(createElement(Probe));

		expect(html).toContain('data-enabled="false"');
		expect(html).toContain('data-volume="0.5"');
		expect(html).toContain('data-theme="fancy"');
		expect(html).toContain('data-storage="untouched"');
		expect(html).toContain('data-engine="idle"');
	});

	it("useSoundEnabled and useSoundStatus render the server snapshot too", () => {
		function Probe() {
			const enabled = mods.hooks.useSoundEnabled();
			const status = mods.hooks.useSoundStatus();
			return createElement("span", {
				"data-enabled": String(enabled),
				"data-supported": String(status.supported),
			});
		}

		const html = renderToString(createElement(Probe));

		expect(html).toContain('data-enabled="false"');
		expect(html).toContain('data-supported="false"');
	});

	it("useSoundCue renders and stays silent when invoked on the server", () => {
		let cuePlayer: ((cue: "press") => void) | null = null;
		function Probe() {
			cuePlayer = mods.hooks.useSoundCue(true);
			return createElement("span");
		}

		expect(() => renderToString(createElement(Probe))).not.toThrow();
		expect(cuePlayer).toBeTypeOf("function");
		expect(() => (cuePlayer as unknown as (cue: "press") => void)("press")).not.toThrow();
		expect(mods.controller.getSoundStatus().lastCue).toBeNull();
	});

	it("renders SoundToggle to markup with role=switch and aria-checked=false", () => {
		const body = renderToString(createElement(mods.SoundToggle));
		expect(body).toContain('role="switch"');
		expect(body).toContain('aria-checked="false"');
		expect(body).toContain("data-sound-toggle");
		// The SSR pass must never assume the stored (enabled) state.
		expect(body).not.toContain('aria-checked="true"');
		expect(body).toContain('data-state="off"');
		// Both glyph groups ship in the server markup: which one shows is a pure
		// CSS decision keyed off data-state, so hydration never changes the DOM
		// shape when the client learns a stored "on".
		expect(body).toContain("ft-sound-toggle-glyph-on");
		expect(body).toContain("ft-sound-toggle-glyph-off");
	});

	it("renders SoundToggle with a constant accessible name", () => {
		expect(renderToString(createElement(mods.SoundToggle))).toContain('aria-label="Sound"');
		expect(renderToString(createElement(mods.SoundToggle, { label: "Audio" }))).toContain(
			'aria-label="Audio"'
		);
	});
});
