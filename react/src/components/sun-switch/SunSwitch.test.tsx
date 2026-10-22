import { StrictMode, createRef, useState } from "react";
import { renderToString } from "react-dom/server";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { SunSwitch } from "./SunSwitch.js";
import type { SunSwitchProps } from "./SunSwitch.js";
import { HALO_ATTR, LIVE_NAME, SHEET_ATTR, WAVE_ATTR, isWaving } from "./pixel-wave-core.js";
import type { SunFront, SunPainter } from "./sun-switch-core.js";
import { sound } from "../../sound/sound.js";

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
	act(() => {
		clock += advance;
		const run = queue;
		queue = [];
		for (const cb of run) cb(clock);
	});
}

async function runToEnd(step = 100, max = 200) {
	await act(async () => {
		for (let i = 0; i < max && queue.length; i++) {
			clock += step;
			const run = queue;
			queue = [];
			for (const cb of run) cb(clock);
		}
		for (let i = 0; i < 20; i++) await Promise.resolve();
	});
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

type PointerKind = "enter" | "move" | "down" | "up" | "leave";

// jsdom has no PointerEvent, so the events are MouseEvents carrying the
// pointer fields. React derives `onPointerEnter` / `onPointerLeave` from
// `pointerover` / `pointerout`, so those are what enter and leave dispatch.
const NATIVE: Record<PointerKind, string> = {
	enter: "pointerover",
	move: "pointermove",
	down: "pointerdown",
	up: "pointerup",
	leave: "pointerout",
};

function pointer(el: Element, kind: PointerKind, init: Record<string, unknown> = {}) {
	const {
		pointerType = "mouse",
		clientX = 0,
		clientY = 0,
	} = init as {
		pointerType?: string;
		clientX?: number;
		clientY?: number;
	};
	const event = new MouseEvent(NATIVE[kind], {
		bubbles: true,
		cancelable: true,
		clientX,
		clientY,
		relatedTarget: kind === "leave" ? document.body : null,
	});
	Object.defineProperty(event, "pointerType", { value: pointerType });
	act(() => {
		el.dispatchEvent(event);
	});
}

function click(el: Element) {
	act(() => {
		fireEvent.click(el);
	});
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
		const { container } = render(<SunSwitch />);
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
		const { container } = render(
			<SunSwitch
				defaultChecked={false}
				label="Theme"
				className="my-sun"
				id="sun"
				title="Toggle"
				data-testid="sun-switch"
				aria-describedby="hint"
				style={{ marginLeft: 3 }}
			/>
		);
		const el = button(container);
		expect(el.getAttribute("aria-checked")).toBe("false");
		expect(el.dataset.state).toBe("night");
		expect(el.getAttribute("aria-label")).toBe("Theme");
		expect(el.className).toContain("my-sun");
		expect(el.className).toContain("ft-sun-switch");
		expect(el.id).toBe("sun");
		expect(el.title).toBe("Toggle");
		expect(el.dataset.testid).toBe("sun-switch");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.style.marginLeft).toBe("3px");
		expect(el.style.getPropertyValue("--ft-sun-r")).toBe("10");
	});

	it("keeps the switch invariants over consumer attributes", () => {
		const props = { type: "submit", role: "button" } as unknown as SunSwitchProps;
		const { container } = render(<SunSwitch {...props} />);
		const el = button(container);
		expect(el.type).toBe("button");
		expect(el.getAttribute("role")).toBe("switch");
	});

	it("rounds the radius into the size variables and forwards ink to the canvas", () => {
		const { container } = render(<SunSwitch radius={6.4} cell={3} ink="rgb(1, 2, 3)" />);
		const el = button(container);
		expect(el.style.getPropertyValue("--ft-sun-r")).toBe("6");
		expect(el.style.getPropertyValue("--ft-sun-cell")).toBe("3px");
		expect(canvasOf(container).style.color).toBe("rgb(1, 2, 3)");
	});

	it("mounts and unmounts without a 2D context", () => {
		const { unmount } = render(<SunSwitch />);
		expect(painters).toHaveLength(0);
		expect(() => unmount()).not.toThrow();
	});

	it("renders on the server with the same markup and no browser globals", () => {
		const html = renderToString(<SunSwitch />);
		expect(html).toContain('role="switch"');
		expect(html).toContain('aria-checked="true"');
		expect(html).toContain('data-state="day"');
		expect(html).toContain("--ft-sun-r:10");
		expect(html).toContain('class="ft-sun-switch-canvas"');
	});

	it("forwards the ref to the native button", () => {
		const ref = createRef<HTMLButtonElement>();
		const { container } = render(<SunSwitch ref={ref} />);
		expect(ref.current).toBe(button(container));
	});
});

describe("SunSwitch click → wave (sheet fallback: no view transitions)", () => {
	it("flips once, reports the new value and is busy until the wave ends", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
		const el = button(container);

		click(el);

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
	});

	it("toggles back and forth across waves", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
		const el = button(container);
		click(el);
		await runToEnd();
		click(el);
		await runToEnd();
		expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
		expect(el.getAttribute("aria-checked")).toBe("true");
	});

	it("a second click mid-wave undoes at once: intent is never dropped", async () => {
		const onCheckedChange = vi.fn();
		const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
		const el = button(container);
		click(el);
		flushFrame(100);
		expect(isWaving()).toBe(true);
		clock += 300; // past the 334 ms flip rate limit, wave still running

		click(el);

		expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(isWaving()).toBe(false);
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
		await runToEnd();
		expect(el.hasAttribute("aria-busy")).toBe(false);
	});

	it("runs the consumer's onClick once, after the internal handler", () => {
		const order: string[] = [];
		const { container } = render(
			<SunSwitch onCheckedChange={() => order.push("change")} onClick={() => order.push("click")} />
		);
		click(button(container));
		expect(order).toEqual(["change", "click"]);
	});

	it("fires an unhandled consumer listener once", () => {
		const onKeyDown = vi.fn();
		const { container } = render(<SunSwitch onKeyDown={onKeyDown} />);
		fireEvent.keyDown(button(container), { key: "a" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("disabled blocks the wave, the callback and the sound", () => {
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});
		const onCheckedChange = vi.fn();
		const { container } = render(<SunSwitch disabled sound onCheckedChange={onCheckedChange} />);
		const el = button(container);
		expect(el.disabled).toBe(true);
		click(el);
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
		const { container } = render(<SunSwitch mode="contained" scope={scope} />);
		click(button(container));
		const sheet = scope.querySelector(`[${SHEET_ATTR}]`) as HTMLCanvasElement;
		expect(sheet).not.toBeNull();
		expect(sheet.style.position).toBe("absolute");
		expect(sheet.style.width).toBe("400px");
		await runToEnd();
		expect(scope.querySelector(`[${HALO_ATTR}]`)).toBeNull();
	});

	it("unmounting mid-wave does not throw and the wave still cleans up", async () => {
		const { container, unmount } = render(<SunSwitch />);
		click(button(container));
		expect(() => unmount()).not.toThrow();
		await runToEnd();
		expect(document.querySelector(`[${HALO_ATTR}]`)).toBeNull();
	});
});

describe("SunSwitch controlled / uncontrolled", () => {
	it("controlled: reports the value and follows the prop, not its own state", async () => {
		const onCheckedChange = vi.fn();
		const { container, rerender } = render(<SunSwitch checked onCheckedChange={onCheckedChange} />);
		const el = button(container);
		click(el);
		expect(onCheckedChange).toHaveBeenCalledWith(false);
		// The parent did not update: the switch still shows the prop.
		expect(el.getAttribute("aria-checked")).toBe("true");
		await runToEnd();
		rerender(<SunSwitch checked={false} onCheckedChange={onCheckedChange} />);
		expect(el.getAttribute("aria-checked")).toBe("false");
		expect(el.dataset.state).toBe("night");
	});

	it("a parent holding the state in React sees it committed inside apply()", async () => {
		const seen: string[] = [];
		const ref = createRef<HTMLButtonElement>();
		function Parent() {
			const [day, setDay] = useState(true);
			return (
				<div data-theme={day ? "light" : "dark"}>
					<SunSwitch ref={ref} checked={day} onCheckedChange={setDay} />
				</div>
			);
		}
		const vt = stubViewTransition();
		const { container } = render(<Parent />);
		click(button(container));
		act(() => {
			vt.update?.();
			// Right after the update callback: the snapshot moment.
			seen.push(
				(container.firstElementChild as HTMLElement).dataset.theme ?? "",
				ref.current?.getAttribute("aria-checked") ?? ""
			);
		});
		expect(seen).toEqual(["dark", "false"]);
		await act(async () => {
			vt.resolveReady();
			await Promise.resolve();
		});
		await runToEnd();
		act(() => vt.resolveFinished());
		await runToEnd();
		expect(ref.current?.hasAttribute("aria-busy")).toBe(false);
	});
});

describe("SunSwitch reduced motion", () => {
	it("flips in the same frame with no halo canvas and no busy state", () => {
		reducedMotion(true);
		const onCheckedChange = vi.fn();
		const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
		const el = button(container);
		click(el);
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
		const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
		const el = button(container);
		const canvas = canvasOf(container);

		click(el);

		// Before the browser runs the update callback nothing has flipped yet.
		expect(onCheckedChange).not.toHaveBeenCalled();
		expect(el.getAttribute("aria-checked")).toBe("true");
		expect(document.documentElement.hasAttribute(WAVE_ATTR)).toBe(true);
		expect(canvas.style.getPropertyValue("view-transition-name")).toBe(LIVE_NAME);
		expect(el.getAttribute("aria-busy")).toBe("true");

		// Read inside the same act scope: act defers ordinary updates to its
		// end, so only a synchronous commit (flushSync) shows the new state
		// here, which is what the "new" snapshot needs.
		act(() => {
			vt.update?.();
			expect(onCheckedChange).toHaveBeenCalledWith(false);
			expect(el.getAttribute("aria-checked")).toBe("false");
			expect(el.dataset.state).toBe("night");
		});

		await act(async () => {
			vt.resolveReady();
			await Promise.resolve();
		});
		await runToEnd();
		act(() => vt.resolveFinished());
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
		const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
		const el = button(container);
		click(el);
		expect(vt.update).not.toBeNull();
		clock += 400; // past the flip rate limit

		click(el);

		expect(vt.skipped).toBe(1);
		expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
		expect(el.getAttribute("aria-checked")).toBe("true");
		await runToEnd();
		expect(el.hasAttribute("aria-busy")).toBe(false);
		expect(document.documentElement.hasAttribute(WAVE_ATTR)).toBe(false);
	});
});

describe("SunSwitch photosensitivity guards", () => {
	it("rate-limits flips to one per 334 ms and keeps the latest intent", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			reducedMotion(true);
			const onCheckedChange = vi.fn();
			const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
			const el = button(container);
			// 10 clicks in 500 ms.
			for (let i = 0; i < 10; i++) {
				click(el);
				clock += 50;
				act(() => vi.advanceTimersByTime(50));
			}
			expect(onCheckedChange.mock.calls.length).toBeLessThanOrEqual(2);
			clock += 1000;
			act(() => vi.advanceTimersByTime(1000));
			// 10 toggles from day lands on day.
			expect(el.getAttribute("aria-checked")).toBe("true");
			const flips = onCheckedChange.mock.calls.map((c) => c[0]);
			for (let i = 1; i < flips.length; i++) expect(flips[i]).not.toBe(flips[i - 1]);
		} finally {
			vi.useRealTimers();
		}
	});

	it("an early second click is applied, not dropped", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			reducedMotion(true);
			const onCheckedChange = vi.fn();
			const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
			const el = button(container);
			click(el);
			clock += 100;
			click(el);
			expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false]);
			clock += 234;
			act(() => vi.advanceTimersByTime(234));
			expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
			expect(el.getAttribute("aria-checked")).toBe("true");
		} finally {
			vi.useRealTimers();
		}
	});

	it("cancels auto-repeated Enter and Space so holding a key never strobes", () => {
		const onKeyDown = vi.fn();
		const { container } = render(<SunSwitch onKeyDown={onKeyDown} />);
		const el = button(container);
		const send = (key: string, repeat: boolean) => {
			const event = new KeyboardEvent("keydown", { key, repeat, bubbles: true, cancelable: true });
			act(() => {
				el.dispatchEvent(event);
			});
			return event.defaultPrevented;
		};
		expect(send("Enter", true)).toBe(true);
		expect(send(" ", true)).toBe(true);
		expect(send("Enter", false)).toBe(false);
		expect(onKeyDown).toHaveBeenCalledTimes(3);
	});
});

describe("SunSwitch pointer re-entry during a view transition", () => {
	function atButton(el: HTMLElement) {
		el.getBoundingClientRect = () =>
			({ left: 100, top: 50, right: 205, bottom: 155, width: 105, height: 105 }) as DOMRect;
	}

	function onRoot(type: string, x: number, y: number) {
		const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX: x, clientY: y });
		act(() => {
			document.documentElement.dispatchEvent(event);
		});
		return event;
	}

	it("a click hit-tested as <html> over the switch toggles it back", async () => {
		const vt = stubViewTransition();
		const onCheckedChange = vi.fn();
		const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
		const el = button(container);
		atButton(el);
		click(el);
		act(() => vt.update?.());
		clock += 400;

		expect(onRoot("pointerdown", 150, 100).defaultPrevented).toBe(true);
		onRoot("click", 150, 100);

		expect(onCheckedChange.mock.calls.map((c) => c[0])).toEqual([false, true]);
		expect(el.getAttribute("aria-checked")).toBe("true");
		await runToEnd();
		expect(el.hasAttribute("aria-busy")).toBe(false);
	});

	it("ignores clicks elsewhere and stops listening once the wave ends", async () => {
		const vt = stubViewTransition();
		const onCheckedChange = vi.fn();
		const { container } = render(<SunSwitch onCheckedChange={onCheckedChange} />);
		const el = button(container);
		atButton(el);
		click(el);
		act(() => vt.update?.());
		clock += 400;
		expect(onRoot("pointerdown", 20, 20).defaultPrevented).toBe(false);
		onRoot("click", 20, 20);
		expect(onCheckedChange).toHaveBeenCalledTimes(1);

		act(() => vt.resolveReady());
		await runToEnd();
		act(() => vt.resolveFinished());
		await runToEnd();
		expect(isWaving()).toBe(false);
		clock += 400;
		onRoot("click", 150, 100);
		expect(onCheckedChange).toHaveBeenCalledTimes(1);
	});
});

describe("SunSwitch sound", () => {
	it("plays toggle-off to night and toggle-on to day, at click time", async () => {
		const vt = stubViewTransition();
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});
		const { container } = render(<SunSwitch sound />);
		const el = button(container);
		click(el);
		// Played before the update callback runs (user activation).
		expect(vt.update).not.toBeNull();
		expect(play.mock.calls.map((c) => c[0])).toEqual(["toggle-off"]);
		act(() => {
			vt.update?.();
			vt.resolveReady();
			vt.resolveFinished();
		});
		await runToEnd();
		clock += 400; // past the flip rate limit
		click(el);
		expect(play.mock.calls.map((c) => c[0])).toEqual(["toggle-off", "toggle-on"]);
		// No options: the engine's default cue, exactly like the Svelte source.
		expect(play.mock.calls.every((c) => c[1] === undefined)).toBe(true);
	});

	it("stays silent without the sound prop", () => {
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});
		const { container } = render(<SunSwitch />);
		click(button(container));
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

	function stubRect(canvas: HTMLCanvasElement) {
		// 21 cells × 5 px = 105 px, placed at (100, 50).
		canvas.getBoundingClientRect = () =>
			({ left: 100, top: 50, width: 105, height: 105, right: 205, bottom: 155 }) as DOMRect;
	}

	function setup(props: SunSwitchProps = {}) {
		const r = render(<SunSwitch {...props} />);
		stubRect(canvasOf(r.container));
		expect(painters).toHaveLength(1);
		return { ...r, el: button(r.container), p: painters[0]! };
	}

	const lastPointer = (p: SpyPainter) => p.pointer.mock.calls.at(-1);

	it("re-reads the ink when a colour transition settles, once per frame", () => {
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

	it("creates one painter with the props and destroys it on unmount", () => {
		const { p, unmount } = setup();
		expect(p.setInk).toHaveBeenCalled();
		unmount();
		expect(p.destroy).toHaveBeenCalledTimes(1);
	});

	it("StrictMode double mount leaves exactly one live painter", () => {
		const { unmount } = render(
			<StrictMode>
				<SunSwitch />
			</StrictMode>
		);
		expect(painters.length).toBeGreaterThanOrEqual(1);
		const lastP = painters.at(-1)!;
		for (const p of painters.slice(0, -1)) expect(p.destroy).toHaveBeenCalledTimes(1);
		expect(lastP.destroy).not.toHaveBeenCalled();
		unmount();
		expect(lastP.destroy).toHaveBeenCalledTimes(1);
	});

	it("forwards prop changes to the painter", () => {
		const { p, rerender } = setup();
		p.setOptions.mockClear();
		rerender(<SunSwitch radius={8} nightAlpha={0.5} />);
		const merged = Object.assign({}, ...p.setOptions.mock.calls.map((c) => c[0]));
		expect(merged).toMatchObject({ radius: 8, nightAlpha: 0.5 });
	});

	it("feeds the pointer to the lens in canvas cells and closes it on leave", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { el, p } = setup();
			pointer(el, "enter", { clientX: 125, clientY: 75 });
			expect(lastPointer(p)).toEqual([5, 5, true]);
			pointer(el, "move", { clientX: 150.5, clientY: 102.5 });
			const [mx, my, mon] = lastPointer(p)!;
			expect(mx).toBeCloseTo(10.1, 9);
			expect(my).toBeCloseTo(10.5, 9);
			expect(mon).toBe(true);
			pointer(el, "leave", { clientX: 210, clientY: 102.5 });
			act(() => vi.runAllTimers());
			expect(lastPointer(p)?.[2]).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("scales the pointer when the button is CSS-scaled", () => {
		const { el, p, container } = setup();
		canvasOf(container).getBoundingClientRect = () =>
			({ left: 0, top: 0, width: 210, height: 210 }) as DOMRect;
		pointer(el, "enter", { clientX: 21, clientY: 42 });
		expect(lastPointer(p)).toEqual([2.1, 4.2, true]);
	});

	it("touch: down opens the lens at the touch point, release closes it", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { el, p } = setup();
			pointer(el, "down", { pointerType: "touch", clientX: 110, clientY: 60 });
			expect(lastPointer(p)).toEqual([2, 2, true]);
			pointer(el, "up", { pointerType: "touch", clientX: 110, clientY: 60 });
			act(() => vi.runAllTimers());
			expect(lastPointer(p)?.[2]).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("lens={false} and disabled never open the lens", () => {
		const { el, p, rerender, container } = setup({ lens: false });
		pointer(el, "enter", { clientX: 125, clientY: 75 });
		expect(lastPointer(p)?.[2]).toBe(false);
		rerender(<SunSwitch lens disabled />);
		stubRect(canvasOf(container));
		pointer(el, "move", { clientX: 125, clientY: 75 });
		expect(lastPointer(p)?.[2]).toBe(false);
		rerender(<SunSwitch lens disabled={false} />);
		pointer(el, "move", { clientX: 125, clientY: 75 });
		expect(lastPointer(p)?.[2]).toBe(true);
	});

	it("keyboard focus opens the lens on the disc centre, blur closes it", () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		try {
			const { el, p } = setup();
			const matches = el.matches.bind(el);
			el.matches = (s: string) => (s === ":focus-visible" ? true : matches(s));
			act(() => el.focus());
			expect(lastPointer(p)).toEqual([10.5, 10.5, true]);
			act(() => el.blur());
			act(() => vi.runAllTimers());
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
			pointer(el, "enter", { clientX: 125, clientY: 75 });
			click(el);

			const first = p.setFront.mock.calls[0]![0] as SunFront;
			expect(first).toMatchObject({ cx: 52.5, cy: 52.5, R: 0, nextChecked: false });

			// Leaving mid-wave keeps the lens open.
			pointer(el, "leave", { clientX: 300, clientY: 300 });
			act(() => vi.runAllTimers());
			expect(lastPointer(p)?.[2]).toBe(true);

			flushFrame(650);
			const fronts = p.setFront.mock.calls.map((c) => c[0] as SunFront | null);
			const mid = fronts.at(-1)!;
			expect(mid).not.toBeNull();
			expect(mid.R).toBeGreaterThan(0);
			expect(mid.nextChecked).toBe(false);

			await act(async () => {
				await vi.runAllTimersAsync();
			});
			await runToEnd();
			expect(p.setFront.mock.calls.at(-1)![0]).toBeNull();
			// Not hovered any more: the lens closes.
			expect(lastPointer(p)?.[2]).toBe(false);
		} finally {
			vi.useRealTimers();
		}
	});

	it("reduced motion never sets a front", () => {
		reducedMotion(true);
		const { el, p } = setup();
		click(el);
		expect(p.setFront.mock.calls.every((c) => c[0] === null)).toBe(true);
		expect(el.getAttribute("aria-checked")).toBe("false");
	});
});
