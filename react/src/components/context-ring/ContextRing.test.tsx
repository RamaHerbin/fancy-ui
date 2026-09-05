import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { useLayoutEffect } from "react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { ContextRing } from "./ContextRing.js";
import type { TokenUsageData } from "../../internals/ai-types.js";
import { resetSoundForTests, sound } from "../../sound/sound.js";

function usage(overrides: Partial<TokenUsageData> = {}): TokenUsageData {
	return { used: 12_400, max: 200_000, ...overrides };
}

function root(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-ctxring") as HTMLElement;
}

function meter(container: HTMLElement): HTMLElement {
	return container.querySelector('[role="meter"]') as HTMLElement;
}

function arc(container: HTMLElement): SVGCircleElement {
	return container.querySelector(".ft-ctxring-value") as SVGCircleElement;
}

function trigger(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector(".ft-ctxring-trigger");
}

function panel(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-ctxring-panel");
}

function labelText(container: HTMLElement): string {
	return container.querySelector(".ft-ctxring-label")?.textContent?.trim() ?? "";
}

function rows(container: HTMLElement): string[] {
	return [...container.querySelectorAll(".ft-ctxring-row")].map((el) =>
		(el.textContent ?? "").replace(/\s+/g, " ").trim()
	);
}

/** The fraction the arc is currently drawn at, read back off its dash attributes. */
function drawn(container: HTMLElement): number {
	const circle = arc(container);
	const circumference = Number(circle.getAttribute("stroke-dasharray"));
	const offset = Number(circle.getAttribute("stroke-dashoffset"));
	return 1 - offset / circumference;
}

/**
 * Two real frames: what the ring waits for before it writes its target, so the
 * empty state reaches the screen first. Wrapped in `act` so the state write the
 * second frame performs is flushed into the DOM before the assertions read it.
 */
async function settle(): Promise<void> {
	await act(async () => {
		await new Promise<void>((resolve) =>
			requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
		);
	});
}

/**
 * jsdom has no motion preference of its own, so the query is answered by a stub.
 * `onQuery` records the moment the ring asks, which is what tells a pre-paint
 * write apart from one made after the browser has already painted.
 */
function stubMatchMedia(matches: boolean, onQuery?: () => void): void {
	vi.stubGlobal("matchMedia", (query: string) => {
		onQuery?.();
		return {
			matches,
			media: query,
			onchange: null,
			addEventListener: () => {},
			removeEventListener: () => {},
			dispatchEvent: () => false,
			addListener: () => {},
			removeListener: () => {},
		};
	});
}

describe("ContextRing", () => {
	afterEach(cleanup);

	it("exposes the usage as a meter, without waiting for a frame to be correct", () => {
		const { container } = render(<ContextRing usage={usage()} />);
		const el = meter(container);

		expect(el.getAttribute("aria-label")).toBe("Context usage");
		expect(el.getAttribute("aria-valuenow")).toBe("12400");
		expect(el.getAttribute("aria-valuemin")).toBe("0");
		expect(el.getAttribute("aria-valuemax")).toBe("200000");
	});

	it("spells the counts out in full for assistive tech", () => {
		const { container } = render(<ContextRing usage={usage()} />);

		expect(meter(container).getAttribute("aria-valuetext")).toBe("12,400 of 200,000 tokens");
	});

	it("takes a custom name for what is being measured", () => {
		const { container } = render(<ContextRing usage={usage()} label="Thread budget" />);

		expect(meter(container).getAttribute("aria-label")).toBe("Thread budget");
	});

	it("draws the arc at the exact fraction once the entrance has run", async () => {
		const { container } = render(<ContextRing usage={usage({ used: 50, max: 200 })} />);
		await settle();

		expect(drawn(container)).toBeCloseTo(0.25, 5);
	});

	it("starts empty so the fill has somewhere to animate from", async () => {
		const { container } = render(<ContextRing usage={usage({ used: 50, max: 200 })} />);

		expect(drawn(container)).toBeCloseTo(0, 5);
		await settle();
		expect(drawn(container)).toBeCloseTo(0.25, 5);
	});

	it("clamps an over-budget count to a closed ring and pins the meter at its max", async () => {
		const { container } = render(<ContextRing usage={usage({ used: 260_000, max: 200_000 })} />);
		await settle();

		expect(drawn(container)).toBeCloseTo(1, 5);
		expect(meter(container).getAttribute("aria-valuenow")).toBe("200000");
		// The spoken figure stays honest about the overrun.
		expect(meter(container).getAttribute("aria-valuetext")).toBe("260,000 of 200,000 tokens");
	});

	it("renders an empty ring rather than dividing by a budget of zero", async () => {
		const { container } = render(<ContextRing usage={usage({ used: 900, max: 0 })} />);
		await settle();

		expect(drawn(container)).toBeCloseTo(0, 5);
		expect(root(container).dataset.band).toBe("ok");
	});

	it.each([
		[0.5, "ok", "ft-status-pending"],
		[0.8, "warn", "ft-status-running"],
		[0.95, "critical", "ft-status-error"],
	])("puts %f in the %s band", (fraction, expectedBand, expectedClass) => {
		const { container } = render(
			<ContextRing usage={usage({ used: fraction * 200_000, max: 200_000 })} />
		);

		expect(root(container).dataset.band).toBe(expectedBand);
		expect(arc(container).classList.contains(expectedClass)).toBe(true);
	});

	it("moves the bands where the thresholds are set", () => {
		const { container } = render(
			<ContextRing usage={usage({ used: 60, max: 100 })} warnAt={0.5} criticalAt={0.55} />
		);

		expect(root(container).dataset.band).toBe("critical");
	});

	it("keeps criticalAt from sinking below warnAt when the two arrive swapped", () => {
		const { container } = render(
			<ContextRing usage={usage({ used: 80, max: 100 })} warnAt={0.9} criticalAt={0.5} />
		);

		// 0.8 is under the 0.9 warn line, so it stays quiet rather than being read as
		// critical by a threshold that was accidentally set lower than the warning.
		expect(root(container).dataset.band).toBe("ok");
	});

	it.each([
		[850, 200_000, "850 / 200k"],
		[12_400, 200_000, "12.4k / 200k"],
		[154_000, 200_000, "154k / 200k"],
		[1000, 8000, "1k / 8k"],
	])("formats %i of %i compactly", (used, max, expected) => {
		const { container } = render(<ContextRing usage={usage({ used, max })} />);

		expect(labelText(container)).toBe(expected);
	});

	it("drops the figure when the ring should stand alone", () => {
		const { container } = render(<ContextRing usage={usage()} showLabel={false} />);

		expect(container.querySelector(".ft-ctxring-label")).toBeNull();
		expect(meter(container)).not.toBeNull();
	});

	it("sizes the ring and its stroke from the props", () => {
		const { container } = render(<ContextRing usage={usage()} size={40} strokeWidth={5} />);
		const svg = container.querySelector(".ft-ctxring-ring") as SVGSVGElement;

		expect(svg.getAttribute("viewBox")).toBe("0 0 40 40");
		expect(arc(container).getAttribute("stroke-width")).toBe("5");
		// Radius is inset by half the stroke so the arc stays inside the box.
		expect(Number(arc(container).getAttribute("r"))).toBeCloseTo(17.5, 5);
		expect(arc(container).getAttribute("transform")).toBe("rotate(-90 20 20)");
	});

	it("stays a plain readout with nothing to press when it is not expandable", () => {
		const { container } = render(
			<ContextRing usage={usage({ breakdown: [{ label: "System prompt", tokens: 1200 }] })} />
		);

		expect(trigger(container)).toBeNull();
		expect(panel(container)).toBeNull();
	});

	it("opens a breakdown popover on click and lists every row", async () => {
		const { container } = render(
			<ContextRing
				usage={usage({
					breakdown: [
						{ label: "System prompt", tokens: 1200 },
						{ label: "Transcript", tokens: 9800 },
						{ label: "Tool results", tokens: 1400 },
					],
				})}
				expandable
			/>
		);

		const button = trigger(container) as HTMLButtonElement;
		expect(button.getAttribute("aria-expanded")).toBe("false");
		expect(panel(container)).toBeNull();

		fireEvent.click(button);

		expect(button.getAttribute("aria-expanded")).toBe("true");
		expect(panel(container)?.id).toBe(button.getAttribute("aria-controls"));
		expect(rows(container)).toEqual(["System prompt 1.2k", "Transcript 9.8k", "Tool results 1.4k"]);
	});

	it("closes the popover on Escape", async () => {
		const { container } = render(
			<ContextRing
				usage={usage({ breakdown: [{ label: "System prompt", tokens: 1200 }] })}
				expandable
			/>
		);

		fireEvent.click(trigger(container) as HTMLButtonElement);
		expect(panel(container)).not.toBeNull();

		fireEvent.keyDown(window, { key: "Escape" });

		expect(panel(container)).toBeNull();
		expect(trigger(container)?.getAttribute("aria-expanded")).toBe("false");
	});

	it("closes the popover when the ring is pressed again", async () => {
		const { container } = render(
			<ContextRing
				usage={usage({ breakdown: [{ label: "System prompt", tokens: 1200 }] })}
				expandable
			/>
		);
		const button = trigger(container) as HTMLButtonElement;

		fireEvent.click(button);
		fireEvent.click(button);

		expect(panel(container)).toBeNull();
	});

	it("keeps both rows when a model reports the same label twice", async () => {
		const { container } = render(
			<ContextRing
				usage={usage({
					breakdown: [
						{ label: "Tool results", tokens: 1400 },
						{ label: "Tool results", tokens: 2600 },
					],
				})}
				expandable
			/>
		);

		fireEvent.click(trigger(container) as HTMLButtonElement);

		expect(rows(container)).toEqual(["Tool results 1.4k", "Tool results 2.6k"]);
	});

	it("says so when a breakdown was asked for but never reported", async () => {
		const { container } = render(<ContextRing usage={usage()} expandable />);

		fireEvent.click(trigger(container) as HTMLButtonElement);

		expect(panel(container)?.textContent?.trim()).toBe("No breakdown reported.");
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(<ContextRing usage={usage()} className="my-ring" />);

		expect(root(container).className).toContain("my-ring");
		expect(root(container).className).toContain("ft-ctxring");
	});

	it("names the trigger with the reading, since the meter inside it is not exposed", () => {
		// A button flattens its descendants to presentational, so the nested meter
		// and its value never reach assistive tech.
		const { container } = render(
			<ContextRing usage={usage({ used: 12_400, max: 200_000 })} expandable />
		);

		expect(trigger(container)?.getAttribute("aria-label")).toBe(
			"Context usage, 12,400 of 200,000 tokens"
		);
	});

	it("writes the settled arc before paint under reduced motion", () => {
		// The source writes the target from `onMount`, which is flushed before the
		// browser paints; a passive effect would run after it and show one frame of
		// empty ring. The phase is observed through the order the preference query
		// lands in relative to a later sibling's layout effect: in the layout phase
		// the ring asks first, in a passive effect it would ask after every layout
		// effect in the same commit.
		const order: string[] = [];
		stubMatchMedia(true, () => order.push("ring"));

		function Probe() {
			useLayoutEffect(() => {
				order.push("probe-layout");
			}, []);
			return null;
		}

		try {
			const { container } = render(
				<>
					<ContextRing usage={usage({ used: 50, max: 200 })} />
					<Probe />
				</>
			);

			expect(order).toEqual(["ring", "probe-layout"]);
			// And the arc is at its full length with no frame to wait for.
			expect(drawn(container)).toBeCloseTo(0.25, 5);
		} finally {
			vi.unstubAllGlobals();
		}
	});

	it("closes the popover when expandability is taken away, and leaves it closed", async () => {
		const initial = {
			usage: usage({ breakdown: [{ label: "System prompt", tokens: 1200 }] }),
		};
		const { container, rerender } = render(<ContextRing {...initial} expandable />);

		fireEvent.click(trigger(container) as HTMLButtonElement);
		expect(panel(container)).not.toBeNull();

		rerender(<ContextRing {...initial} expandable={false} />);
		expect(panel(container)).toBeNull();

		// Turning it back on must not reopen a panel nobody asked for again.
		rerender(<ContextRing {...initial} expandable />);
		expect(panel(container)).toBeNull();
		expect(trigger(container)?.getAttribute("aria-expanded")).toBe("false");
	});
	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays open exactly once when the trigger opens the popover", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ContextRing usage={usage()} expandable sound />);

			fireEvent.click(trigger(container) as HTMLButtonElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ContextRing usage={usage()} expandable />);

			fireEvent.click(trigger(container) as HTMLButtonElement);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while not expandable, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ContextRing usage={usage()} expandable={false} sound />);

			// No trigger renders at all — nothing to synthesize a click against —
			// so a direct dispatch on the root proves the meter itself is inert.
			fireEvent.click(root(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays close exactly once on a second press of the trigger", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ContextRing usage={usage()} expandable sound />);
			const button = trigger(container) as HTMLButtonElement;

			fireEvent.click(button);
			play.mockClear();
			fireEvent.click(button);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays close exactly once on Escape, and never twice for one dismissal", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ContextRing usage={usage()} expandable sound />);
			fireEvent.click(trigger(container) as HTMLButtonElement);
			play.mockClear();

			fireEvent.keyDown(window, { key: "Escape" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays close exactly once on a press outside", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(<ContextRing usage={usage()} expandable sound />);
			fireEvent.click(trigger(container) as HTMLButtonElement);
			play.mockClear();

			act(() => {
				document.body.dispatchEvent(
					new MouseEvent("pointerdown", { bubbles: true, cancelable: true })
				);
			});

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("stays silent when expandability is taken away — that close is bookkeeping, not a dismissal", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container, rerender } = render(<ContextRing usage={usage()} expandable sound />);
			fireEvent.click(trigger(container) as HTMLButtonElement);
			play.mockClear();

			rerender(<ContextRing usage={usage()} expandable={false} sound />);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
