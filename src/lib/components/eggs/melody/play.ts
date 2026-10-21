import type { EggContext } from "../types.js";

/** Gap the phrase never goes below: the engine's per-cue guard is far shorter, this keeps every note audible. */
export const MIN_NOTE_GAP_MS = 80;

/** A rising trill that hovers and settles on the octave, in semitones from the cue's base pitch. */
export const MELODY: readonly { pitch: number; at: number }[] = Object.freeze([
	{ pitch: 0, at: 0 },
	{ pitch: 4, at: 90 },
	{ pitch: 7, at: 180 },
	{ pitch: 12, at: 270 },
	{ pitch: 11, at: 380 },
	{ pitch: 7, at: 470 },
	{ pitch: 9, at: 560 },
	{ pitch: 12, at: 720 },
]);

export const MELODY_VOLUME = 0.8;

let timers: ReturnType<typeof setTimeout>[] = [];

/** Stops a phrase in flight (a re-trigger restarts it rather than overlapping). */
export function cancel(): void {
	for (const t of timers) clearTimeout(t);
	timers = [];
}

export async function run(ctx: EggContext): Promise<void> {
	const { sound } = await import("$lib/fancy-ui/sound/index.js");
	// play() is a silent no-op when disabled; check first so the egg is never marked found unheard.
	if (!sound.enabled) return;
	cancel();
	const [first, ...rest] = MELODY;
	if (!first) return;
	sound.play("tick", { pitch: first.pitch, volume: MELODY_VOLUME });
	ctx.found();
	for (const note of rest) {
		timers.push(
			setTimeout(() => {
				if (sound.enabled) sound.play("tick", { pitch: note.pitch, volume: MELODY_VOLUME });
			}, note.at - first.at)
		);
	}
}
