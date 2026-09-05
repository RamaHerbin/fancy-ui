import { describe, expect, it } from "vitest";
import type { HapticPattern, PresetName, RevealPresetName, StaggerFrom } from "./types.js";

describe("types.ts", () => {
	it("is a type-only re-export — compiles to an empty JS module, no runtime values", async () => {
		const mod: Record<string, unknown> = await import("./types.js");
		expect(Object.keys(mod)).toEqual([]);
	});

	it("re-exports stay assignable to their source unions (compile-time; drift fails pnpm check, not this assertion)", () => {
		const preset: PresetName = "fade";
		const revealPreset: RevealPresetName = "fade-up";
		const staggerFrom: StaggerFrom = "first";
		const haptic: HapticPattern = "light";

		expect([preset, revealPreset, staggerFrom, haptic]).toEqual([
			"fade",
			"fade-up",
			"first",
			"light",
		]);
	});
});
