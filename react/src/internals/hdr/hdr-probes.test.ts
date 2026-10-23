import { afterEach, describe, expect, it, vi } from "vitest";
import {
	conicBorderPoint,
	conicBorderProbe,
	meteorsProbe,
	packetProbe,
	riderProbe,
} from "./hdr-probes.js";

afterEach(() => {
	vi.unstubAllGlobals();
	document.body.innerHTML = "";
});

const ctx = { width: 200, height: 100, now: 0, peak: 4.9 };

function rect(el: Element, x: number, y: number, w: number, h: number) {
	el.getBoundingClientRect = () =>
		({ left: x, top: y, right: x + w, bottom: y + h, width: w, height: h, x, y }) as DOMRect;
}

describe("conicBorderPoint", () => {
	it("follows a conic gradient's angles: 0 up, clockwise", () => {
		expect(conicBorderPoint(200, 100, 0)).toEqual({ x: 100, y: 0 });
		const right = conicBorderPoint(200, 100, 90);
		expect(right.x).toBeCloseTo(200, 6);
		expect(right.y).toBeCloseTo(50, 6);
		const down = conicBorderPoint(200, 100, 180);
		expect(down.x).toBeCloseTo(100, 6);
		expect(down.y).toBeCloseTo(100, 6);
	});

	it("respects the border inset and pulls corner hits onto the rounded arc", () => {
		expect(conicBorderPoint(200, 100, 0, 0, 2).y).toBeCloseTo(2, 6);
		const square = conicBorderPoint(100, 100, 45, 0);
		const round = conicBorderPoint(100, 100, 45, 20);
		expect(square.x).toBeCloseTo(100, 6);
		expect(round.x).toBeLessThan(100);
		// On the arc of radius 20 centred at (80, 20).
		expect(Math.hypot(round.x - 80, round.y - 20)).toBeCloseTo(20, 6);
	});
});

describe("conicBorderProbe", () => {
	it("reads the live animated angle and lights the arc after it", () => {
		const el = document.createElement("div");
		el.style.setProperty("--a", "90deg");
		document.body.appendChild(el);
		const probe = conicBorderProbe({
			angleFrom: el,
			angleVar: "--a",
			radius: () => 0,
			arcs: () => [{ from: 0, to: 3, color: () => "#fff", intensity: () => 2 }],
		});
		const lights = probe(ctx);
		expect(lights.length).toBeGreaterThan(0);
		// 90deg = the middle of the right edge; the first segment starts there.
		expect(lights[0]!.x0).toBeCloseTo(200, 6);
		expect(lights[0]!.y0).toBeCloseTo(50, 6);
	});

	it("draws nothing at zero level or without the variable", () => {
		const el = document.createElement("div");
		document.body.appendChild(el);
		const arcs = () => [{ from: 0, to: 10, color: () => "#fff", intensity: () => 2 }];
		expect(
			conicBorderProbe({ angleFrom: el, angleVar: "--a", radius: () => 0, arcs })(ctx)
		).toEqual([]);
		el.style.setProperty("--a", "0deg");
		const off = conicBorderProbe({
			angleFrom: el,
			angleVar: "--a",
			radius: () => 0,
			arcs,
			level: () => 0,
		});
		expect(off(ctx)).toEqual([]);
	});
});

describe("riderProbe", () => {
	it("puts the head at the rider's live box centre, relative to the host", () => {
		const host = document.createElement("div");
		const rider = document.createElement("span");
		host.appendChild(rider);
		document.body.appendChild(host);
		rect(host, 100, 50, 200, 100);
		rect(rider, 140, 50, 10, 4);
		const probe = riderProbe({ host, rider, color: () => "#8ec5ff", intensity: () => 4 });
		const [head] = probe(ctx);
		expect(head).toMatchObject({ x0: 45, y0: 2, intensity: 4 });
	});

	it("maps the head into the host's local space when the host is scaled", () => {
		const host = document.createElement("div");
		const rider = document.createElement("span");
		host.appendChild(rider);
		document.body.appendChild(host);
		// Laid out at 200 x 100 (ctx), drawn at half size by a transform.
		rect(host, 100, 50, 100, 50);
		rect(rider, 145, 50, 10, 4);
		const probe = riderProbe({ host, rider, color: () => "#fff", intensity: () => 4 });
		const [head] = probe(ctx);
		expect(head).toMatchObject({ x0: 100, y0: 4 });
	});

	it("builds a trail from the head's recent positions", () => {
		const host = document.createElement("div");
		const rider = document.createElement("span");
		host.appendChild(rider);
		document.body.appendChild(host);
		rect(host, 0, 0, 200, 100);
		const probe = riderProbe({ host, rider, color: () => "#fff", intensity: () => 4 });
		for (let x = 10; x <= 50; x += 10) {
			rect(rider, x, 0, 2, 2);
			probe(ctx);
		}
		rect(rider, 60, 0, 2, 2);
		expect(probe(ctx).length).toBeGreaterThan(3);
	});
});

describe("meteorsProbe", () => {
	it("lights each visible head, scaled by its live opacity", () => {
		const host = document.createElement("div");
		const a = document.createElement("span");
		const b = document.createElement("span");
		a.style.opacity = "1";
		b.style.opacity = "0";
		host.append(a, b);
		document.body.appendChild(host);
		rect(host, 0, 0, 200, 100);
		rect(a, 50, 20, 2, 2);
		rect(b, 80, 20, 2, 2);
		const probe = meteorsProbe({ host, meteors: () => [a, b], intensity: 3 });
		const lights = probe(ctx);
		expect(lights).toHaveLength(1);
		expect(lights[0]).toMatchObject({ x0: 51, y0: 21, intensity: 3 });
	});
});

describe("packetProbe", () => {
	it("follows the visibility of the layer it belongs to", () => {
		const host = document.createElement("div");
		const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
		const circle = document.createElementNS("http://www.w3.org/2000/svg", "circle");
		circle.style.opacity = "1";
		svg.appendChild(circle);
		host.appendChild(svg);
		document.body.appendChild(host);
		rect(host, 0, 0, 200, 100);
		// jsdom has no SVG geometry: an identity screen matrix stands in.
		vi.stubGlobal(
			"DOMPoint",
			class {
				constructor(
					public x: number,
					public y: number
				) {}
				matrixTransform() {
					return this;
				}
			}
		);
		(circle as unknown as { getScreenCTM: () => object }).getScreenCTM = () => ({});
		Object.defineProperty(circle, "cx", { value: { baseVal: { value: 20 } } });
		Object.defineProperty(circle, "cy", { value: { baseVal: { value: 10 } } });
		const probe = packetProbe({
			host,
			layer: svg,
			paths: () => [],
			color: () => "#fff",
			intensity: 2,
			blooms: () => [circle],
		});
		expect(probe(ctx)[0]).toMatchObject({ x0: 20, y0: 10, intensity: 1.4 });
		svg.style.opacity = "0.5";
		expect(probe(ctx)[0]!.intensity).toBeCloseTo(0.7, 6);
		svg.style.opacity = "0";
		expect(probe(ctx)).toEqual([]);
		svg.style.opacity = "";
		svg.style.visibility = "hidden";
		expect(probe(ctx)).toEqual([]);
	});
});
