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
			expect(Number(y!.trimStart())).toBeGreaterThanOrEqual(-2000);
		}
	});
});

describe("createBgStars", () => {
	// Every engine listens on `document`; one left alive would keep answering
	// the visibility events of the tests that follow.
	const engines: Array<NonNullable<ReturnType<typeof createBgStars>>> = [];
	const create: typeof createBgStars = (...args) => {
		const engine = createBgStars(...args);
		if (engine) engines.push(engine);
		return engine;
	};

	let rafSpy: ReturnType<typeof vi.spyOn>;
	let cafSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		rafSpy = vi
			.spyOn(globalThis, "requestAnimationFrame")
			.mockImplementation(() => 1 as unknown as number);
		cafSpy = vi.spyOn(globalThis, "cancelAnimationFrame").mockImplementation(() => {});
	});

	afterEach(() => {
		for (const engine of engines.splice(0)) engine.destroy();
		rafSpy.mockRestore();
		cafSpy.mockRestore();
		document.body.innerHTML = "";
	});

	it("never returns null (no context/API to fail on for a DOM-transform engine)", () => {
		const el = makeElements();
		const engine = create(el, {});
		expect(engine).not.toBeNull();
	});

	it("starts the rAF loop on creation", () => {
		const el = makeElements();
		create(el, {});
		expect(rafSpy).toHaveBeenCalled();
	});

	it("applies an initial transform to the parallax element", () => {
		const el = makeElements();
		create(el, {});
		expect(el.parallax.style.transform).toBe("translate(0px, 0px)");
	});

	it("setOptions applies each live key without throwing", () => {
		const el = makeElements();
		const engine = create(el, { factor: 0.05, stiffness: 50, damping: 20 })!;
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
		create(el, { factor: 1, stiffness: 50, damping: 20 });

		Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
		el.host.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 600, clientY: 500, bubbles: true })
		);

		expect(tick).toBeDefined();
		tick!(0);

		expect(el.parallax.style.transform).not.toBe("translate(0px, 0px)");
	});

	it("resize is safe to call before and after destroy", () => {
		const el = makeElements();
		const engine = create(el, {})!;
		expect(() => engine.resize()).not.toThrow();
		engine.destroy();
		expect(() => engine.resize()).not.toThrow();
	});

	it("destroy cancels the rAF loop and is idempotent", () => {
		const el = makeElements();
		const engine = create(el, {})!;
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
		const engine = create(el, { factor: 1, stiffness: 1000, damping: 0 })!;
		engine.destroy();

		const before = el.parallax.style.transform;
		el.host.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 999, clientY: 999, bubbles: true })
		);
		if (tick) tick(0);
		expect(el.parallax.style.transform).toBe(before);
	});

	it("setOptions after destroy does not throw", () => {
		const el = makeElements();
		const engine = create(el, {})!;
		engine.destroy();
		expect(() => engine.setOptions({ factor: 0.2 })).not.toThrow();
	});
	it("reducedMotion parks the parallax at rest, ignores the pointer, and resumes when cleared", () => {
		const el = makeElements();
		rafSpy.mockClear();
		const engine = create(el, { factor: 1, reducedMotion: true })!;
		expect(rafSpy).not.toHaveBeenCalled();
		expect(el.parallax.style.transform).toBe("translate(0px, 0px)");

		Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
		Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
		el.host.dispatchEvent(
			new MouseEvent("mousemove", { clientX: 600, clientY: 500, bubbles: true })
		);
		expect(rafSpy).not.toHaveBeenCalled();
		expect(el.parallax.style.transform).toBe("translate(0px, 0px)");

		engine.setOptions({ reducedMotion: false });
		expect(rafSpy).toHaveBeenCalledTimes(1);

		// Flipping to reduced mid-flight settles at once and cancels the pending frame.
		engine.setOptions({ reducedMotion: true });
		expect(cafSpy).toHaveBeenCalled();
		expect(el.parallax.style.transform).toBe("translate(0px, 0px)");
	});

	describe("idle behaviour", () => {
		/** A frame queue the test drains by hand, so "no frame pending" is observable. */
		function stubFrames() {
			let nextId = 0;
			const queue = new Map<number, FrameRequestCallback>();
			rafSpy.mockImplementation((cb: FrameRequestCallback) => {
				queue.set(++nextId, cb);
				return nextId;
			});
			cafSpy.mockImplementation((id: number) => {
				queue.delete(id);
			});
			return {
				get pending() {
					return queue.size;
				},
				/** Run up to `max` frames; returns how many actually ran. */
				drain(max: number) {
					let ran = 0;
					while (ran < max && queue.size > 0) {
						const [id, cb] = queue.entries().next().value!;
						queue.delete(id);
						cb(0);
						ran++;
					}
					return ran;
				},
			};
		}

		function withHidden(run: (setHidden: (value: boolean) => void) => void) {
			let hidden = false;
			Object.defineProperty(document, "hidden", { configurable: true, get: () => hidden });
			try {
				run((value) => {
					hidden = value;
					document.dispatchEvent(new Event("visibilitychange"));
				});
			} finally {
				delete (document as unknown as { hidden?: boolean }).hidden;
			}
		}

		it("parks once the spring is at rest instead of scheduling frames forever", () => {
			const frames = stubFrames();
			create(makeElements(), {});
			const ran = frames.drain(200);
			expect(ran).toBeLessThan(200);
			expect(frames.pending).toBe(0);
		});

		it("wakes on a pointer move, then lands exactly on the target and parks again", () => {
			const frames = stubFrames();
			const el = makeElements();
			create(el, { factor: 0.05 });
			frames.drain(200);
			expect(frames.pending).toBe(0);

			Object.defineProperty(window, "innerWidth", { value: 1000, configurable: true });
			Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
			el.host.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0, bubbles: true }));
			expect(frames.pending).toBe(1);
			// A second move while a frame is queued does not stack a second loop.
			el.host.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0, bubbles: true }));
			expect(frames.pending).toBe(1);

			const ran = frames.drain(2000);
			expect(ran).toBeLessThan(2000);
			expect(frames.pending).toBe(0);
			expect(el.parallax.style.transform).toBe("translate(25px, 20px)");
		});

		it("does not run while the page is hidden, and resumes when it is shown", () => {
			const frames = stubFrames();
			const el = makeElements();
			create(el, {});
			frames.drain(200);
			withHidden((setHidden) => {
				setHidden(true);
				el.host.dispatchEvent(
					new MouseEvent("mousemove", { clientX: 0, clientY: 0, bubbles: true })
				);
				expect(frames.pending).toBe(0);
				setHidden(false);
				expect(frames.pending).toBe(1);
			});
		});

		it("cancels the pending frame when the page is hidden mid-flight", () => {
			const frames = stubFrames();
			const el = makeElements();
			create(el, {});
			frames.drain(200);
			el.host.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0, bubbles: true }));
			expect(frames.pending).toBe(1);
			withHidden((setHidden) => {
				setHidden(true);
				expect(frames.pending).toBe(0);
			});
		});

		it("destroy removes the visibility listener: a later show schedules nothing", () => {
			const frames = stubFrames();
			const el = makeElements();
			const engine = create(el, {})!;
			el.host.dispatchEvent(new MouseEvent("mousemove", { clientX: 0, clientY: 0, bubbles: true }));
			engine.destroy();
			expect(frames.pending).toBe(0);
			withHidden((setHidden) => {
				setHidden(true);
				setHidden(false);
				expect(frames.pending).toBe(0);
			});
		});
	});
});
