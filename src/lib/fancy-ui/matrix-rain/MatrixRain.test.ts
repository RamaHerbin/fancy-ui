import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import MatrixRain from "./MatrixRain.svelte";

describe("MatrixRain", () => {
	afterEach(cleanup);

	it("renders a canvas element", () => {
		const { container } = render(MatrixRain);
		expect(container.querySelector("canvas")).toBeTruthy();
	});

	it("applies the base fill/background classes", () => {
		const { container } = render(MatrixRain);
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas.className).toContain("block");
		expect(canvas.className).toContain("h-full");
		expect(canvas.className).toContain("w-full");
		expect(canvas.className).toContain("bg-black");
	});

	it("applies custom class names alongside the base classes", () => {
		const { container } = render(MatrixRain, { props: { class: "my-rain" } });
		const canvas = container.querySelector("canvas") as HTMLElement;
		expect(canvas.className).toContain("my-rain");
		expect(canvas.className).toContain("block");
	});

	it("mounts and unmounts without throwing when getContext('2d') is unavailable (jsdom has no canvas backend)", () => {
		const { unmount } = render(MatrixRain, {
			props: { color: "#ff00ff", speed: 2, density: 0.5, glyphSize: 20, fadeOpacity: 0.1 },
		});
		expect(() => unmount()).not.toThrow();
	});
});
