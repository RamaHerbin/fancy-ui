import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	clampPan,
	createStoryThread,
	curvePath,
	dashPattern,
	keyStep,
	lengthAtAxis,
	panTip,
	reachedIds,
	resolveSegments,
	segmentSpan,
	spacerHeight,
	spanProgress,
	tipPosition,
} from "./story-thread-core.js";

describe("story-thread geometry", () => {
	it("draws a cubic per gap with tangents flat along the axis", () => {
		const d = curvePath(
			[
				{ x: 0, y: 0 },
				{ x: 100, y: 50 },
			],
			"x",
			0.5
		);
		expect(d).toBe("M 0 0 C 50 0 50 50 100 50");
		const v = curvePath(
			[
				{ x: 0, y: 0 },
				{ x: 40, y: 100 },
			],
			"y",
			0.5
		);
		expect(v).toBe("M 0 0 C 0 50 40 50 40 100");
		expect(curvePath([{ x: 1, y: 1 }], "x")).toBe("");
	});

	it("defaults to one segment in document order and drops missing ids", () => {
		const pts = { a: { x: 0, y: 0 }, b: { x: 10, y: 0 }, c: { x: 20, y: 0 } };
		expect(resolveSegments([], ["a", "b", "c"], pts)).toEqual([
			{ ids: ["a", "b", "c"], points: [pts.a, pts.b, pts.c], color: undefined },
		]);
		const segs = resolveSegments(
			[{ nodes: ["a", "zz", "c"], color: "red" }, { nodes: ["b", "nope"] }],
			[],
			pts
		);
		expect(segs).toHaveLength(1);
		expect(segs[0]).toMatchObject({ ids: ["a", "c"], color: "red" });
	});

	it("measures spans and progress along the axis", () => {
		const span = segmentSpan(
			[
				{ x: 100, y: 0 },
				{ x: 300, y: 9 },
			],
			"x"
		);
		expect(span).toEqual([100, 300]);
		expect(spanProgress(50, span)).toBe(0);
		expect(spanProgress(200, span)).toBe(0.5);
		expect(spanProgress(900, span)).toBe(1);
		expect(spanProgress(10, [5, 5])).toBe(1);
	});

	it("places the tip and pans the track", () => {
		expect(tipPosition(100, 1000, 0.7)).toBe(800);
		expect(tipPosition(0, 1000, 4)).toBe(1000);
		expect(spacerHeight(3000, 1000, 800)).toBe(2800);
		expect(spacerHeight(500, 1000, 800)).toBe(800);
		expect(clampPan(-20, 3000, 1000)).toBe(0);
		expect(clampPan(2500, 3000, 1000)).toBe(2000);
		expect(keyStep(1000, -1)).toBe(-850);
	});

	it("brings the tip to the end of the track when the pan ends", () => {
		expect(panTip(0, 2000, 1000, 3000, 0.7)).toBe(700);
		expect(panTip(2000, 2000, 1000, 3000, 0.7)).toBe(3000);
		expect(panTip(1000, 2000, 1000, 3000, 0.7)).toBe(1850);
		expect(panTip(0, 0, 1000, 600, 0.7)).toBe(600);
	});

	it("maps an axis position to a path length", () => {
		const samples: [number, number][] = [
			[0, 0],
			[10, 5],
			[20, 20],
		];
		expect(lengthAtAxis(samples, -3)).toBe(0);
		expect(lengthAtAxis(samples, 5)).toBe(10);
		expect(lengthAtAxis(samples, 12.5)).toBe(15);
		expect(lengthAtAxis(samples, 99)).toBe(20);
		expect(lengthAtAxis([], 3)).toBe(0);
	});

	it("lists reached nodes and dash patterns", () => {
		const pts = { a: { x: 0, y: 10 }, b: { x: 0, y: 20 }, c: { x: 0, y: 30 } };
		expect([...reachedIds(pts, 20, "y")]).toEqual(["a", "b"]);
		expect(dashPattern("dotted")).toBe("0.5 11");
		expect(dashPattern("dashed")).toBe("10 12");
		expect(dashPattern("solid")).toBeNull();
	});
});

describe("createStoryThread", () => {
	let frames: FrameRequestCallback[] = [];
	const flush = () => {
		for (let i = 0; i < 5 && frames.length; i++) {
			const run = frames;
			frames = [];
			run.forEach((cb) => cb(0));
		}
	};
	let scroll = 0;

	function rect(x: number, y: number, w = 0, h = 0): DOMRect {
		return {
			left: x,
			top: y,
			x,
			y,
			width: w,
			height: h,
			right: x + w,
			bottom: y + h,
			toJSON() {},
		} as DOMRect;
	}

	function mount(ys: Record<string, number>) {
		const root = document.createElement("div");
		const viewport = document.createElement("div");
		const track = document.createElement("div");
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		track.appendChild(svg);
		for (const id of Object.keys(ys)) {
			const node = document.createElement("span");
			node.dataset.storyNode = id;
			node.getBoundingClientRect = () => rect(50, ys[id] - scroll);
			track.appendChild(node);
		}
		track.getBoundingClientRect = () => rect(0, -scroll, 400, 2000);
		root.getBoundingClientRect = () => rect(0, -scroll, 400, 2000);
		viewport.appendChild(track);
		root.appendChild(viewport);
		document.body.appendChild(root);
		return { root, viewport, track, svg };
	}

	beforeEach(() => {
		frames = [];
		scroll = 0;
		vi.spyOn(window, "requestAnimationFrame").mockImplementation((cb) => {
			frames.push(cb);
			return frames.length;
		});
		vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {});
		Object.defineProperty(window, "innerHeight", { value: 800, configurable: true });
	});

	afterEach(() => {
		document.body.innerHTML = "";
		vi.restoreAllMocks();
	});

	it("marks reached nodes and reports each forward crossing once", () => {
		const { root, viewport, track, svg } = mount({ a: 100, b: 600, c: 1200 });
		const onReach = vi.fn();
		const core = createStoryThread(root, viewport, track, svg, {
			layout: "vertical",
			lead: 0.5,
			onReach,
		});
		const node = (id: string) => track.querySelector(`[data-story-node="${id}"]`)!;
		// tip = 400: only `a`, and the first paint reports nothing.
		expect(root.dataset.layout).toBe("vertical");
		expect(node("a").hasAttribute("data-reached")).toBe(true);
		expect(node("b").hasAttribute("data-reached")).toBe(false);
		expect(onReach).not.toHaveBeenCalled();

		scroll = 300; // tip = 700
		window.dispatchEvent(new Event("scroll"));
		flush();
		expect(node("b").hasAttribute("data-reached")).toBe(true);
		expect(onReach).toHaveBeenCalledTimes(1);
		expect(onReach).toHaveBeenCalledWith("b");

		scroll = 0;
		window.dispatchEvent(new Event("scroll"));
		flush();
		expect(node("b").hasAttribute("data-reached")).toBe(false);
		expect(onReach).toHaveBeenCalledTimes(1);

		scroll = 900; // tip = 1300
		window.dispatchEvent(new Event("scroll"));
		flush();
		expect(onReach.mock.calls.map((c) => c[0])).toEqual(["b", "b", "c"]);

		core.destroy();
		expect(node("c").hasAttribute("data-reached")).toBe(false);
		expect(svg.childNodes).toHaveLength(0);
		expect(root.dataset.layout).toBeUndefined();
	});

	it("draws a ghost, a masked bright copy and a head per segment", () => {
		const { root, viewport, track, svg } = mount({ a: 100, s: 300, x: 500, y: 520, z: 900 });
		createStoryThread(root, viewport, track, svg, {
			layout: "vertical",
			segments: [
				{ nodes: ["a", "s"] },
				{ nodes: ["s", "x", "z"], color: "red" },
				{ nodes: ["s", "y", "z"] },
			],
		});
		expect(svg.querySelectorAll(".st-ghost")).toHaveLength(3);
		const brights = svg.querySelectorAll(".st-bright");
		expect(brights).toHaveLength(3);
		expect(brights[1].getAttribute("style")).toContain("--st-seg: red");
		expect(svg.querySelectorAll(".st-head")).toHaveLength(3);
		const masks = [...svg.querySelectorAll("mask")].map((m) => m.id);
		expect(new Set(masks).size).toBe(3);
		expect(brights[0].getAttribute("mask")).toBe(`url(#${masks[0]})`);
		expect(brights[0].getAttribute("stroke-dasharray")).toBe("0.5 11");
	});

	it("re-draws when the segments change", () => {
		const { root, viewport, track, svg } = mount({ a: 100, b: 300, c: 500 });
		const core = createStoryThread(root, viewport, track, svg, { layout: "vertical" });
		expect(svg.querySelectorAll(".st-bright")).toHaveLength(1);
		core.update({ segments: [{ nodes: ["a", "b"] }, { nodes: ["a", "c"] }], dash: "solid" });
		flush();
		expect(svg.querySelectorAll(".st-bright")).toHaveLength(2);
		expect(svg.querySelector(".st-bright")!.hasAttribute("stroke-dasharray")).toBe(false);
	});
});
