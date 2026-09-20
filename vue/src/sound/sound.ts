/**
 * Sound controller — the module-level singleton that owns the user's sound
 * preference, persists it, and drives the engine. It is a singleton because
 * `sound.play()` must be callable from anywhere, including code that never
 * runs inside a component.
 *
 * Invariants:
 * - ZERO browser-global access at module evaluation. Preferences hydrate on
 *   the first IMPERATIVE entry point — any controller METHOD, or the explicit
 *   `hydrateSound()` called from `onMounted` — never on import, never from a
 *   render path.
 * - `play()` is a no-op unless in the browser AND enabled AND the engine can
 *   schedule. It never throws.
 * - `enable()` never plays a cue itself; the confirmation cue lives in
 *   SoundToggle (inside the user's click).
 * - A cue that arrives while the AudioContext is still idle or suspended is
 *   not lost: exactly ONE pending cue is kept, the context is unlocked inside
 *   the same gesture, and that cue is replayed once the context runs. Bursts
 *   are never queued.
 * - `sound` is a plain object literal so tests can `vi.spyOn(sound, "play")`.
 *
 * Binding: a module-scope singleton over `reactive()` state, with no provider
 * and no plugin. The `sound` prop is an ordinary boolean on seven components
 * and must work with zero setup; the state is genuinely global (one storage
 * key, one cross-tab listener, one AudioContext); and `sound.play()` must be
 * callable from outside any component.
 *
 * THE ONE DESIGN EDIT vs the Svelte source: its `ensure()` runs from every
 * getter, wrapped in `untrack` because that first read can happen inside a
 * `$derived`. Here a getter never writes — a write to reactive state inside a
 * `computed` re-invalidates that computed, and production hydration does not
 * patch a mismatched attribute anyway, so a value learned during the hydration
 * render would ship the server's value regardless. Storage is read by
 * `hydrateSound()`, from `onMounted`, and the server render, the hydration
 * render and the first client render all see the frozen defaults.
 */

import { reactive } from "vue";
import { createSoundEngine, type SoundEngine } from "./engine.js";
import { getSoundTheme } from "./themes.js";
import {
	DEFAULT_SOUND_PREFERENCES,
	SOUND_STORAGE_KEY,
	SOUND_THEME_NAMES,
	type SoundCue,
	type SoundPlayOptions,
	type SoundPreferences,
	type SoundStatus,
	type SoundThemeName,
} from "./types.js";

export interface SoundController {
	// --- reactive (getters over the module's reactive state) ---
	readonly enabled: boolean;
	readonly volume: number;
	readonly theme: SoundThemeName;
	/** Plain snapshot object (new object per change), safe to spread/JSON. */
	readonly preferences: SoundPreferences;
	/** Reactive status; `getSoundStatus()` returns the same data non-reactively. */
	readonly status: SoundStatus;

	// --- playback ---
	/** No-op (returns void, never throws) unless in browser AND enabled AND engine can schedule. */
	play(cue: SoundCue, options?: SoundPlayOptions): void;
	/** Creates/resumes the AudioContext inside the current gesture. Resolves engine-running. */
	unlock(): Promise<boolean>;

	// --- preferences (each persists, notifies subscribers, mirrors into the engine) ---
	/** Also calls unlock() fire-and-forget — the enabling click IS the gesture. Plays nothing. */
	enable(): void;
	disable(): void;
	/** Returns the new `enabled`. */
	toggle(): boolean;
	setEnabled(enabled: boolean): void;
	/** Clamped [0,1]; NaN ignored. */
	setVolume(volume: number): void;
	/** Unknown names ignored. */
	setTheme(theme: SoundThemeName): void;

	/** Store contract, unchanged: calls `run` immediately, then on every preference change. */
	subscribe(run: (prefs: SoundPreferences) => void): () => void;
}

function createInitialStatus(): SoundStatus {
	return {
		supported: false,
		enabled: false,
		volume: DEFAULT_SOUND_PREFERENCES.volume,
		theme: DEFAULT_SOUND_PREFERENCES.theme,
		engine: "idle",
		storage: "untouched",
		lastCue: null,
		lastPlayedAt: null,
		lastError: null,
	};
}

const prefs = reactive<SoundPreferences>({ ...DEFAULT_SOUND_PREFERENCES });
const status = reactive<SoundStatus>(createInitialStatus());
let hydrated = false;
let storageListenerAttached = false;
let engine: SoundEngine | null = null;
let pending: { cue: SoundCue; options?: SoundPlayOptions } | null = null;
let unlocking = false;
const subscribers = new Set<(prefs: SoundPreferences) => void>();

/** Pure parser for the stored JSON. Never throws. Exported for tests. */
export function parseStoredPreferences(raw: string | null): SoundPreferences {
	if (raw == null) return { ...DEFAULT_SOUND_PREFERENCES };
	try {
		const data = JSON.parse(raw) as Partial<Record<string, unknown>> | null;
		if (!data || typeof data !== "object" || data.v !== 1) return { ...DEFAULT_SOUND_PREFERENCES };
		const volume =
			typeof data.volume === "number" && Number.isFinite(data.volume)
				? Math.min(1, Math.max(0, data.volume))
				: DEFAULT_SOUND_PREFERENCES.volume;
		const theme = (SOUND_THEME_NAMES as readonly string[]).includes(data.theme as string)
			? (data.theme as SoundThemeName)
			: DEFAULT_SOUND_PREFERENCES.theme;
		return { enabled: data.enabled === true, volume, theme };
	} catch {
		return { ...DEFAULT_SOUND_PREFERENCES };
	}
}

/**
 * Writes preferences field by field, never `prefs = …`. The reactive proxy
 * created at module evaluation is the one every reader tracks; a replacement
 * proxy would be a different object, and every existing reader would still be
 * tracking the old one — they would render once and never update again.
 */
function assignPrefs(next: SoundPreferences): void {
	prefs.enabled = next.enabled;
	prefs.volume = next.volume;
	prefs.theme = next.theme;
}

function snapshot(): SoundPreferences {
	return { enabled: prefs.enabled, volume: prefs.volume, theme: prefs.theme };
}

function notify(): void {
	const next = snapshot();
	for (const run of subscribers) run(next);
}

/** Persists the current preferences. Every failure is swallowed into `status.storage`. */
function persist(): void {
	if (typeof window === "undefined") return;
	try {
		window.localStorage.setItem(
			SOUND_STORAGE_KEY,
			JSON.stringify({ v: 1, enabled: prefs.enabled, volume: prefs.volume, theme: prefs.theme })
		);
		status.storage = "ok";
	} catch (err) {
		status.storage = "error";
		status.lastError = err instanceof Error ? err.message : String(err);
	}
}

/** Cross-tab sync. Never writes back to storage — that would loop the tab that wrote it. */
function handleStorage(event: StorageEvent): void {
	if (event.key !== SOUND_STORAGE_KEY && event.key !== null) return;
	const next = parseStoredPreferences(event.newValue);
	// The Svelte source wrapped the two writes below in `untrack`, because
	// Svelte rejects a `$state` write made while a derived is the active
	// reaction. There is no such rule here and the wrappers are gone; nothing
	// else about this function changed.
	assignPrefs(next);
	status.storage = "ok";
	engine?.setMasterVolume(next.volume);
	engine?.setTheme(getSoundTheme(next.theme));
	notify();
}

/** Lazy hydration: reads storage once, attaches the cross-tab listener once, probes support once. */
function ensure(): void {
	if (hydrated) return;
	hydrated = true;
	if (typeof window === "undefined") return;
	try {
		assignPrefs(parseStoredPreferences(window.localStorage.getItem(SOUND_STORAGE_KEY)));
		status.storage = "ok";
	} catch {
		status.storage = "unavailable";
	}
	// Probe without constructing: a browser with no Web Audio is known
	// before the first click, so a SoundToggle can present itself honestly.
	status.supported = typeof window.AudioContext !== "undefined" || "webkitAudioContext" in window;
	if (!status.supported) status.engine = "unsupported";
	if (!storageListenerAttached) {
		storageListenerAttached = true;
		window.addEventListener("storage", handleStorage);
	}
}

/** Creates the engine on first use. Creating it allocates nothing (no AudioContext yet). */
function ensureEngine(): SoundEngine {
	if (!engine) {
		engine = createSoundEngine({
			onStateChange: (state, error) => {
				status.engine = state;
				// A transition without an error must not erase a storage message
				// the Sound Lab still wants to show; `lastError` means "last".
				if (error) status.lastError = error;
			},
			masterVolume: prefs.volume,
			theme: getSoundTheme(prefs.theme),
		});
	}
	return engine;
}

function markPlayed(cue: SoundCue): void {
	status.lastCue = cue;
	status.lastPlayedAt = performance.now();
}

/**
 * Getter-backed view over the status state. Returning a fresh spread of the
 * reactive state would subscribe every reader to every field (including
 * `lastPlayedAt`, written on each cue); with getters a reader depends only on
 * what it actually touches, because the read happens inside the reader's own
 * tracking scope.
 */
const statusView: SoundStatus = {
	get supported() {
		return status.supported;
	},
	get enabled() {
		return prefs.enabled;
	},
	get volume() {
		return prefs.volume;
	},
	get theme() {
		return prefs.theme;
	},
	get engine() {
		return status.engine;
	},
	get storage() {
		return status.storage;
	},
	get lastCue() {
		return status.lastCue;
	},
	get lastPlayedAt() {
		return status.lastPlayedAt;
	},
	get lastError() {
		return status.lastError;
	},
};

export const sound: SoundController = {
	// The five getters below deliberately do NOT call `ensure()`: a getter that
	// writes reactive state is a bug here (it can run inside a `computed`, a
	// template or a render function), and hydrating from a render path would
	// produce a value the server never rendered. `hydrateSound()` owns that.
	get enabled() {
		return prefs.enabled;
	},
	get volume() {
		return prefs.volume;
	},
	get theme() {
		return prefs.theme;
	},
	get preferences() {
		return snapshot();
	},
	get status() {
		return statusView;
	},
	play(cue: SoundCue, options?: SoundPlayOptions): void {
		ensure();
		if (typeof window === "undefined") return;
		if (!prefs.enabled) return;
		const eng = ensureEngine();
		if (eng.play(cue, options)) {
			markPlayed(cue);
			return;
		}
		// Not scheduled. If that is because the context is still idle (first
		// cue after a cold load), suspended (browser paused it), or blocked (an
		// earlier resume() was rejected outside a gesture — this call comes from
		// one, so it can still recover), unlock inside this same gesture and
		// replay exactly this one cue once running. Any other reason
		// (unsupported, rate-limited, voice cap) stays dropped.
		if (eng.state !== "idle" && eng.state !== "suspended" && eng.state !== "blocked") return;
		pending = { cue, options };
		if (unlocking) return;
		unlocking = true;
		void eng.unlock().then((ok) => {
			unlocking = false;
			const next = pending;
			pending = null;
			if (!ok || !next || !prefs.enabled) return;
			if (eng.play(next.cue, next.options)) markPlayed(next.cue);
		});
	},
	unlock(): Promise<boolean> {
		ensure();
		if (typeof window === "undefined") return Promise.resolve(false);
		return ensureEngine().unlock();
	},
	enable(): void {
		ensure();
		prefs.enabled = true;
		persist();
		notify();
		// Fire-and-forget: the click that enables sound IS the user gesture that
		// may unlock the AudioContext. No cue plays here — see SoundToggle.
		void sound.unlock();
	},
	disable(): void {
		ensure();
		prefs.enabled = false;
		persist();
		notify();
	},
	// toggle() and setEnabled() route through enable()/disable() so all three
	// share one unlock policy — a consumer building their own control with
	// `sound.toggle()` gets the same gesture-bound AudioContext as SoundToggle.
	toggle(): boolean {
		ensure();
		if (prefs.enabled) sound.disable();
		else sound.enable();
		return prefs.enabled;
	},
	setEnabled(enabled: boolean): void {
		ensure();
		if (enabled === true) sound.enable();
		else sound.disable();
	},
	setVolume(volume: number): void {
		ensure();
		if (!Number.isFinite(volume)) return;
		prefs.volume = Math.min(1, Math.max(0, volume));
		persist();
		engine?.setMasterVolume(prefs.volume);
		notify();
	},
	setTheme(theme: SoundThemeName): void {
		ensure();
		if (!(SOUND_THEME_NAMES as readonly string[]).includes(theme)) return;
		prefs.theme = theme;
		persist();
		engine?.setTheme(getSoundTheme(theme));
		notify();
	},
	subscribe(run: (prefs: SoundPreferences) => void): () => void {
		ensure();
		subscribers.add(run);
		run(snapshot());
		return () => {
			subscribers.delete(run);
		};
	},
};

/** Non-reactive snapshot for status lines / logging. Always a fresh plain object. */
export function getSoundStatus(): SoundStatus {
	ensure();
	return {
		supported: status.supported,
		enabled: prefs.enabled,
		volume: prefs.volume,
		theme: prefs.theme,
		engine: status.engine,
		storage: status.storage,
		lastCue: status.lastCue,
		lastPlayedAt: status.lastPlayedAt,
		lastError: status.lastError,
	};
}

/**
 * Idempotent. Reads localStorage, attaches the cross-tab listener, probes
 * AudioContext support without constructing one. Called from `onMounted`
 * (see `use-sound.ts`), never from a render path.
 */
export function hydrateSound(): void {
	ensure();
}

/**
 * Test-only: disposes the engine, resets prefs to defaults, clears listeners
 * and subscribers, forgets storage state. Not exported from index.ts.
 */
export function resetSoundForTests(): void {
	engine?.dispose();
	engine = null;
	if (storageListenerAttached && typeof window !== "undefined") {
		window.removeEventListener("storage", handleStorage);
	}
	storageListenerAttached = false;
	subscribers.clear();
	pending = null;
	unlocking = false;
	hydrated = false;
	assignPrefs(DEFAULT_SOUND_PREFERENCES);
	Object.assign(status, createInitialStatus());
}
