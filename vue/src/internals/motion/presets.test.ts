import { describe, expect, it } from "vitest";
import { PRESET_NAMES, PRESETS, type PresetName, type RevealPresetName } from "./presets.js";

describe("presets", () => {
	it("PRESET_NAMES lists all 8 presets, in the frozen order", () => {
		expect(PRESET_NAMES).toEqual([
			"fade",
			"fade-up",
			"fade-down",
			"fade-left",
			"fade-right",
			"scale",
			"blur",
			"zoom",
		]);
	});

	it("PRESETS has exactly the PRESET_NAMES keys, no more, no fewer", () => {
		expect(Object.keys(PRESETS).sort()).toEqual([...PRESET_NAMES].sort());
	});

	it("matches the frozen geometry table exactly (x/y = sign × distance)", () => {
		expect(PRESETS).toEqual({
			fade: {},
			"fade-up": { y: 1 },
			"fade-down": { y: -1 },
			"fade-left": { x: 1 },
			"fade-right": { x: -1 },
			scale: { scale: 0.92 },
			blur: { blur: 8 },
			zoom: { scale: 0.85, blur: 12 },
		});
	});

	it("every PresetName is a valid PRESETS key (type and runtime agree)", () => {
		const all: PresetName[] = [...PRESET_NAMES];
		for (const name of all) {
			expect(PRESETS[name]).toBeDefined();
		}
	});

	it("RevealPresetName is PresetName without blur/zoom (a mismatch fails pnpm check, not this assertion)", () => {
		const revealNames: RevealPresetName[] = PRESET_NAMES.filter(
			(name): name is RevealPresetName => name !== "blur" && name !== "zoom"
		);
		expect(revealNames).toEqual([
			"fade",
			"fade-up",
			"fade-down",
			"fade-left",
			"fade-right",
			"scale",
		]);
	});
});
