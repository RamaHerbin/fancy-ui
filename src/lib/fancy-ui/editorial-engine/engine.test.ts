import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The engine measures text through pretext, which needs a canvas font engine
// jsdom does not have. The touch handler never reads the measurements, so the
// layout calls are stubbed to inert values.
vi.mock("@chenglou/pretext", () => ({
	prepareWithSegments: vi.fn(() => ({})),
	layoutWithLines: vi.fn(() => ({ lines: [] })),
	layoutNextLine: vi.fn(() => null),
	walkLineRanges: vi.fn(),
}));

import { createEditorialEngine } from "./engine.js";

const STAGE_W = 1000;
const STAGE_H = 800;
// First orb sits at (0.52 * W, 0.22 * H) with radius 110.
const ORB = { clientX: 0.52 * STAGE_W, clientY: 0.22 * STAGE_H };
const EMPTY = { clientX: 5, clientY: STAGE_H - 5 };

function touchStart(touches: object[], changedTouches: object[]): Event {
	const event = new Event("touchstart", { bubbles: true, cancelable: true });
	Object.defineProperty(event, "touches", { value: touches });
	Object.defineProperty(event, "changedTouches", { value: changedTouches });
	return event;
}

describe("createEditorialEngine touchstart", () => {
	let stage: HTMLDivElement;
	let destroy: () => void;

	beforeEach(() => {
		vi.spyOn(window, "requestAnimationFrame").mockImplementation(() => 1);
		stage = document.createElement("div");
		Object.defineProperty(stage, "clientWidth", { value: STAGE_W });
		Object.defineProperty(stage, "clientHeight", { value: STAGE_H });
		document.body.appendChild(stage);
		destroy = createEditorialEngine(stage, {
			headline: "H",
			body: "Body",
			pullquotes: [],
			fontFamily: "serif",
		});
	});

	afterEach(() => {
		destroy();
		stage.remove();
		vi.restoreAllMocks();
	});

	it("claims the gesture from changedTouches[0], the finger that just landed", () => {
		// A second finger lands on an orb while the first one rests elsewhere:
		// touches[0] is the old finger, changedTouches[0] is the new one.
		const event = touchStart([EMPTY, ORB], [ORB]);
		stage.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	it("leaves the gesture to the page when the new finger misses every orb", () => {
		// touches[0] rests on an orb but the finger that just landed does not.
		const event = touchStart([ORB, EMPTY], [EMPTY]);
		stage.dispatchEvent(event);
		expect(event.defaultPrevented).toBe(false);
	});
});
