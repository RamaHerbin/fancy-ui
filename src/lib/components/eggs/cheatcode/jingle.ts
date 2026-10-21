/** Rising arpeggio (root, major third, fifth, octave) after the success cue. */
export const JINGLE_PITCHES = [0, 4, 7, 12] as const;
export const JINGLE_STEP_MS = 90;

/**
 * Plays the party jingle when the visitor has sound on. The sound module is
 * imported lazily so it never lands in the egg registry chunk.
 * Returns a cancel function that drops the notes not played yet.
 */
export async function playJingle(): Promise<() => void> {
	const { sound } = await import("$lib/fancy-ui/sound/index.js");
	if (!sound.enabled) return () => {};
	sound.play("success");
	const timers = JINGLE_PITCHES.map((pitch, i) =>
		setTimeout(() => sound.play("tick", { pitch }), (i + 1) * JINGLE_STEP_MS)
	);
	return () => {
		for (const t of timers) clearTimeout(t);
	};
}
