import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import SunSwitch from "./SunSwitch.svelte";
import Harness from "./SunSwitchHarness.test.svelte";
import {
	HALO_ATTR,
	LIVE_NAME,
	SHEET_ATTR,
	WAVE_ATTR,
	isWaving,
	resetFlipGate,
} from "./pixel-wave-core.js";
import type { SunFront, SunPainter } from "./sun-switch-core.js";
import { sound } from "../sound/sound.svelte.js";

// Every painter the component creates is wrapped in spies, so the tests can
// read what the interaction layer feeds it. Under jsdom `getContext` returns
// null and no painter exists; the painter tests install a fake 2D context.
type SpyPainter = { [K in keyof SunPainter]: Mock<SunPainter[K]> };
const painters = vi.hoisted(() => [] as SpyPainter[]);

vi.mock("./sun-switch-core.js", async (importOriginal) => {
	const mod = await importOriginal<typeof import("./sun-switch-core.js")>();
	return {
		...mod,
		createSunPainter: (...args: Parameters<typeof mod.createSunPainter>) => {
			const real = mod.createSunPainter(...args);
			if (!real) return null;
			const spy = {} as Record<string, Mock>;
			for (const [key, fn] of Object.entries(real)) spy[key] = vi.fn(fn as () => void);
			painters.push(spy as unknown as SpyPainter);
			return spy;
		},
	};
});

// Manual frame queue + clock: frames run only when a test flushes them.
let queue: ((t: number) => void)[] = [];
let clock = 0;

function flushFrame(advance: number) {
	clock += advance;
	const run = queue;
	queue = [];
	for (const cb of run) cb(clock);
}

async function runToEnd(step = 100, max = 200) {
	for (let i = 0; i < max && queue.length; i++) flushFrame(step);
	for (let i = 0; i < 4; i++) await Promise.resolve();
	await tick();
}

function fakeContext() {
	return {
		fillStyle: "",
		globalAlpha: 1,
		fillRect() {},
		clearRect() {},
		setTransform() {},
	};
}

function reducedMotion(on: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: on && /prefers-reduced-motion:\s*reduce\b/.test(query),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

function button(container: HTMLElement) {
	return container.querySelector("button") as HTMLButtonElement;
}

function canvasOf(container: HTMLElement) {
	return container.querySelector("canvas.ft-sun-switch-canvas") as HTMLCanvasElement;
}

function pointer(el: Element, type: string, init: Record<string, unknown> = {}) {
	const event = new Event(type, { bubbles: type !== "pointerenter" && type !== "pointerleave" });
	Object.assign(event, { pointerType: "mouse", clientX: 0, clientY: 0, ...init });
	el.dispatchEvent(event);
}

/** A view transition stub whose update callback runs only when the test says so. */
function stubViewTransition() {
	const state = {
		update: null as null | (() => void),
		skipped: 0,
		resolveReady: () => {},
		resolveFinished: () => {},
	};
	(document as { startViewTransition?: unknown }).startViewTransition = (cb: () => void) => {
		state.update = cb;
		const ready = new Promise<void>((r) => (state.resolveReady = r));
		const finished = new Promise<void>((r) => (state.resolveFinished = r));
		return {
			ready,
			finished,
			updateCallbackDone: ready,
			skipTransition() {
				state.skipped++;
				state.update?.();
				state.resolveReady();
				state.resolveFinished();
			},
		};
	};
	return state;
}

beforeEach(() => {
	queue = [];
	clock = 0;
	resetFlipGate();
	painters.length = 0;
	vi.stubGlobal("requestAnimationFrame", (cb: (t: number) => void) => queue.push(cb));
	vi.stubGlobal("cancelAnimationFrame", (id: number) => {
		if (id > 0) queue[id - 1] = () => {};
	});
	vi.spyOn(window.performance, "now").mockImplementation(() => clock);
	vi.stubGlobal("innerWidth", 1280);
	vi.stubGlobal("innerHeight", 800);
});

afterEach(async () => {
	cleanup();
	// Waves are module-global: drain whatever a test left running.
	await runToEnd(5000);
	expect(isWaving()).toBe(false);
	vi.unstubAllGlobals();
	vi.restoreAllMocks();
	delete (document as { startViewTransition?: unknown }).startViewTransition;
	document.documentElement.removeAttribute(WAVE_ATTR);
	document.body.innerHTML = "";
});

describe("SunSwitch markup", () => {
	it("is a native switch button, day by default", () => {
		const { container } = render(SunSwitch);
		const el = button(container);
		expect(el.tagName).toBe("BUTTON");
		expect(el.type).toBe("button");
		expect(el.getAttribute("role")).toBe("switch");
		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(el.getAttribute("aria-label")).toBe("Day mode");
		expect(el.dataset.state).toBe("day");
		expect(el.hasAttribute("aria-busy")).toBe(false);
		expect(el.hasAttribute("data-waving")).toBe(false);
		expect(el.className).toContain("ft-sun-switch");
		expect(el.style.getPropertyValue("--ft-sun-r")).toBe("10");
		expect(el.style.getPropertyValue("--ft-sun-cell")).toBe("5px");
		expect(canvasOf(container).getAttribute("aria-hidden")).toBe("true");
	});

	it("renders night, a custom label, classes and rest props", () => {
		const { container } = render(SunSwitch, {
			props: { checked: false, label: "Theme", class: "my-sun", id: "sun", title: "Toggle" },
		});
		const el = button(container);
		expect(el.getAttribute("aria-checked")).toBe("false");
		expect(el.dataset.state).toBe("night");
		expect(el.getAttribute("aria-label")).toBe("Theme");
		expect(el.className).toContain("my-sun");
		expect(el.id).toBe("sun");
		expect(el.title).toBe("Toggle");
	});

	it("mounts and unmounts without a 2D context", () => {
		const { unmount } = render(SunSwitch);
		expect(painters).toHaveLength(0);
		expect(() => unmount()).not.toThrow();
	});
});

describe("SunSwitch click → wave (sheet fallback: jsdom has no view transitions)", () => {
	it("flips once, reports the new value and is busy until the wave ends", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(SunSwitch, { props: { onCheckedChange } });
		const el = button(container);

		await fireEvent.click(el);

		expect(onCheckedChange).toHaveBeenCalledTimes(1);
		expect(onCheckedChange).toHaveBeenCalledWith(false);
		expect(el.getAttribute("aria-checked")).toBe("false");
		expect(el.dataset.state).toBe("night");
		expect(el.getAttribute("aria-busy")).toBe("true");
		expect(el.hasAttribute("data-waving")).toBe(true);
		expect(document.querySelector(`[${SHEET_ATTR}]`)).not.toBeNull();

		await runToEnd();

		expect(el.hasAttribute("aria-busy")).toBe(false);
		expect(el.hasAttribute("data-waving")).toBe(false);
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
		expect(document.activeElement === el || document.activeElement === document.body).toBe(true);
	});

	it("toggles back and forth across waves", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(SunSwitch, { props: { onCheckedChange } });
		const el = button(container);
		await fireEvent.click(el);
		await runToEnd();
		await fireEvent.click(el);
		await runToEnd();
		expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
		expect(el.getAttribute("aria-checked")).toBe("true");
	});

	it("a second click mid-wave undoes at once: intent is never dropped", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(SunSwitch, { props: { onCheckedChange } });
		const el = button(container);
		await fireEvent.click(el);
		flushFrame(100);
		expect(isWaving()).toBe(true);
		clock += 300; // past the 334 ms flip rate limit, wave still running

		await fireEvent.click(el);

		expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(isWaving()).toBe(false);
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
		await runToEnd();
		expect(el.hasAttribute("aria-busy")).toBe(false);
	});

	it("runs the consumer's onclick after the internal handler", async () => {
		const order: string[] = [];
		const { container } = render(SunSwitch, {
			props: {
				onCheckedChange: () => order.push("change"),
				onclick: () => order.push("click"),
			},
		});
		await fireEvent.click(button(container));
		expect(order).toEqual(["change", "click"]);
	});

	it("disabled blocks the wave, the callback and the sound", async () => {
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});
		const onCheckedChange = vi.fn();
		const { container } = render(SunSwitch, {
			props: { disabled: true, sound: true, onCheckedChange },
		});
		const el = button(container);
		expect(el.disabled).toBe(true);
		await fireEvent.click(el);
		expect(onCheckedChange).not.toHaveBeenCalled();
		expect(play).not.toHaveBeenCalled();
		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
	});

	it("contained mode paints inside the scope, origin local to it", async () => {
		const scope = document.createElement("div");
		document.body.append(scope);
		scope.getBoundingClientRect = () =>
			({ left: 200, top: 100, width: 400, height: 300 }) as DOMRect;
		Object.defineProperty(scope, "clientWidth", { value: 400 });
		Object.defineProperty(scope, "clientHeight", { value: 300 });
		const { container } = render(SunSwitch, { props: { mode: "contained", scope } });
		await fireEvent.click(button(container));
		const sheet = scope.querySelector(`[${SHEET_ATTR}]`) as HTMLCanvasElement;
		expect(sheet).not.toBeNull();
		expect(sheet.style.position).toBe("absolute");
		expect(sheet.style.width).toBe("400px");
		await runToEnd();
		expect(scope.querySelector(`[${HALO_ATTR}]`)).toBeNull();
	});

	it("unmounting mid-wave does not throw and the wave still cleans up", async () => {
		const { container, unmount } = render(SunSwitch);
		await fireEvent.click(button(container));
		expect(() => unmount()).not.toThrow();
		await runToEnd();
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
	});
});

describe("SunSwitch reduced motion", () => {
	it("flips in the same frame with no halo canvas and no busy state", async () => {
		reducedMotion(true);
		const onCheckedChange = vi.fn();
		const { container } = render(SunSwitch, { props: { onCheckedChange } });
		const el = button(container);
		await fireEvent.click(el);
		expect(onCheckedChange).toHaveBeenCalledWith(false);
		expect(el.getAttribute("aria-checked")).toBe("false");
		expect(el.hasAttribute("aria-busy")).toBe(false);
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
		expect(isWaving()).toBe(false);
	});
});

describe("SunSwitch view transition path", () => {
	it("commits the new state inside the update callback and cleans up after", async () => {
		const vt = stubViewTransition();
		const onCheckedChange = vi.fn();
		const { container } = render(SunSwitch, { props: { onCheckedChange } });
		const el = button(container);
		const canvas = canvasOf(container);

		await fireEvent.click(el);

		// Before the browser runs the update callback nothing has flipped yet.
		expect(onCheckedChange).not.toHaveBeenCalled();
		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(document.documentElement.hasAttribute(WAVE_ATTR)).toBe(true);
		expect(canvas.style.getPropertyValue("view-transition-name")).toBe(LIVE_NAME);
		expect(el.getAttribute("aria-busy")).toBe("true");

		vt.update?.();
		// Synchronous commit: the "new" snapshot is taken right after this returns.
		expect(onCheckedChange).toHaveBeenCalledWith(false);
		expect(el.getAttribute("aria-checked")).toBe("false");
		expect(el.dataset.state).toBe("night");

		vt.resolveReady();
		await Promise.resolve();
		await runToEnd();
		vt.resolveFinished();
		await runToEnd();

		expect(document.documentElement.hasAttribute(WAVE_ATTR)).toBe(false);
		expect(canvas.style.getPropertyValue("view-transition-name")).toBe("");
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
		expect(el.hasAttribute("aria-busy")).toBe(false);
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
	});

	it("a click before the first update callback ran still toggles back", async () => {
		const vt = stubViewTransition();
		const onCheckedChange = vi.fn();
		const { container } = render(SunSwitch, { props: { onCheckedChange } });
		const el = button(container);
		await fireEvent.click(el);
		expect(vt.update).not.toBeNull();
		clock += 400; // past the flip rate limit

		await fireEvent.click(el);

		expect(vt.skipped).toBe(1);
		expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
		expect(el.getAttribute("aria-checked")).toBe("true");
		await runToEnd();
		expect(el.hasAttribute("aria-busy")).toBe(false);
		expect(document.documentElement.hasAttribute(WAVE_ATTR)).toBe(false);
	});
});

describe("SunSwitch photosensitivity guards", () => {
	it("rate-limits flips to one per 334 ms and keeps the latest intent", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			reducedMotion(true);
			const onCheckedChange = vi.fn();
			const { container } = render(SunSwitch, { props: { onCheckedChange } });
			const el = button(container);
			// 10 clicks in 500 ms.
			for (let i = 0; i < 10; i++) {
				await fireEvent.click(el);
				clock += 50;
				vi.advanceTimersByTime(50);
			}
			expect(onCheckedChange.mock.calls.length).toBeLessThanOrEqual(2);
			clock += 1000;
			vi.advanceTimersByTime(1000);
			await tick();
			// 10 toggles from day lands on day.
			expect(el.getAttribute("aria-checked")).toBe("true");
			const flips = onCheckedChange.mock.calls.map((c) => c[0]);
			for (let i = 1; i < flips.length; i++) expect(flips[i]).not.toBe(flips[i - 1]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("an early second click is applied, not dropped", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			reducedMotion(true);
			const onCheckedChange = vi.fn();
			const { container } = render(SunSwitch, { props: { onCheckedChange } });
			const el = button(container);
			await fireEvent.click(el);
			clock += 100;
			await fireEvent.click(el);
			expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false]);
			clock += 234;
			vi.advanceTimersByTime(234);
			await tick();
			expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
			expect(el.getAttribute("aria-checked")).toBe("true");
		} finally {
			vi.useRealTimers();
		}
	});

	it("shares the flip rate limit across switches", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			reducedMotion(true);
			const a = vi.fn();
			const b = vi.fn();
			const one = button(render(SunSwitch, { props: { onCheckedChange: a } }).container);
			const two = button(render(SunSwitch, { props: { onCheckedChange: b } }).container);
			await fireEvent.click(one);
			clock += 100;
			await fireEvent.click(two);
			expect(a.mock.calls.map((c) => c[0])).toEqual([false]);
			expect(b).not.toHaveBeenCalled();
			clock += 234;
			vi.advanceTimersByTime(234);
			await tick();
			expect(b.mock.calls.map((c) => c[0])).toEqual([false]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("cancels auto-repeated Enter and Space so holding a key never strobes", async () => {
		const onkeydown = vi.fn();
		const { container } = render(SunSwitch, { props: { onkeydown } });
		const el = button(container);
		const repeat = new KeyboardEvent("keydown", {
			key: "Enter",
			repeat: true,
			bubbles: true,
			cancelable: true,
		});
		el.dispatchEvent(repeat);
		expect(repeat.defaultPrevented).toBe(true);
		const space = new KeyboardEvent("keydown", {
			key: " ",
			repeat: true,
			bubbles: true,
			cancelable: true,
		});
		el.dispatchEvent(space);
		expect(space.defaultPrevented).toBe(true);
		const first = new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true });
		el.dispatchEvent(first);
		expect(first.defaultPrevented).toBe(false);
		expect(onkeydown).toHaveBeenCalledTimes(3);
	});
});

describe("SunSwitch pointer re-entry during a view transition", () => {
	function atButton(el: HTMLElement) {
		el.getBoundingClientRect = () =>
			({ left: 100, top: 50, right: 205, bottom: 155, width: 105, height: 105 }) as DOMRect;
	}

	function onRoot(type: string, x: number, y: number) {
		const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
		document.documentElement.dispatchEvent(event);
		return event;
	}

	it("a click hit-tested as <html> over the switch toggles it back", async () => {
		const vt = stubViewTransition();
		const onCheckedChange = vi.fn();
		const onclick = vi.fn();
		const { container } = render(SunSwitch, { props: { onCheckedChange, onclick } });
		const el = button(container);
		atButton(el);
		await fireEvent.click(el);
		vt.update?.();
		clock += 400;

		const down = onRoot("pointerdown", 150, 100);
		expect(down.defaultPrevented).toBe(true);
		onRoot("click", 150, 100);

		expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
		expect(el.getAttribute("aria-checked")).toBe("true");
		// The re-routed click reaches the consumer's handler like a direct one.
		expect(onclick).toHaveBeenCalledTimes(2);
		await runToEnd();
		expect(el.hasAttribute("aria-busy")).toBe(false);
	});

	it("ignores clicks elsewhere and stops listening once the wave ends", async () => {
		const vt = stubViewTransition();
		const onCheckedChange = vi.fn();
		const { container } = render(SunSwitch, { props: { onCheckedChange } });
		const el = button(container);
		atButton(el);
		await fireEvent.click(el);
		vt.update?.();
		clock += 400;
		expect(onRoot("pointerdown", 20, 20).defaultPrevented).toBe(false);
		onRoot("click", 20, 20);
		expect(onCheckedChange).toHaveBeenCalledTimes(1);

		vt.resolveReady();
		await Promise.resolve();
		await runToEnd();
		vt.resolveFinished();
		await runToEnd();
		expect(isWaving()).toBe(false);
		clock += 400;
		onRoot("click", 150, 100);
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
	});
});

describe("SunSwitch bindables", () => {
	it("bind:checked travels back out and bind:ref reaches the button", async () => {
		const onCheckedChange = vi.fn();
		const { container, getByTestId } = render(Harness, { props: { onCheckedChange } });
		const el = button(container);
		await tick();
		expect(el.getAttribute("data-bound-ref")).toBe("yes");
		expect(getByTestId("bound-checked").textContent).toBe("true");

		await fireEvent.click(el);
		await tick();
		expect(getByTestId("bound-checked").textContent).toBe("false");
		expect(onCheckedChange).toHaveBeenCalledWith(false);

		await runToEnd();
		await fireEvent.click(el);
		await tick();
		expect(getByTestId("bound-checked").textContent).toBe("true");
	});
});

describe("SunSwitch sound", () => {
	it("plays toggle-off to night and toggle-on to day, at click time", async () => {
		const vt = stubViewTransition();
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});
		const { container } = render(SunSwitch, { props: { sound: true } });
		const el = button(container);
		await fireEvent.click(el);
		// Played before the update callback runs (user activation).
		expect(vt.update).not.toBeNull();
		expect(play.mock.calls.map((c) => c[0])).toEqual(["toggle-off"]);
		vt.update?.();
		vt.resolveReady();
		vt.resolveFinished();
		await runToEnd();
		clock += 400; // past the flip rate limit
		await fireEvent.click(el);
		expect(play.mock.calls.map((c) => c[0])).toEqual(["toggle-off", "toggle-on"]);
		expect(play.mock.calls.every((c) => c.length === 1)).toBe(true);
	});

	it("stays silent without the sound prop", async () => {
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});
		const { container } = render(SunSwitch);
		await fireEvent.click(button(container));
		expect(play).not.toHaveBeenCalled();
	});
});

describe("SunSwitch painter wiring (fake 2D context)", () => {
	const proto = HTMLCanvasElement.prototype as unknown as { getContext: () => unknown };
	let original: () => unknown;
	beforeEach(() => {
		original = proto.getContext;
		proto.getContext = () => fakeContext();
	});
	afterEach(() => {
		proto.getContext = original;
	});

	function setup(props: Record<string, unknown> = {}) {
		const r = render(SunSwitch, { props });
		const canvas = canvasOf(r.container);
		// 21 cells × 5 px = 105 px, placed at (100, 50).
		canvas.getBoundingClientRect = () =>
			({ left: 100, top: 50, width: 105, height: 105, right: 205, bottom: 155 }) as DOMRect;
		expect(painters).toHaveLength(1);
		return { ...r, el: button(r.container), p: painters[0]! };
	}

	const lastPointer = (p: SpyPainter) => p.pointer.mock.calls.at(-1);

	it("feeds the pointer to the lens in canvas cells and closes it on leave", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { el, p } = setup();
			pointer(el, "pointerenter", { clientX: 125, clientY: 75 });
			expect(lastPointer(p)).toEqual([5, 5, true]);
			pointer(el, "pointermove", { clientX: 150.5, clientY: 102.5 });
			const [mx, my, mon] = lastPointer(p)!;
			expect(mx).toBeCloseTo(10.1, 9);
			expect(my).toBeCloseTo(10.5, 9);
			expect(mon).toBe(true);
			pointer(el, "pointerleave", { clientX: 210, clientY: 102.5 });
			vi.runAllTimers();
			expect(lastPointer(p)?.[2]).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("scales the pointer when the button is CSS-scaled", () => {
		const { el, p, container } = setup();
		canvasOf(container).getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 210, height: 210 }) as DOMRect;
		pointer(el, "pointerenter", { clientX: 21, clientY: 42 });
		expect(lastPointer(p)).toEqual([2.1, 4.2, true]);
	});

	it("touch: down opens the lens at the touch point, release closes it", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { el, p } = setup();
			pointer(el, "pointerdown", { pointerType: "touch", clientX: 110, clientY: 60 });
			expect(lastPointer(p)).toEqual([2, 2, true]);
			pointer(el, "pointerup", { pointerType: "touch", clientX: 110, clientY: 60 });
			vi.runAllTimers();
			expect(lastPointer(p)?.[2]).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("lens={false} and disabled never open the lens", async () => {
		const { el, p, rerender } = setup({ lens: false });
		pointer(el, "pointerenter", { clientX: 125, clientY: 75 });
		expect(lastPointer(p)?.[2]).toBe(false);
		await rerender({ lens: true, disabled: true });
		pointer(el, "pointermove", { clientX: 125, clientY: 75 });
		expect(lastPointer(p)?.[2]).toBe(false);
		await rerender({ lens: true, disabled: false });
		pointer(el, "pointermove", { clientX: 125, clientY: 75 });
		expect(lastPointer(p)?.[2]).toBe(true);
	});

	it("keyboard focus opens the lens on the disc centre, blur closes it", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { el, p } = setup();
			const matches = el.matches.bind(el);
			el.matches = (s: string) => (s === ":focus-visible" ? true : matches(s));
			el.focus();
			expect(lastPointer(p)).toEqual([10.5, 10.5, true]);
			el.blur();
			vi.runAllTimers();
			expect(lastPointer(p)?.[2]).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("drives the front through the wave, holds the lens open, and releases both at the end", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { el, p } = setup();
			// jsdom answers `:hover` as true for any element; the pointer has left.
			const matches = el.matches.bind(el);
			el.matches = (s: string) => (s === ":hover" ? false : matches(s));
			pointer(el, "pointerenter", { clientX: 125, clientY: 75 });
			await fireEvent.click(el);

			const first = p.setFront.mock.calls[0]![0] as SunFront;
			expect(first).toMatchObject({ cx: 52.5, cy: 52.5, R: 0, nextChecked: false });

			// Leaving mid-wave keeps the lens open.
			pointer(el, "pointerleave", { clientX: 300, clientY: 300 });
			vi.runAllTimers();
			expect(lastPointer(p)?.[2]).toBe(true);

			flushFrame(650);
			const fronts = p.setFront.mock.calls.map((c) => c[0] as SunFront | null);
			const mid = fronts.at(-1)!;
			expect(mid).not.toBeNull();
			expect(mid.R).toBeGreaterThan(0);
			expect(mid.nextChecked).toBe(false);

			await vi.runAllTimersAsync();
			await runToEnd();
			expect(p.setFront.mock.calls.at(-1)![0]).toBeNull();
			// Not hovered any more: the lens closes.
			expect(lastPointer(p)?.[2]).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("re-reads the ink when a colour transition settles, once per frame", async () => {
		const { p } = setup();
		const reads = () => p.setInk.mock.calls.length;
		const before = reads();
		for (let i = 0; i < 5; i++) {
			const end = new Event("transitionend", { bubbles: true });
			Object.assign(end, { propertyName: "color" });
			document.body.dispatchEvent(end);
		}
		const other = new Event("transitionend", { bubbles: true });
		Object.assign(other, { propertyName: "opacity" });
		document.body.dispatchEvent(other);
		expect(reads()).toBe(before);
		flushFrame(16);
		expect(reads()).toBe(before + 1);
	});

	it("reduced motion never sets a front", async () => {
		reducedMotion(true);
		const { el, p } = setup();
		await fireEvent.click(el);
		expect(p.setFront.mock.calls.every((c) => c[0] === null)).toBe(true);
		expect(el.getAttribute("aria-checked")).toBe("false");
	});
});
