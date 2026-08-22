import { describe, expect, it } from "vitest";
import { SOUND_CUES, SOUND_LIMITS, type SoundThemeDefinition } from "./types.js";
import { FANCY_SOUND_THEME, SOUND_THEMES, getSoundTheme, validateSoundTheme } from "./themes.js";

function cloneTheme(): SoundThemeDefinition {
	return JSON.parse(JSON.stringify(FANCY_SOUND_THEME)) as SoundThemeDefinition;
}

describe("FANCY_SOUND_THEME", () => {
	it("defines all 11 cues", () => {
		expect(Object.keys(FANCY_SOUND_THEME.cues).sort()).toEqual([...SOUND_CUES].sort());
		expect(Object.keys(FANCY_SOUND_THEME.cues)).toHaveLength(11);
	});

	it("is valid per the validator", () => {
		expect(validateSoundTheme(FANCY_SOUND_THEME)).toEqual([]);
	});

	it("is frozen (name, cues map, and every layer)", () => {
		expect(Object.isFrozen(FANCY_SOUND_THEME)).toBe(true);
		expect(Object.isFrozen(FANCY_SOUND_THEME.cues)).toBe(true);
		expect(Object.isFrozen(FANCY_SOUND_THEME.cues.hover)).toBe(true);
		expect(Object.isFrozen(FANCY_SOUND_THEME.cues.hover.layers)).toBe(true);
		expect(Object.isFrozen(FANCY_SOUND_THEME.cues.hover.layers[0])).toBe(true);
		expect(Object.isFrozen(FANCY_SOUND_THEME.cues.hover.layers[0].envelope)).toBe(true);
		const mutate = (): void => {
			FANCY_SOUND_THEME.cues.hover.layers[0].gain = 1;
		};
		expect(mutate).toThrow();
	});

	it("keeps every layer within SOUND_LIMITS.MAX_LAYER_MS", () => {
		for (const cue of SOUND_CUES) {
			for (const layer of FANCY_SOUND_THEME.cues[cue].layers) {
				expect(layer.duration).toBeLessThanOrEqual(SOUND_LIMITS.MAX_LAYER_MS);
			}
		}
	});

	it("keeps success/error spans within 300ms and other cues within 120ms", () => {
		for (const cue of SOUND_CUES) {
			const span = Math.max(
				...FANCY_SOUND_THEME.cues[cue].layers.map((layer) => (layer.delay ?? 0) + layer.duration)
			);
			const limit = cue === "success" || cue === "error" ? 300 : 120;
			expect(span).toBeLessThanOrEqual(limit);
		}
	});
});

describe("SOUND_THEMES / getSoundTheme", () => {
	it("registers fancy under SOUND_THEMES", () => {
		expect(SOUND_THEMES.fancy).toBe(FANCY_SOUND_THEME);
	});

	it("returns the named theme", () => {
		expect(getSoundTheme("fancy")).toBe(FANCY_SOUND_THEME);
	});

	it("falls back to fancy for unknown theme names", () => {
		expect(getSoundTheme("does-not-exist" as never)).toBe(FANCY_SOUND_THEME);
	});
});

describe("validateSoundTheme", () => {
	it("reports a missing cue", () => {
		const theme = cloneTheme();
		delete (theme.cues as Partial<typeof theme.cues>).hover;
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("hover"))).toBe(true);
	});

	it("reports an empty layers array", () => {
		const theme = cloneTheme();
		theme.cues.press.layers = [];
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("press"))).toBe(true);
	});

	it("reports a layer gain above 1", () => {
		const theme = cloneTheme();
		theme.cues.hover.layers[0].gain = 1.5;
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("gain must be <= 1"))).toBe(true);
	});

	it("reports a recipe gain above 1", () => {
		const theme = cloneTheme();
		theme.cues.hover.gain = 2;
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("recipe gain must be <= 1"))).toBe(true);
	});

	it("reports a negative or non-finite number", () => {
		const theme = cloneTheme();
		theme.cues.hover.layers[0].envelope.attack = -1;
		expect(validateSoundTheme(theme).length).toBeGreaterThan(0);

		const theme2 = cloneTheme();
		theme2.cues.hover.layers[0].duration = Number.NaN;
		expect(validateSoundTheme(theme2).length).toBeGreaterThan(0);
	});

	it("reports sustain out of 0..1", () => {
		const theme = cloneTheme();
		theme.cues.hover.layers[0].envelope.sustain = 1.2;
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("sustain"))).toBe(true);
	});

	it("reports duration shorter than attack+decay+release", () => {
		const theme = cloneTheme();
		theme.cues.hover.layers[0].duration = 1;
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("duration must be >="))).toBe(true);
	});

	it("reports a layer longer than MAX_LAYER_MS", () => {
		const theme = cloneTheme();
		theme.cues.hover.layers[0].duration = SOUND_LIMITS.MAX_LAYER_MS + 50;
		theme.cues.hover.layers[0].envelope = { attack: 2, decay: 6, sustain: 0, release: 8 };
		const problems = validateSoundTheme(theme);
		expect(
			problems.some((p) => p.includes(`duration must be <= ${SOUND_LIMITS.MAX_LAYER_MS}ms`))
		).toBe(true);
	});

	it("reports a whole-cue span over 120ms for a non success/error cue", () => {
		const theme = cloneTheme();
		theme.cues.hover.layers[0].duration = 130;
		theme.cues.hover.layers[0].envelope = { attack: 2, decay: 6, sustain: 0, release: 8 };
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("exceeds 120ms"))).toBe(true);
	});

	it("allows success/error cues up to 300ms but flags beyond that", () => {
		const theme = cloneTheme();
		theme.cues.success.layers[2].duration = 200;
		expect(
			validateSoundTheme(theme).some((p) => p.includes("success") && p.includes("exceeds"))
		).toBe(true);
	});

	it("reports an invalid wave", () => {
		const theme = cloneTheme();
		(theme.cues.hover.layers[0] as { wave: string }).wave = "not-a-wave";
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("invalid wave"))).toBe(true);
	});

	it("reports an invalid filter type", () => {
		const theme = cloneTheme();
		theme.cues.press.layers[1].filter = { type: "not-a-filter" as never, frequency: 100 };
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("invalid filter type"))).toBe(true);
	});

	it("reports a non-positive oscillator frequency", () => {
		const theme = cloneTheme();
		(theme.cues.hover.layers[0] as { frequency: number }).frequency = 0;
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("frequency must be a finite number > 0"))).toBe(true);
	});

	it("reports a non-positive filter frequency", () => {
		const theme = cloneTheme();
		theme.cues.press.layers[1].filter = { type: "bandpass", frequency: 0 };
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("filter frequency must be a finite number > 0"))).toBe(
			true
		);
	});

	// Infinity survives every `> 0` check but breaks the AudioParam assignment in
	// the engine, where the cue is dropped without a word. It has to fail here.
	it("reports a non-finite oscillator frequency, frequencyEnd and detune", () => {
		const theme = cloneTheme();
		const layer = theme.cues.hover.layers[0] as {
			frequency: number;
			frequencyEnd?: number;
			detune?: number;
		};
		layer.frequency = Number.POSITIVE_INFINITY;
		layer.frequencyEnd = Number.NaN;
		layer.detune = Number.POSITIVE_INFINITY;
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("frequency must be a finite number > 0"))).toBe(true);
		expect(problems.some((p) => p.includes("frequencyEnd must be a finite number > 0"))).toBe(true);
		expect(problems.some((p) => p.includes("detune must be a finite number"))).toBe(true);
	});

	it("reports a non-finite filter frequency, frequencyEnd and q", () => {
		const theme = cloneTheme();
		theme.cues.press.layers[1].filter = {
			type: "bandpass",
			frequency: Number.POSITIVE_INFINITY,
			frequencyEnd: Number.POSITIVE_INFINITY,
			q: Number.NaN,
		};
		const problems = validateSoundTheme(theme);
		expect(problems.some((p) => p.includes("filter frequency must be a finite number > 0"))).toBe(
			true
		);
		expect(
			problems.some((p) => p.includes("filter frequencyEnd must be a finite number > 0"))
		).toBe(true);
		expect(problems.some((p) => p.includes("filter q must be a finite number"))).toBe(true);
	});

	it("returns [] for a minimal valid theme", () => {
		const minimal: SoundThemeDefinition = {
			name: "fancy",
			cues: Object.fromEntries(
				SOUND_CUES.map((cue) => [
					cue,
					{
						layers: [
							{
								kind: "oscillator" as const,
								wave: "sine" as const,
								frequency: 440,
								gain: 0.1,
								envelope: { attack: 2, decay: 6, sustain: 0, release: 8 },
								duration: 20,
							},
						],
					},
				])
			) as SoundThemeDefinition["cues"],
		};
		expect(validateSoundTheme(minimal)).toEqual([]);
	});
});
