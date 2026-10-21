/**
 * The presence fades are JS-timed (300 ms). Under `prefers-reduced-motion: reduce`
 * they must collapse to 0. jsdom's `Element.animate` stub settles at once, so the
 * test observes the duration handed to it. The no-reduce control proves the 300 ms
 * fade is really requested otherwise.
 */
import { render, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import DirectionAwareHover from "./DirectionAwareHover.vue";

function mockMatchMedia(reduce: boolean) {
	Object.defineProperty(window, "matchMedia", {
		writable: true,
		configurable: true,
		value: (query: string) => ({
			matches: reduce && query.includes("reduce") && !query.includes("no-preference"),
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			addListener: () => {},
			removeListener: () => {},
			dispatchEvent: () => false,
		}),
	});
}

/** Durations passed to `Element.animate` while a touch reveals the caption. */
async function revealDurations(reduce: boolean): Promise<number[]> {
	mockMatchMedia(reduce);
	const durations: number[] = [];
	const original = Element.prototype.animate;
	Element.prototype.animate = function (this: Element, ...args: Parameters<Element["animate"]>) {
		const opts = args[1];
		if (typeof opts === "object" && opts && typeof opts.duration === "number")
			durations.push(opts.duration);
		return original.apply(this, args);
	} as typeof original;
	try {
		const { container } = render(DirectionAwareHover, {
			props: { imageUrl: "/x.jpg" },
			slots: { default: "<p>caption</p>" },
		});
		const fig = container.querySelector('[role="figure"]') as HTMLElement;
		await fireEvent.touchStart(fig, { touches: [{ clientX: 5, clientY: 5 }] });
		await nextTick();
		await vi.advanceTimersByTimeAsync(400);
		expect(container.textContent).toContain("caption");
	} finally {
		Element.prototype.animate = original;
	}
	return durations;
}

describe("DirectionAwareHover fades under prefers-reduced-motion", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("control (no preference): the fade is requested with 300 ms", async () => {
		vi.useFakeTimers();
		expect(await revealDurations(false)).toContain(300);
	});

	it("reduce: no 300 ms fade is requested", async () => {
		vi.useFakeTimers();
		expect(await revealDurations(true)).not.toContain(300);
	});
});
