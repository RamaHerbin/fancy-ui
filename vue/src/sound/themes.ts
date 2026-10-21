/**
 * Sound themes — pure data plus a validator.
 *
 * `FANCY_SOUND_THEME` is the FancyUI palette: short tactile taps (one
 * oscillator, a fast downward pitch sweep under an exponential decay) and a
 * quiet sine bell kept for success. No noise, no held notes. Ascending pairs
 * and sweeps read as positive/open, descending ones as negative/close.
 */

import {
	SOUND_CUES,
	SOUND_LIMITS,
	type CueRecipe,
	type SoundCue,
	type SoundEnvelope,
	type SoundOscillatorLayer,
	type SoundThemeDefinition,
	type SoundThemeName,
} from "./types.js";

function env(attack: number, decay: number, sustain: number, release: number): SoundEnvelope {
	return { attack, decay, sustain, release };
}

function exp(attack: number, decay: number, sustain: number, release: number): SoundEnvelope {
	return { attack, decay, sustain, release, curve: "exponential" };
}

function deepFreeze<T>(value: T): T {
	if (value && typeof value === "object" && !Object.isFrozen(value)) {
		for (const key of Object.keys(value as Record<string, unknown>)) {
			deepFreeze((value as Record<string, unknown>)[key]);
		}
		Object.freeze(value);
	}
	return value;
}

/**
 * A tap: one oscillator whose pitch falls a couple of octaves over the whole
 * decay while its level falls off exponentially. That fast, the ear hears no
 * note, only a soft knock. Every gesture cue below is built from taps.
 */
function tap(
	frequency: number,
	frequencyEnd: number,
	gain: number,
	decay: number,
	extra: Partial<SoundOscillatorLayer> = {}
): SoundOscillatorLayer {
	return {
		kind: "oscillator",
		wave: "triangle",
		frequency,
		frequencyEnd,
		glide: 2 + decay,
		gain,
		envelope: exp(2, decay, 0, 8),
		duration: 2 + decay + 8,
		...extra,
	};
}

/** A quiet sine bell that rings out, reserved for outcomes (success). */
function bell(frequency: number, gain: number, decay: number, delay = 0): SoundOscillatorLayer {
	return {
		kind: "oscillator",
		wave: "sine",
		frequency,
		gain,
		envelope: exp(2, decay, 0, 10),
		duration: 2 + decay + 10,
		delay,
	};
}

const FANCY_CUES: Record<SoundCue, CueRecipe> = {
	// Bright and tiny: present under the pointer, gone before it registers as a sound.
	hover: {
		layers: [tap(1680, 420, 0.5, 10, { wave: "sine" })],
	},
	// The reference cue every other one is tuned against.
	press: {
		layers: [tap(850, 160, 0.8, 18)],
	},
	"toggle-on": {
		layers: [tap(700, 150, 0.6, 16), tap(1100, 240, 0.6, 16, { delay: 45 })],
	},
	"toggle-off": {
		layers: [tap(1100, 240, 0.55, 16), tap(700, 150, 0.55, 16, { delay: 45 })],
	},
	// Rising and falling sine sweeps: direction tells open from close.
	open: {
		layers: [
			tap(420, 1260, 0.45, 34, { wave: "sine", glide: 24 }),
			tap(850, 160, 0.35, 14, { delay: 4 }),
		],
	},
	close: {
		layers: [
			tap(1260, 380, 0.4, 34, { wave: "sine", glide: 24 }),
			tap(700, 140, 0.35, 14, { delay: 26 }),
		],
	},
	select: {
		layers: [tap(1150, 230, 0.7, 14)],
	},
	success: {
		layers: [tap(850, 160, 0.6, 18), bell(1046.5, 0.22, 110, 30), bell(1568, 0.18, 140, 90)],
	},
	error: {
		layers: [
			tap(320, 120, 0.3, 40, { filter: { type: "lowpass", frequency: 1600 } }),
			tap(240, 95, 0.3, 50, { delay: 95, filter: { type: "lowpass", frequency: 1600 } }),
		],
	},
	tick: {
		layers: [tap(2700, 675, 0.3, 8, { wave: "sine" })],
	},
	copy: {
		layers: [tap(1300, 260, 0.6, 14), tap(1800, 360, 0.55, 14, { delay: 40 })],
	},
};

export const FANCY_SOUND_THEME: SoundThemeDefinition = deepFreeze({
	name: "fancy",
	cues: FANCY_CUES,
});

export const SOUND_THEMES: Readonly<Record<SoundThemeName, SoundThemeDefinition>> = Object.freeze({
	fancy: FANCY_SOUND_THEME,
});

/** Falls back to the fancy theme for unknown names (runtime safety for stored prefs). */
export function getSoundTheme(name: SoundThemeName): SoundThemeDefinition {
	return SOUND_THEMES[name] ?? FANCY_SOUND_THEME;
}

const VALID_WAVES = new Set(["sine", "triangle", "square", "sawtooth"]);
const VALID_FILTERS = new Set(["lowpass", "highpass", "bandpass", "notch", "peaking"]);

/**
 * Returns human-readable problems; [] when valid. Checks: every cue present, ≥1
 * layer, all numbers finite/non-negative, gains ≤ 1, sustain 0..1,
 * duration ≥ attack+decay+release, layer ≤ SOUND_LIMITS.MAX_LAYER_MS, whole-cue
 * span (max(delay+duration)) ≤ 120ms except success/error ≤ 300ms.
 */
export function validateSoundTheme(theme: SoundThemeDefinition): string[] {
	const problems: string[] = [];

	for (const cue of SOUND_CUES) {
		const recipe = theme.cues[cue];
		if (!recipe || !recipe.layers || recipe.layers.length === 0) {
			problems.push(`${cue}: missing recipe or no layers`);
			continue;
		}

		if (recipe.gain != null) {
			if (!Number.isFinite(recipe.gain) || recipe.gain < 0) {
				problems.push(`${cue}: recipe gain must be a finite number >= 0`);
			} else if (recipe.gain > 1) {
				problems.push(`${cue}: recipe gain must be <= 1`);
			}
		}

		let maxSpan = 0;

		recipe.layers.forEach((layer, index) => {
			const label = `${cue}[${index}]`;
			const delay = layer.delay ?? 0;

			const numericFields: Array<[string, number]> = [
				["gain", layer.gain],
				["duration", layer.duration],
				["delay", delay],
				["envelope.attack", layer.envelope.attack],
				["envelope.decay", layer.envelope.decay],
				["envelope.sustain", layer.envelope.sustain],
				["envelope.release", layer.envelope.release],
			];
			for (const [field, value] of numericFields) {
				if (!Number.isFinite(value) || value < 0) {
					problems.push(`${label}: ${field} must be a finite number >= 0`);
				}
			}

			if (Number.isFinite(layer.gain) && layer.gain > 1) {
				problems.push(`${label}: gain must be <= 1`);
			}
			if (
				Number.isFinite(layer.envelope.sustain) &&
				(layer.envelope.sustain < 0 || layer.envelope.sustain > 1)
			) {
				problems.push(`${label}: envelope.sustain must be between 0 and 1`);
			}

			if (
				layer.envelope.curve != null &&
				layer.envelope.curve !== "linear" &&
				layer.envelope.curve !== "exponential"
			) {
				problems.push(`${label}: invalid envelope.curve "${layer.envelope.curve}"`);
			}

			const requiredSpan = layer.envelope.attack + layer.envelope.decay + layer.envelope.release;
			if (Number.isFinite(layer.duration) && layer.duration < requiredSpan) {
				problems.push(`${label}: duration must be >= attack + decay + release`);
			}
			if (Number.isFinite(layer.duration) && layer.duration > SOUND_LIMITS.MAX_LAYER_MS) {
				problems.push(`${label}: duration must be <= ${SOUND_LIMITS.MAX_LAYER_MS}ms`);
			}

			if (layer.kind === "oscillator") {
				if (!VALID_WAVES.has(layer.wave)) {
					problems.push(`${label}: invalid wave "${layer.wave}"`);
				}
				if (!Number.isFinite(layer.frequency) || layer.frequency <= 0) {
					problems.push(`${label}: frequency must be a finite number > 0`);
				}
				if (
					layer.frequencyEnd != null &&
					(!Number.isFinite(layer.frequencyEnd) || layer.frequencyEnd <= 0)
				) {
					problems.push(`${label}: frequencyEnd must be a finite number > 0`);
				}
				if (
					layer.glide != null &&
					(!Number.isFinite(layer.glide) ||
						layer.glide <= 0 ||
						(Number.isFinite(layer.duration) && layer.glide > layer.duration))
				) {
					problems.push(`${label}: glide must be a finite number > 0 and <= duration`);
				}
				if (layer.detune != null && !Number.isFinite(layer.detune)) {
					problems.push(`${label}: detune must be a finite number`);
				}
			}

			if (layer.filter) {
				if (!VALID_FILTERS.has(layer.filter.type)) {
					problems.push(`${label}: invalid filter type "${layer.filter.type}"`);
				}
				if (!Number.isFinite(layer.filter.frequency) || layer.filter.frequency <= 0) {
					problems.push(`${label}: filter frequency must be a finite number > 0`);
				}
				if (
					layer.filter.frequencyEnd != null &&
					(!Number.isFinite(layer.filter.frequencyEnd) || layer.filter.frequencyEnd <= 0)
				) {
					problems.push(`${label}: filter frequencyEnd must be a finite number > 0`);
				}
				if (layer.filter.q != null && !Number.isFinite(layer.filter.q)) {
					problems.push(`${label}: filter q must be a finite number`);
				}
			}

			if (Number.isFinite(delay) && Number.isFinite(layer.duration)) {
				maxSpan = Math.max(maxSpan, delay + layer.duration);
			}
		});

		const spanLimit = cue === "success" || cue === "error" ? 300 : 120;
		if (maxSpan > spanLimit) {
			problems.push(`${cue}: total span ${maxSpan}ms exceeds ${spanLimit}ms limit`);
		}
	}

	return problems;
}
