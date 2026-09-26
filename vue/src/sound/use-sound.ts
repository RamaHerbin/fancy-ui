/**
 * The composition bindings over the sound singleton.
 *
 * Two audiences, two shapes. A component with a `sound` PROP only ever plays a
 * cue, so it uses `useSoundCue`, which reads the preference INSIDE the returned
 * function and therefore never becomes a reactive dependency of its caller's
 * render — a Button must not re-render because the volume changed in a settings
 * panel elsewhere on the page. A control that RENDERS the preference —
 * SoundToggle, the docs' Sound Lab — reads it through `useSound` /
 * `useSoundEnabled` / `useSoundStatus`, which read the reactive fields and run
 * the one `localStorage` read from `onMounted`.
 *
 * The rule that replaces React's "this hook deliberately does not subscribe"
 * comment: reading `sound.enabled` inside a `computed`, a template or a render
 * function DOES track it. Read it inside the handler, never in the template.
 */

import { computed, onMounted, toValue, type MaybeRefOrGetter, type Ref } from "vue";
import { hydrateSound, sound, type SoundController } from "./sound.js";
import type {
	SoundCue,
	SoundPlayOptions,
	SoundStatus,
	SoundThemeName,
} from "./types.js";

/** The imperative half of `useSound()`'s return value. */
export type SoundControls = Pick<
	SoundController,
	"play" | "unlock" | "enable" | "disable" | "toggle" | "setEnabled" | "setVolume" | "setTheme"
>;

/** The reactive half of `useSound()`'s return value — plain getters, read where they are rendered. */
export interface SoundState {
	readonly enabled: boolean;
	readonly volume: number;
	readonly theme: SoundThemeName;
	readonly status: SoundStatus;
}

/**
 * One frozen module-scope object, so the identity is stable for every consumer
 * for the life of the page. Every method delegates to `sound` at CALL time
 * rather than capturing the function — that is what keeps `vi.spyOn(sound,
 * "play")` observable through the composable, and what lets `enable()` reach
 * the live `sound.unlock()`. The four state fields are getters for the same
 * reason: the read happens in the reader's own tracking scope, so a consumer
 * depends on exactly the fields it renders.
 */
const STORE: SoundState & SoundControls = Object.freeze({
	get enabled(): boolean {
		return sound.enabled;
	},
	get volume(): number {
		return sound.volume;
	},
	get theme(): SoundThemeName {
		return sound.theme;
	},
	get status(): SoundStatus {
		return sound.status;
	},
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

/**
 * The one place storage is read. It runs in `onMounted`, so the server render,
 * the hydration render and the first client render all see the frozen defaults
 * and only the mount that follows can learn the stored preference.
 */
function useHydrateSound(): void {
	onMounted(hydrateSound);
}

/**
 * A cue player for a component's own `sound` prop. Identity-stable, a no-op
 * while `enabled` is falsy.
 *
 * Reads `sound.enabled` only INSIDE the returned function — through
 * `sound.play()` — so it never becomes a reactive dependency of its caller's
 * render, and it reads nothing from storage of its own: hydration for this path
 * happens inside `play()`, at gesture time.
 */
export function useSoundCue(
	enabled: MaybeRefOrGetter<boolean | undefined>
): (cue: SoundCue, options?: SoundPlayOptions) => void {
	return (cue: SoundCue, options?: SoundPlayOptions) => {
		if (!toValue(enabled)) return;
		sound.play(cue, options);
	};
}

/**
 * The full state plus the imperative controls, for controls that RENDER the
 * preference. Runs `hydrateSound()` in `onMounted`.
 */
export function useSound(): SoundState & SoundControls {
	useHydrateSound();
	return STORE;
}

/**
 * Just the master switch. A reader of this one field wakes for a preference
 * change and for nothing else — `status.lastPlayedAt` moves on every cue, and a
 * toggle must not re-render because a button elsewhere on the page made a sound.
 */
export function useSoundEnabled(): Readonly<Ref<boolean>> {
	useHydrateSound();
	return computed(() => sound.enabled);
}

/**
 * The live status view. Its identity is stable; each field is read through a
 * getter, so a consumer depends on the fields it actually renders rather than
 * on the whole object.
 */
export function useSoundStatus(): Readonly<Ref<SoundStatus>> {
	useHydrateSound();
	return computed(() => sound.status);
}
