/**
 * The Svelte `transition:fade` is JS-timed (300 ms). Under
 * `prefers-reduced-motion: reduce` it must collapse to 0. The test observes the
 * duration handed to `Element.animate`; the no-reduce control proves the 300 ms
 * fade is really requested otherwise.
 */
import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import DirectionAwareHover from "./DirectionAwareHover.svelte";

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

async function revealDurations(reduce: boolean): Promise<number[]> {
	mockMatchMedia(reduce);
	const durations: number[] = [];
	const proto = Element.prototype as unknown as { animate?: (...a: unknown[]) => unknown };
	const original = proto.animate ?? (() => ({ cancel() {}, finished: Promise.resolve() }));
	proto.animate = function (this: Element, ...args: unknown[]) {
		const opts = args[1] as { duration?: unknown } | undefined;
		if (opts && typeof opts.duration === "number") durations.push(opts.duration);
		return original.apply(this, args);
	};
	try {
		const { container } = render(DirectionAwareHover, { props: { imageUrl: "/x.jpg" } });
		const fig = container.querySelector('[role="figure"]') as HTMLElement;
		await fireEvent.touchStart(fig, { touches: [{ clientX: 5, clientY: 5 }] });
		await tick();
		await vi.advanceTimersByTimeAsync(400);
	} finally {
		proto.animate = original as typeof proto.animate;
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
