import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createBgStars, generateStars } from "./bg-stars-core.js";

function makeElements() {
	const host = document.createElement("div");
	const parallax = document.createElement("div");
	host.appendChild(parallax);
	document.body.appendChild(host);
	return { host, parallax };
}

describe("generateStars", () => {
	it("produces one box-shadow entry per star, comma-separated", () => {
		const value = generateStars(5, "#fff", () => 0.5);
		expect(value.split(", ")).toHaveLength(5);
	});

	it("uses the given color for every entry", () => {
		const value = generateStars(3, "#abc", () => 0.5);
		for (const entry of value.split(", ")) {
			expect(entry.endsWith("#abc")).toBe(true);
		}
	});

	it("is deterministic for a deterministic random source", () => {
		const a = generateStars(10, "#fff", () => 0.25);
		const b = generateStars(10, "#fff", () => 0.25);
		expect(a).toBe(b);
	});

	it("keeps coordinates within the original +/-2000px range", () => {
		const value = generateStars(50, "#fff", Math.random);
		for (const entry of value.split(", ")) {
			const [x, y] = entry.split("px");
			expect(Number(x)).toBeGreaterThanOrEqual(-2000);
			expect(Number(x)).toBeLessThan(2000);
			expect(Number(y.trimStart())).toBeGreaterThanOrEqual(-2000);
		}
	});
});

describe("createBgStars", () => {
	let rafSpy: ReturnType<typeof vi.spyOn>;
	let cafSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		rafSpy = vi.spyOn(globalThis, "requestAnimationFrame").mockImplementation(() => 1 as unknown as number);
		cafSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
	});

	afterEach(() => {
		rafSpy.mockRestore();
		cafSpy.mockRestore();
		document.body.innerHTML = "";
	});

	it("never returns null (no context/API to fail on for a DOM-transform engine)", () => {
		const el = makeElements();
		const engine = createBgStars(el, {});
		expect(engine).not.toBeNull();
	});

	it("starts the rAF loop on creation", () => {
		const el = makeElements();
		createBgStars(el, {});
		expect(rafSpy).toHaveBeenCalled();
	});

	it("applies an initial transform to the parallax element", () => {
		const el = makeElements();
		createBgStars(el, {});
		expect(el.parallax.style.transform).toBe("translate(0px, 0px)");
	});

	it("setOptions applies each live key without throwing", () => {
		const el = makeElements();
		const engine = createBgStars(el, { factor: 0.05, stiffness: 50, damping: 20 })!;
		expect(() => engine.setOptions({ factor: 0.1 })).not.toThrow();
		expect(() => engine.setOptions({ stiffness: 80 })).not.toThrow();
		expect(() => engine.setOptions({ damping: 40 })).not.toThrow();
	});

	it("mousemove on the host updates the spring target and moves the parallax transform on the next tick", () => {
		const el = makeElements();
		let tick: FrameRequestCallback | undefined;
		rafSpy.mockImplementation((cb: FrameRequestCallback) => {
			tick = cb;
			return 1 as unknown as number;
		});
		// Mild stiffness/no damping-driven oscillation: one tick moves toward the target.
		createBgStars(el, { factor: 1, stiffness: 50, damping: 20 });

		Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
		el.host.dispatchEvent(new MouseEvent("mousemove", { clientX: 600, clientY: 500, bubbles: true }));

		expect(tick).toBeDefined();
		tick!(0);

		expect(el.parallax.style.transform).not.toBe("translate(0px, 0px)");
	});

	it("resize is safe to call before and after destroy", () => {
		const el = makeElements();
		const engine = createBgStars(el, {})!;
		expect(() => engine.resize()).not.toThrow();
		engine.destroy();
		expect(() => engine.resize()).not.toThrow();
	});

	it("destroy cancels the rAF loop and is idempotent", () => {
		const el = makeElements();
		const engine = createBgStars(el, {})!;
		engine.destroy();
		expect(cafSpy).toHaveBeenCalledTimes(1);
		expect(() => engine.destroy()).not.toThrow();
		expect(cafSpy).toHaveBeenCalledTimes(1);
	});

	it("destroy removes the mousemove listener (no further transform changes)", () => {
		const el = makeElements();
		let tick: FrameRequestCallback | undefined;
		rafSpy.mockImplementation((cb: FrameRequestCallback) => {
			tick = cb;
			return 1 as unknown as number;
		});
		const engine = createBgStars(el, { factor: 1, stiffness: 1000, damping: 0 })!;
		engine.destroy();

		const before = el.parallax.style.transform;
		el.host.dispatchEvent(new MouseEvent("mousemove", { clientX: 999, clientY: 999, bubbles: true }));
		if (tick) tick(0);
		expect(el.parallax.style.transform).toBe(before);
	});

	it("setOptions after destroy does not throw", () => {
		const el = makeElements();
		const engine = createBgStars(el, {})!;
		engine.destroy();
		expect(() => engine.setOptions({ factor: 0.2 })).not.toThrow();
	});
});
