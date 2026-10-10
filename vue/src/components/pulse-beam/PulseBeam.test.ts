import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, nextTick } from "vue";
import { mount } from "@vue/test-utils";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import PulseBeam from "./PulseBeam.vue";
import { pulseEntryCount } from "./pulse-beam-loop.js";
import { FakeIntersectionObserver } from "../../test-setup.js";

// --- harness ------------------------------------------------------------------

let rafCallbacks: FrameRequestCallback[] = [];
let rafCounter = 0;
const raf = vi.fn((cb: FrameRequestCallback) => {
	rafCallbacks.push(cb);
	return ++rafCounter;
});
const caf = vi.fn();

const originalMatchMedia = window.matchMedia;

function stubReducedMotion(matches: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches,
			media: query,
			onchange: null,
			addListener: () => {},
			removeListener: () => {},
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
		}),
	});
}

/** Run every pending rAF callback with the given timestamp (ms). */
function frame(t: number) {
	const cbs = rafCallbacks.splice(0);
	for (const cb of cbs) cb(t);
}

function getHost(container: Element) {
	return container.querySelector(".pulse-beam") as HTMLDivElement;
}

function getStroke(container: Element) {
	return container.querySelector(".pulse-beam__stroke") as HTMLDivElement;
}

beforeEach(() => {
	rafCallbacks = [];
	raf.mockClear();
	caf.mockClear();
	vi.stubGlobal("requestAnimationFrame", raf);
	vi.stubGlobal("cancelAnimationFrame", caf);
});

afterEach(() => {
	// cleanup() first: the loop must cancel through the stub it scheduled with.
	cleanup();
	vi.unstubAllGlobals();
	vi.useRealTimers();
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: originalMatchMedia,
	});
	expect(pulseEntryCount()).toBe(0);
});

// --- tests --------------------------------------------------------------------

describe("PulseBeam", () => {
	it("renders the wrapper, three layers and children, and merges classes", () => {
		const { container } = render(PulseBeam, {
			props: { class: "custom" },
			attrs: { "data-testid": "pb" },
		});
		const host = getHost(container);
		expect(host).toBeTruthy();
		expect(host.classList.contains("custom")).toBe(true);
		expect(host.getAttribute("data-testid")).toBe("pb");
		expect(host.getAttribute("data-variant")).toBe("inner");
		expect(container.querySelector(".pulse-beam__stroke")).toBeTruthy();
		expect(container.querySelector(".pulse-beam__glow")).toBeTruthy();
		expect(container.querySelector(".pulse-beam__bloom")).toBeTruthy();
	});

	it("keeps its own variant and state when matching attributes are forwarded", async () => {
		const { container } = render(PulseBeam, {
			props: { variant: "outside" },
			attrs: { "data-variant": "inner", "data-state": "loading" },
		});
		await nextTick();
		const host = getHost(container);
		expect(host.getAttribute("data-variant")).toBe("outside");
		expect(host.getAttribute("data-state")).toBe("active");
	});

	it("exposes clamped strength, radius and mono-halved opacities as custom properties", () => {
		const { container } = render(PulseBeam, { props: { strength: 2, radius: 24 } });
		const host = getHost(container);
		expect(host.style.getPropertyValue("--pb-strength")).toBe("1");
		expect(host.style.getPropertyValue("--pb-radius")).toBe("24px");

		cleanup();
		const low = render(PulseBeam, { props: { strength: -1, palette: "mono" } });
		const lowHost = getHost(low.container);
		expect(lowHost.style.getPropertyValue("--pb-strength")).toBe("0");
		expect(Number(lowHost.style.getPropertyValue("--pb-o-stroke"))).toBeCloseTo(1.54 * 0.5);
	});

	it("paints 9 / 13 / 7 gradients for inner and 8 / 8 / 7 for outside", () => {
		const count = (el: Element | null) =>
			((el as HTMLElement).style.backgroundImage.match(/radial-gradient\(/g) ?? []).length;
		const inner = render(PulseBeam);
		expect(count(inner.container.querySelector(".pulse-beam__stroke"))).toBe(9);
		expect(count(inner.container.querySelector(".pulse-beam__glow"))).toBe(13);
		expect(count(inner.container.querySelector(".pulse-beam__bloom"))).toBe(7);
		expect(getStroke(inner.container).style.backgroundImage).not.toContain("--pb-sx");

		cleanup();
		const outside = render(PulseBeam, { props: { variant: "outside" } });
		expect(count(outside.container.querySelector(".pulse-beam__stroke"))).toBe(8);
		expect(count(outside.container.querySelector(".pulse-beam__glow"))).toBe(8);
		expect(count(outside.container.querySelector(".pulse-beam__bloom"))).toBe(7);
		expect(getStroke(outside.container).style.backgroundImage).toContain("var(--pb-sx, 1)");
		expect(getHost(outside.container).getAttribute("data-variant")).toBe("outside");
	});

	it("activates on mount and schedules one animation frame", async () => {
		const { container } = render(PulseBeam);
		await nextTick();
		expect(getHost(container).getAttribute("data-state")).toBe("active");
		expect(raf).toHaveBeenCalledTimes(1);
		expect(pulseEntryCount()).toBe(1);
	});

	it("stays idle and never schedules a frame when active is false", async () => {
		const { container } = render(PulseBeam, { props: { active: false } });
		await nextTick();
		expect(getHost(container).getAttribute("data-state")).toBe("idle");
		expect(raf).not.toHaveBeenCalled();
	});

	it("writes oscillator and hue properties on each throttled frame", async () => {
		const { container } = render(PulseBeam);
		await nextTick();
		const host = getHost(container);

		frame(100);
		const hue1 = host.style.getPropertyValue("--pb-hue");
		expect(hue1).toMatch(/deg$/);
		const bw1 = Number(host.style.getPropertyValue("--pb-bw1"));
		expect(bw1).toBeGreaterThanOrEqual(1 - 0.28 - 1e-6);
		expect(bw1).toBeLessThanOrEqual(1 + 0.28 * 1.1 + 1e-6);
		expect(host.style.getPropertyValue("--pb-bx1")).toMatch(/px$/);

		frame(110); // inside the 30fps window: no write
		expect(host.style.getPropertyValue("--pb-hue")).toBe(hue1);

		frame(150);
		expect(host.style.getPropertyValue("--pb-hue")).not.toBe(hue1);
	});

	it("respects prefers-reduced-motion: no loop, layers still present, onfadein fires", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		stubReducedMotion(true);
		const onfadein = vi.fn();
		const { container } = render(PulseBeam, { props: { onfadein } });
		await nextTick();
		const host = getHost(container);
		expect(host.getAttribute("data-state")).toBe("active");
		expect(raf).not.toHaveBeenCalled();
		expect(container.querySelectorAll(".pulse-beam__layer")).toHaveLength(3);
		vi.advanceTimersByTime(0);
		expect(onfadein).toHaveBeenCalledTimes(1);
	});

	it("skips hue rotation for mono and when hueShift is off", async () => {
		const mono = render(PulseBeam, { props: { palette: "mono" } });
		await nextTick();
		frame(100);
		expect(getHost(mono.container).style.getPropertyValue("--pb-bw1")).not.toBe("");
		expect(getHost(mono.container).style.getPropertyValue("--pb-hue")).toBe("");
		cleanup();

		const noHue = render(PulseBeam, { props: { hueShift: false } });
		await nextTick();
		frame(200);
		expect(getHost(noHue.container).style.getPropertyValue("--pb-hue")).toBe("");
	});

	it("clears the hue rotation when hue drift is switched off", async () => {
		const { container, rerender } = render(PulseBeam, { props: { hueShift: true } });
		await nextTick();
		const host = getHost(container);
		frame(100);
		expect(host.style.getPropertyValue("--pb-hue")).toMatch(/deg$/);

		await rerender({ hueShift: false });
		await nextTick();
		expect(host.style.getPropertyValue("--pb-hue")).toBe("");
	});

	it("fades out on transitionend and fires onfadeout exactly once", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		const onfadeout = vi.fn();
		const { container, rerender } = render(PulseBeam, { props: { active: true, onfadeout } });
		await nextTick();
		await rerender({ active: false, onfadeout });
		await nextTick();
		const host = getHost(container);
		expect(host.getAttribute("data-state")).toBe("fading");

		// jsdom has no TransitionEvent constructor; a plain Event with
		// `propertyName` set manually is what the React port's suite uses too.
		const ev = new Event("transitionend", { bubbles: true }) as TransitionEvent;
		Object.defineProperty(ev, "propertyName", { value: "opacity" });
		await fireEvent(getStroke(container), ev);
		await nextTick();
		expect(host.getAttribute("data-state")).toBe("idle");
		expect(onfadeout).toHaveBeenCalledTimes(1);

		vi.advanceTimersByTime(1000);
		expect(onfadeout).toHaveBeenCalledTimes(1);
		expect(pulseEntryCount()).toBe(0);
		expect(caf).toHaveBeenCalled();
	});

	it("falls back to a timer when no transitionend arrives", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		const onfadeout = vi.fn();
		const { container, rerender } = render(PulseBeam, { props: { active: true, onfadeout } });
		await nextTick();
		await rerender({ active: false, onfadeout });
		await nextTick();
		vi.advanceTimersByTime(579);
		expect(onfadeout).not.toHaveBeenCalled();
		vi.advanceTimersByTime(1);
		await nextTick();
		expect(getHost(container).getAttribute("data-state")).toBe("idle");
		expect(onfadeout).toHaveBeenCalledTimes(1);
	});

	it("cancels the frame and disconnects the observer on unmount", async () => {
		const { unmount } = render(PulseBeam);
		await nextTick();
		const id = raf.mock.results[0]?.value;
		const io = FakeIntersectionObserver.instances[0]!;
		const disconnect = vi.spyOn(io, "disconnect");
		unmount();
		expect(caf).toHaveBeenCalledWith(id);
		expect(disconnect).toHaveBeenCalled();
	});

	it("pauses writes while offscreen and resumes when visible again", async () => {
		const { container } = render(PulseBeam);
		await nextTick();
		const host = getHost(container);
		frame(100);
		const hue = host.style.getPropertyValue("--pb-hue");

		FakeIntersectionObserver.instances[0]!.trigger(false);
		frame(300);
		expect(host.style.getPropertyValue("--pb-hue")).toBe(hue);
		// everyone paused: the loop stops rescheduling
		expect(rafCallbacks).toHaveLength(0);

		FakeIntersectionObserver.instances[0]!.trigger(true);
		expect(rafCallbacks).toHaveLength(1);
		frame(400);
		expect(host.style.getPropertyValue("--pb-hue")).not.toBe(hue);
	});

	it("shares one animation frame between instances", async () => {
		const a = render(PulseBeam);
		const b = render(PulseBeam);
		await nextTick();
		expect(raf).toHaveBeenCalledTimes(1);
		expect(pulseEntryCount()).toBe(2);
		a.unmount();
		expect(caf).not.toHaveBeenCalled();
		b.unmount();
		expect(caf).toHaveBeenCalledTimes(1);
	});

	it("exposes ref to the wrapper", () => {
		const wrapper = mount(PulseBeam);
		expect((wrapper.vm as unknown as { ref: HTMLDivElement | null }).ref).toBeInstanceOf(
			HTMLDivElement
		);
		wrapper.unmount();
	});

	it("lets the computed --pb-* values win over a consumer style, keeping its other keys", async () => {
		const { container } = render(PulseBeam, {
			props: { radius: 24 },
			attrs: { style: { "--pb-radius": "2px", "--pb-strength": "0.1", color: "red" } },
		});
		await nextTick();
		const host = getHost(container);
		expect(host.style.getPropertyValue("--pb-radius")).toBe("24px");
		expect(host.style.getPropertyValue("--pb-strength")).toBe("1");
		expect(host.style.color).toBe("red");
	});

	it("calls the lowercase callbacks passed as :onfadein / :onfadeout; @fadein / @fadeout never reach them", async () => {
		vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
		const lower = { in: vi.fn(), out: vi.fn() };
		const camel = { in: vi.fn(), out: vi.fn() };
		let active = true;
		const Host = defineComponent({
			props: { active: { type: Boolean, default: true } },
			setup: (p) => () =>
				h(PulseBeam, {
					active: p.active,
					// `:onfadein="fn"` compiles to the declared prop…
					onfadein: lower.in,
					onfadeout: lower.out,
					// …while `@fadein="fn"` compiles to `onFadein`, an undeclared attr.
					onFadein: camel.in,
					onFadeout: camel.out,
				}),
		});
		const { rerender } = render(Host, { props: { active } });
		await nextTick();
		vi.runAllTimers();
		expect(lower.in).toHaveBeenCalledTimes(1);
		active = false;
		await rerender({ active });
		await nextTick();
		vi.runAllTimers();
		expect(lower.out).toHaveBeenCalledTimes(1);
		expect(camel.in).not.toHaveBeenCalled();
		expect(camel.out).not.toHaveBeenCalled();
	});

	it("renders the default slot inside the wrapper, before the layers", () => {
		const { container } = render(PulseBeam, { slots: { default: () => h("span", { id: "kid" }) } });
		const host = getHost(container);
		expect(host.firstElementChild?.id).toBe("kid");
	});
});
