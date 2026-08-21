/**
 * Sound themes — pure data plus a validator.
 *
 * `FANCY_SOUND_THEME` is the original FancyUI palette: glassy sine/triangle
 * pings with short noise transients. Rising pitch reads as positive/open,
 * falling pitch as negative/close (workflow/contracts.md §4).
 */

import {
	SOUND_CUES,
	SOUND_LIMITS,
	type CueRecipe,
	type SoundCue,
	type SoundEnvelope,
	type SoundThemeDefinition,
	type SoundThemeName,
} from "./types.js";

function env(attack: number, decay: number, sustain: number, release: number): SoundEnvelope {
	return { attack, decay, sustain, release };
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

const FANCY_CUES: Record<SoundCue, CueRecipe> = {
	hover: {
		layers: [
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 1760,
				frequencyEnd: 1975,
				gain: 0.12,
				envelope: env(2, 20, 0, 20),
				duration: 45,
				filter: { type: "highpass", frequency: 800 },
			},
		],
	},
	press: {
		layers: [
			{
				kind: "oscillator",
				wave: "triangle",
				frequency: 520,
				frequencyEnd: 440,
				gain: 0.5,
				envelope: env(2, 35, 0, 25),
				duration: 70,
			},
			{
				kind: "noise",
				gain: 0.18,
				envelope: env(1, 18, 0, 8),
				duration: 30,
				filter: { type: "bandpass", frequency: 2400, q: 1.2 },
			},
		],
	},
	"toggle-on": {
		layers: [
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 660,
				gain: 0.4,
				envelope: env(3, 30, 0.2, 20),
				duration: 55,
			},
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 880,
				gain: 0.4,
				envelope: env(3, 40, 0, 25),
				duration: 70,
				delay: 45,
				filter: { type: "lowpass", frequency: 4000 },
			},
		],
	},
	"toggle-off": {
		layers: [
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 880,
				gain: 0.35,
				envelope: env(3, 30, 0.2, 20),
				duration: 55,
			},
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 660,
				gain: 0.32,
				envelope: env(3, 35, 0, 20),
				duration: 60,
				delay: 45,
				filter: { type: "lowpass", frequency: 3500 },
			},
		],
	},
	open: {
		layers: [
			{
				kind: "oscillator",
				wave: "triangle",
				frequency: 392,
				frequencyEnd: 784,
				gain: 0.35,
				envelope: env(5, 60, 0.3, 30),
				duration: 110,
			},
			{
				kind: "noise",
				gain: 0.08,
				envelope: env(10, 50, 0, 30),
				duration: 90,
				filter: { type: "highpass", frequency: 3000, frequencyEnd: 6000 },
			},
		],
	},
	close: {
		layers: [
			{
				kind: "oscillator",
				wave: "triangle",
				frequency: 784,
				frequencyEnd: 392,
				gain: 0.3,
				envelope: env(4, 50, 0.2, 30),
				duration: 100,
			},
			{
				kind: "noise",
				gain: 0.06,
				envelope: env(5, 40, 0, 30),
				duration: 80,
				filter: { type: "lowpass", frequency: 1500, frequencyEnd: 600 },
			},
		],
	},
	select: {
		layers: [
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 1046.5,
				gain: 0.35,
				envelope: env(2, 40, 0, 25),
				duration: 70,
			},
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 1568,
				gain: 0.12,
				envelope: env(2, 30, 0, 18),
				duration: 50,
				delay: 10,
			},
		],
	},
	success: {
		layers: [
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 523.25,
				gain: 0.35,
				envelope: env(4, 60, 0.3, 40),
				duration: 110,
				filter: { type: "lowpass", frequency: 5000 },
			},
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 659.25,
				gain: 0.35,
				envelope: env(4, 60, 0.3, 40),
				duration: 110,
				delay: 70,
				filter: { type: "lowpass", frequency: 5000 },
			},
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 783.99,
				gain: 0.4,
				envelope: env(4, 60, 0.3, 40),
				duration: 150,
				delay: 140,
				filter: { type: "lowpass", frequency: 5000 },
			},
		],
	},
	error: {
		layers: [
			{
				kind: "oscillator",
				wave: "sawtooth",
				frequency: 220,
				detune: -8,
				gain: 0.3,
				envelope: env(5, 70, 0.4, 40),
				duration: 130,
				filter: { type: "lowpass", frequency: 900 },
			},
			{
				kind: "oscillator",
				wave: "sawtooth",
				frequency: 233,
				detune: 8,
				gain: 0.3,
				envelope: env(5, 70, 0.4, 40),
				duration: 130,
				delay: 110,
				filter: { type: "lowpass", frequency: 900 },
			},
		],
	},
	tick: {
		layers: [
			{
				kind: "noise",
				gain: 0.2,
				envelope: env(1, 12, 0, 8),
				duration: 22,
				filter: { type: "bandpass", frequency: 3500, q: 2 },
			},
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 2093,
				gain: 0.08,
				envelope: env(1, 15, 0, 8),
				duration: 25,
			},
		],
	},
	copy: {
		layers: [
			{
				kind: "noise",
				gain: 0.15,
				envelope: env(1, 10, 0, 8),
				duration: 20,
				filter: { type: "bandpass", frequency: 5000, q: 1 },
			},
			{
				kind: "oscillator",
				wave: "sine",
				frequency: 1318.5,
				frequencyEnd: 1760,
				gain: 0.3,
				envelope: env(2, 50, 0, 25),
				duration: 80,
				delay: 8,
			},
		],
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
