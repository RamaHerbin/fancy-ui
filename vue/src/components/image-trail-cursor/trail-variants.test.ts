import { describe, it, expect, vi, afterEach } from "vitest";
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

describe("trail-variants RAF loop", () => {
	function mountContainer(imageCount: number): HTMLDivElement {
		const container = document.createElement("div");
		for (let i = 0; i < imageCount; i++) {
			const img = document.createElement("div");
			img.className = "content__img";
			const inner = document.createElement("div");
			inner.className = "content__img-inner";
			img.appendChild(inner);
			container.appendChild(img);
		}
		document.body.appendChild(container);
		return container;
	}

	afterEach(() => {
		vi.restoreAllMocks();
		document.body.innerHTML = "";
	});

	it("does not start a requestAnimationFrame loop when there are no trail images", () => {
		const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
		const container = mountContainer(0);
		const instance = new variantMap.type1(container);

		container.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 10 }));
		container.dispatchEvent(new MouseEvent("mousemove", { clientX: 200, clientY: 200 }));

		expect(raf).not.toHaveBeenCalled();
		instance.destroy();
	});

	it("starts the requestAnimationFrame loop on first move when trail images exist", () => {
		const raf = vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
		const container = mountContainer(2);
		const instance = new variantMap.type1(container);

		container.dispatchEvent(new MouseEvent("mousemove", { clientX: 10, clientY: 10 }));

		expect(raf).toHaveBeenCalledTimes(1);
		instance.destroy();
	});
});
