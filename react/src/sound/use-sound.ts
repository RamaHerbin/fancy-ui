/**
 * The React bindings over the sound singleton.
 *
 * Two audiences, two hooks. A component with a `sound` PROP only ever plays a
 * cue, so it uses `useSoundCue` and never subscribes. A control that RENDERS
 * the preference — SoundToggle, the docs' Sound Lab — reads the store through
 * `useSound` / `useSoundEnabled` / `useSoundStatus`, which subscribe and which
 * trigger the one lazy `localStorage` read from an effect.
 */

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import { useLiveRef } from "../internals/dom/use-live-ref.js";
import {
	getSoundServerSnapshot,
	getSoundSnapshot,
	hydrateSound,
	sound,
	subscribeSound,
	type SoundController,
	type SoundSnapshot,
} from "./sound.js";
import type { SoundCue, SoundPlayOptions, SoundStatus, SoundThemeName } from "./types.js";

/** The imperative half of `useSound()`'s return value. */
export type SoundControls = Pick<
	SoundController,
	"play" | "unlock" | "enable" | "disable" | "toggle" | "setEnabled" | "setVolume" | "setTheme"
>;

/**
 * One frozen module-scope object, so the identity is stable for every consumer
 * for the life of the page. Every method delegates to `sound` at CALL time
 * rather than capturing the function — that is what keeps `vi.spyOn(sound,
 * "play")` observable through the hook, and what lets `enable()` reach the
 * live `sound.unlock()`.
 */
const CONTROLS: SoundControls = Object.freeze({
	play(cue: SoundCue, options?: SoundPlayOptions): void {
		sound.play(cue, options);
	},
	unlock(): Promise<boolean> {
		return sound.unlock();
	},
	enable(): void {
		sound.enable();
	},
	disable(): void {
		sound.disable();
	},
	toggle(): boolean {
		return sound.toggle();
	},
	setEnabled(enabled: boolean): void {
		sound.setEnabled(enabled);
	},
	setVolume(volume: number): void {
		sound.setVolume(volume);
	},
	setTheme(theme: SoundThemeName): void {
		sound.setTheme(theme);
	},
});

const getEnabled = (): boolean => getSoundSnapshot().enabled;
const getServerEnabled = (): boolean => getSoundServerSnapshot().enabled;
const getStatus = (): SoundStatus => getSoundSnapshot().status;
const getServerStatus = (): SoundStatus => getSoundServerSnapshot().status;

/**
 * The one place storage is read. It runs in an effect, so the server render
 * and the hydration render both see the defaults and only the commit that
 * follows can learn the stored preference.
 */
function useHydrateSound(): void {
	useEffect(() => {
		hydrateSound();
	}, []);
}

/**
 * A cue player for a component's own `sound` prop. Permanently identity-stable;
 * a no-op while `enabled` is falsy.
 *
 * DELIBERATELY DOES NOT SUBSCRIBE — a Button must not re-render because the
 * user changed the volume in a settings panel elsewhere on the page. Whether a
 * cue is audible is decided inside `sound.play()` at call time, which is also
 * where the lazy hydration happens for this path.
 */
export function useSoundCue(
	enabled: boolean | undefined
): (cue: SoundCue, options?: SoundPlayOptions) => void {
	const enabledRef = useLiveRef(enabled);

	return useCallback(
		(cue: SoundCue, options?: SoundPlayOptions) => {
			if (!enabledRef.current) return;
			sound.play(cue, options);
		},
		[enabledRef]
	);
}

/**
 * The full store plus the imperative controls. Subscribes, and runs
 * `hydrateSound()` in an effect. For controls that RENDER the preference.
 */
export function useSound(): SoundSnapshot & SoundControls {
	const snapshot = useSyncExternalStore(
		subscribeSound,
		getSoundSnapshot,
		getSoundServerSnapshot
	);
	useHydrateSound();

	// Memoised on the snapshot alone: `CONTROLS` never changes identity, so the
	// returned object changes exactly when the state a consumer renders changed.
	return useMemo(() => ({ ...snapshot, ...CONTROLS }), [snapshot]);
}

/**
 * Just the master switch. Selecting the scalar rather than the snapshot is what
 * keeps a toggle from re-rendering on every cue: `status.lastPlayedAt` moves on
 * each `play()`, and `useSyncExternalStore` bails out when the selected value
 * is `Object.is`-equal.
 */
export function useSoundEnabled(): boolean {
	const enabled = useSyncExternalStore(subscribeSound, getEnabled, getServerEnabled);
	useHydrateSound();
	return enabled;
}

/** The live status object (identity-cached by the store). */
export function useSoundStatus(): SoundStatus {
	const status = useSyncExternalStore(subscribeSound, getStatus, getServerStatus);
	useHydrateSound();
	return status;
}
