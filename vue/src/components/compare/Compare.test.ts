import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { nextTick } from "vue";
import Compare, { beamPalette, beamStep, keyStep, COMPARE_BEAM_COLORS } from "./Compare.vue";

describe("Compare", () => {
	afterEach(cleanup);

	it('renders a container with role="slider"', () => {
		const { container } = render(Compare);
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toBeInTheDocument();
	});

	it("has overflow-hidden class", () => {
		const { container } = render(Compare);
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("overflow-hidden");
	});

	it("renders image elements when image props are provided", () => {
		const { container } = render(Compare, {
			props: { firstImage: "/a.jpg", secondImage: "/b.jpg" },
		});
		const imgs = container.querySelectorAll("img");
		expect(imgs.length).toBeGreaterThanOrEqual(2);
	});

	it("sets correct src and alt on first image", () => {
		const { container } = render(Compare, {
			props: { firstImage: "/a.jpg", firstImageAlt: "Before" },
		});
		const imgs = container.querySelectorAll("img");
		const firstImg = Array.from(imgs).find((img) => img.getAttribute("alt") === "Before");
		expect(firstImg).toHaveAttribute("src", "/a.jpg");
	});

	it("sets correct src and alt on second image", () => {
		const { container } = render(Compare, {
			props: { secondImage: "/b.jpg", secondImageAlt: "After" },
		});
		const imgs = container.querySelectorAll("img");
		const secondImg = Array.from(imgs).find((img) => img.getAttribute("alt") === "After");
		expect(secondImg).toHaveAttribute("src", "/b.jpg");
	});

	it("applies custom class names", () => {
		const { container } = render(Compare, { props: { class: "my-compare" } });
		const div = container.firstElementChild as HTMLElement;
		expect(div?.className).toContain("my-compare");
	});

	it("has aria-valuenow set to initial slider percentage", () => {
		const { container } = render(Compare, {
			props: { initialSliderPercentage: 75 },
		});
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toHaveAttribute("aria-valuenow", "75");
	});

	it("has aria-valuemin and aria-valuemax attributes", () => {
		const { container } = render(Compare);
		const slider = container.querySelector('[role="slider"]');
		expect(slider).toHaveAttribute("aria-valuemin", "0");
		expect(slider).toHaveAttribute("aria-valuemax", "100");
	});

	it("calls the deprecated lowercase callbacks passed as props; the run-together @-spellings (onDragstart…) are undeclared and never reach them", async () => {
		const names = [
			"onpercentagechange",
			"ondragstart",
			"ondragend",
			"onhoverenter",
			"onhoverleave",
		];
		const lower = Object.fromEntries(names.map((n) => [n, vi.fn()]));
		// `@dragstart` compiles to `onDragstart`, an undeclared attr (the declared name is `onDragStart`, i.e. `@drag-start`).
		const camel = Object.fromEntries(
			names.map((n) => ["on" + n[2]!.toUpperCase() + n.slice(3), vi.fn()])
		);
		const { container } = render(Compare, {
			props: { slideMode: "drag", ...lower },
			attrs: camel,
		});
		const slider = container.querySelector('[role="slider"]')!;
		await fireEvent.mouseEnter(slider);
		await fireEvent.mouseDown(slider);
		await fireEvent.mouseUp(slider);
		await fireEvent.mouseLeave(slider);
		for (const n of ["ondragstart", "ondragend", "onhoverenter", "onhoverleave"]) {
			expect(lower[n], n).toHaveBeenCalledTimes(1);
		}
		for (const fn of Object.values(camel)) expect(fn).not.toHaveBeenCalled();
	});

	it("glides back to the resting percentage through :onpercentagechange on hover leave", async () => {
		const queue = new Map<number, FrameRequestCallback>();
		let nextId = 1;
		vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
			const id = nextId++;
			queue.set(id, cb);
			return id;
		});
		vi.stubGlobal("cancelAnimationFrame", (id: number) => {
			queue.delete(id);
		});
		try {
			const onpercentagechange = vi.fn();
			const { container } = render(Compare, {
				props: { initialSliderPercentage: 30, onpercentagechange },
			});
			const slider = container.querySelector('[role="slider"]')!;
			onpercentagechange.mockClear();
			await fireEvent.mouseEnter(slider);
			await fireEvent.mouseLeave(slider);
			// the glide runs on frames; one frame past its 520 ms lands it
			const pending = [...queue.values()];
			queue.clear();
			for (const cb of pending) cb(performance.now() + 1000);
			expect(onpercentagechange).toHaveBeenLastCalledWith(30);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	describe("camelCase listeners", () => {
		it("calls onDragStart, onDragEnd and onHoverLeave once each", async () => {
			const onDragStart = vi.fn();
			const onDragEnd = vi.fn();
			const onHoverLeave = vi.fn();
			const { container } = render(Compare, {
				props: { slideMode: "drag" },
				attrs: { onDragStart, onDragEnd, onHoverLeave },
			});
			const slider = container.querySelector('[role="slider"]')!;
			await fireEvent.mouseEnter(slider);
			await fireEvent.mouseDown(slider);
			expect(onDragStart).toHaveBeenCalledTimes(1);
			await fireEvent.mouseUp(slider);
			expect(onDragEnd).toHaveBeenCalledTimes(1);
			await fireEvent.mouseLeave(slider);
			expect(onHoverLeave).toHaveBeenCalledTimes(1);
			expect(onDragStart).toHaveBeenCalledTimes(1);
			expect(onDragEnd).toHaveBeenCalledTimes(1);
		});

		it("calls onPercentageChange, and the lowercase alias only when it is absent", async () => {
			const queue = new Map<number, FrameRequestCallback>();
			let nextId = 1;
			vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
				const id = nextId++;
				queue.set(id, cb);
				return id;
			});
			vi.stubGlobal("cancelAnimationFrame", (id: number) => {
				queue.delete(id);
			});
			try {
				const onPercentageChange = vi.fn();
				const onpercentagechange = vi.fn();
				const { container } = render(Compare, {
					props: { initialSliderPercentage: 30, onpercentagechange },
					attrs: { onPercentageChange },
				});
				const slider = container.querySelector('[role="slider"]')!;
				onPercentageChange.mockClear();
				await fireEvent.mouseEnter(slider);
				await fireEvent.mouseLeave(slider);
				const pending = [...queue.values()];
				queue.clear();
				for (const cb of pending) cb(performance.now() + 1000);
				expect(onPercentageChange).toHaveBeenLastCalledWith(30);
				expect(onpercentagechange).not.toHaveBeenCalled();
			} finally {
				vi.unstubAllGlobals();
			}
		});

		it("still calls the deprecated lowercase drag / hover props once", async () => {
			const ondragstart = vi.fn();
			const ondragend = vi.fn();
			const onhoverleave = vi.fn();
			const { container } = render(Compare, {
				props: { slideMode: "drag", ondragstart, ondragend, onhoverleave },
			});
			const slider = container.querySelector('[role="slider"]')!;
			await fireEvent.mouseEnter(slider);
			await fireEvent.mouseDown(slider);
			await fireEvent.mouseUp(slider);
			await fireEvent.mouseLeave(slider);
			expect(ondragstart).toHaveBeenCalledTimes(1);
			expect(ondragend).toHaveBeenCalledTimes(1);
			expect(onhoverleave).toHaveBeenCalledTimes(1);
		});
	});

	describe("autoplay runs a single frame loop", () => {
		let queue: Map<number, FrameRequestCallback>;
		let nextId: number;

		function flushFrame(): void {
			const pending = [...queue.values()];
			queue.clear();
			for (const cb of pending) cb(performance.now());
		}

		function stubRaf(): void {
			queue = new Map();
			nextId = 1;
			vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
				const id = nextId++;
				queue.set(id, cb);
				return id;
			});
			vi.stubGlobal("cancelAnimationFrame", (id: number) => {
				queue.delete(id);
			});
		}

		afterEach(() => {
			vi.unstubAllGlobals();
		});

		// the beam keeps its own frame loop next to autoplay's, so a single
		// autoplay loop shows as one report per flushed frame
		it("runs one autoplay loop at mount and reports once per frame", async () => {
			stubRaf();
			const onpercentagechange = vi.fn();
			render(Compare, { props: { autoplay: true, onpercentagechange } });
			await nextTick();
			onpercentagechange.mockClear();
			flushFrame();
			expect(onpercentagechange).toHaveBeenCalledTimes(1);
			flushFrame();
			expect(onpercentagechange).toHaveBeenCalledTimes(2);
		});

		it("keeps one loop after a hover leave and after a watched prop restarts it", async () => {
			stubRaf();
			const onpercentagechange = vi.fn();
			const { container, rerender } = render(Compare, {
				props: { autoplay: true, autoplayDuration: 5000, onpercentagechange },
			});
			await nextTick();
			const slider = container.querySelector('[role="slider"]')!;
			await fireEvent.mouseEnter(slider);
			onpercentagechange.mockClear();
			flushFrame();
			expect(onpercentagechange).not.toHaveBeenCalled();
			await fireEvent.mouseLeave(slider);
			onpercentagechange.mockClear();
			flushFrame();
			expect(onpercentagechange).toHaveBeenCalledTimes(1);
			await rerender({ autoplay: true, autoplayDuration: 2000, onpercentagechange });
			onpercentagechange.mockClear();
			flushFrame();
			expect(onpercentagechange).toHaveBeenCalledTimes(1);
		});

		it("leaves no frame scheduled after unmount", async () => {
			stubRaf();
			const { unmount } = render(Compare, { props: { autoplay: true } });
			await nextTick();
			unmount();
			expect(queue.size).toBe(0);
		});
	});

	it("renders the HDR overlay canvas only where WebGPU and an HDR display exist", async () => {
		// jsdom: no navigator.gpu, so no canvas at all.
		const sdr = render(Compare);
		await nextTick();
		expect(sdr.container.querySelector("canvas")).toBeNull();
		cleanup();

		vi.stubGlobal("navigator", { ...navigator, gpu: {} });
		vi.stubGlobal("matchMedia", (query: string) => ({
			matches: query === "(dynamic-range: high)",
			media: query,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
		}));
		const on = render(Compare, { props: { hdr: true } });
		await nextTick();
		const canvas = on.container.querySelector("canvas");
		expect(canvas).not.toBeNull();
		// The light itself never starts without a real adapter: no flag.
		expect(on.container.querySelector("[data-hdr]")).toBeNull();
		cleanup();
		// Beta: off by default, even where it could run.
		const off = render(Compare);
		await nextTick();
		expect(off.container.querySelector("canvas")).toBeNull();
		vi.unstubAllGlobals();
	});
});

describe("Compare beam", () => {
	afterEach(cleanup);

	it("renders the beam layers and a glass handle", () => {
		const { container } = render(Compare);
		for (const part of ["glow", "trail", "fringe", "core", "pulse"]) {
			expect(container.querySelector(`.compare-beam__${part}`)).toBeInTheDocument();
		}
		expect(container.querySelector(".compare-handle")).toBeInTheDocument();
	});

	it("hides the handle when showHandlebar is false", () => {
		const { container } = render(Compare, { props: { showHandlebar: false } });
		expect(container.querySelector(".compare-handle")).toBeNull();
	});

	it("sets the beam colours as CSS variables", () => {
		const { container } = render(Compare, { props: { beamColors: ["red", "lime", "blue"] } });
		const root = container.querySelector('[role="slider"]') as HTMLElement;
		expect(root.style.getPropertyValue("--cmp-c1")).toBe("red");
		expect(root.style.getPropertyValue("--cmp-c2")).toBe("lime");
		expect(root.style.getPropertyValue("--cmp-c3")).toBe("blue");
	});

	it("has an accessible name", () => {
		const { container } = render(Compare, { props: { label: "Before and after" } });
		expect(container.querySelector('[role="slider"]')).toHaveAttribute(
			"aria-label",
			"Before and after"
		);
	});

	it("moves with the arrow keys, Shift for big steps, Home/End for the ends", async () => {
		const seen: number[] = [];
		const { container } = render(Compare, {
			props: { onpercentagechange: (p: number) => seen.push(p) },
		});
		const slider = container.querySelector('[role="slider"]') as HTMLElement;
		await fireEvent.keyDown(slider, { key: "ArrowRight" });
		expect(slider).toHaveAttribute("aria-valuenow", "52");
		await fireEvent.keyDown(slider, { key: "ArrowLeft", shiftKey: true });
		expect(slider).toHaveAttribute("aria-valuenow", "42");
		await fireEvent.keyDown(slider, { key: "End" });
		expect(slider).toHaveAttribute("aria-valuenow", "100");
		await fireEvent.keyDown(slider, { key: "Home" });
		expect(slider).toHaveAttribute("aria-valuenow", "0");
		expect(seen).toEqual([52, 42, 100, 0]);
	});
});

describe("beamPalette", () => {
	it("falls back to the default colours", () => {
		expect(beamPalette(undefined)).toEqual(COMPARE_BEAM_COLORS);
		expect(beamPalette([])).toEqual(COMPARE_BEAM_COLORS);
	});

	it("spreads one, two or many colours over three slots", () => {
		expect(beamPalette(["red"])).toEqual(["red", "red", "red"]);
		expect(beamPalette(["red", "blue"])).toEqual(["red", "color-mix(in srgb, red, blue)", "blue"]);
		expect(beamPalette(["a", "b", "c", "d", "e"])).toEqual(["a", "c", "e"]);
	});
});

describe("beamStep", () => {
	it("stretches the trail with speed, on the side of the motion", () => {
		expect(beamStep(0, 0, 10, 0).trail).toBeGreaterThan(0);
		expect(beamStep(0, 0, -10, 0).trail).toBeLessThan(0);
	});

	it("caps the trail and lets it settle to zero", () => {
		expect(beamStep(0, 0, 1000, 0).trail).toBe(140);
		let s = { trail: 60, energy: 0 };
		for (let i = 0; i < 200; i++) s = beamStep(s.trail, s.energy, 0, 0);
		expect(s.trail).toBe(0);
	});

	it("eases the energy toward its target, kicked up by speed", () => {
		let s = { trail: 0, energy: 0 };
		for (let i = 0; i < 200; i++) s = beamStep(s.trail, s.energy, 0, 1);
		expect(s.energy).toBeCloseTo(1, 2);
		expect(beamStep(0, 0, 20, 0).energy).toBeGreaterThan(0);
	});
});

describe("keyStep", () => {
	it("maps keys to positions and clamps", () => {
		expect(keyStep("ArrowRight", false, 99)).toBe(100);
		expect(keyStep("ArrowLeft", true, 5)).toBe(0);
		expect(keyStep("PageUp", false, 50)).toBe(60);
		expect(keyStep("Enter", false, 50)).toBeNull();
	});
});

describe("Compare touch", () => {
	afterEach(cleanup);

	it("keeps vertical page scroll while a horizontal drag stays ours", () => {
		const { container } = render(Compare);
		const slider = container.querySelector('[role="slider"]') as HTMLElement;
		expect(slider.className).toContain("touch-pan-y");
		expect(slider.className).toContain("touch-pinch-zoom");
	});
});
