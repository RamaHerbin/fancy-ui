import { describe, it, expect } from "vitest";
import { variantMap, ImageTrailVariantPixelated, type VariantType } from "./trail-variants.js";

describe("trail-variants pixelated", () => {
	it("accepts pixelated as a VariantType", () => {
		const variant: VariantType = "pixelated";
		expect(variant).toBe("pixelated");
	});

	it("has a pixelated entry in variantMap pointing at ImageTrailVariantPixelated", () => {
		expect(variantMap.pixelated).toBe(ImageTrailVariantPixelated);
	});

	it("keeps all 9 variant keys in variantMap", () => {
		expect(Object.keys(variantMap).sort()).toEqual(
			["type1", "type2", "type3", "type4", "type5", "type6", "type7", "type8", "pixelated"].sort()
		);
	});
});
