import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import ContextRing from "./ContextRing.svelte";
import type { TokenUsageData } from "../_internals/ai-types.js";
import { sound } from "../sound/sound.svelte.js";

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
 * Two real frames, then a Svelte flush: what the ring waits for before it writes
 * its target, so the empty state reaches the screen first.
 */
async function settle(): Promise<void> {
	await new Promise<void>((resolve) =>
		requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
	);
	await tick();
}

describe("ContextRing", () => {
	afterEach(cleanup);

	it("exposes the usage as a meter, without waiting for a frame to be correct", () => {
		const { container } = render(ContextRing, { props: { usage: usage() } });
		const el = meter(container);

		expect(el.getAttribute("aria-label")).toBe("Context usage");
		expect(el.getAttribute("aria-valuenow")).toBe("12400");
		expect(el.getAttribute("aria-valuemin")).toBe("0");
		expect(el.getAttribute("aria-valuemax")).toBe("200000");
	});

	it("spells the counts out in full for assistive tech", () => {
		const { container } = render(ContextRing, { props: { usage: usage() } });

		expect(meter(container).getAttribute("aria-valuetext")).toBe("12,400 of 200,000 tokens");
	});

	it("takes a custom name for what is being measured", () => {
		const { container } = render(ContextRing, {
			props: { usage: usage(), label: "Thread budget" },
		});

		expect(meter(container).getAttribute("aria-label")).toBe("Thread budget");
	});

	it("draws the arc at the exact fraction once the entrance has run", async () => {
		const { container } = render(ContextRing, { props: { usage: usage({ used: 50, max: 200 }) } });
		await settle();

		expect(drawn(container)).toBeCloseTo(0.25, 5);
	});

	it("starts empty so the fill has somewhere to animate from", async () => {
		const { container } = render(ContextRing, { props: { usage: usage({ used: 50, max: 200 }) } });

		expect(drawn(container)).toBeCloseTo(0, 5);
		await settle();
		expect(drawn(container)).toBeCloseTo(0.25, 5);
	});

	it("clamps an over-budget count to a closed ring and pins the meter at its max", async () => {
		const { container } = render(ContextRing, {
			props: { usage: usage({ used: 260_000, max: 200_000 }) },
		});
		await settle();

		expect(drawn(container)).toBeCloseTo(1, 5);
		expect(meter(container).getAttribute("aria-valuenow")).toBe("200000");
		// The spoken figure stays honest about the overrun.
		expect(meter(container).getAttribute("aria-valuetext")).toBe("260,000 of 200,000 tokens");
	});

	it("renders an empty ring rather than dividing by a budget of zero", async () => {
		const { container } = render(ContextRing, { props: { usage: usage({ used: 900, max: 0 }) } });
		await settle();

		expect(drawn(container)).toBeCloseTo(0, 5);
		expect(root(container).dataset.band).toBe("ok");
	});

	it.each([
		[0.5, "ok", "ft-status-pending"],
		[0.8, "warn", "ft-status-running"],
		[0.95, "critical", "ft-status-error"],
	])("puts %f in the %s band", (fraction, expectedBand, expectedClass) => {
		const { container } = render(ContextRing, {
			props: { usage: usage({ used: fraction * 200_000, max: 200_000 }) },
		});

		expect(root(container).dataset.band).toBe(expectedBand);
		expect(arc(container).classList.contains(expectedClass)).toBe(true);
	});

	it("moves the bands where the thresholds are set", () => {
		const { container } = render(ContextRing, {
			props: { usage: usage({ used: 60, max: 100 }), warnAt: 0.5, criticalAt: 0.55 },
		});

		expect(root(container).dataset.band).toBe("critical");
	});

	it("keeps criticalAt from sinking below warnAt when the two arrive swapped", () => {
		const { container } = render(ContextRing, {
			props: { usage: usage({ used: 80, max: 100 }), warnAt: 0.9, criticalAt: 0.5 },
		});

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
		const { container } = render(ContextRing, { props: { usage: usage({ used, max }) } });

		expect(labelText(container)).toBe(expected);
	});

	it("drops the figure when the ring should stand alone", () => {
		const { container } = render(ContextRing, {
			props: { usage: usage(), showLabel: false },
		});

		expect(container.querySelector(".ft-ctxring-label")).toBeNull();
		expect(meter(container)).not.toBeNull();
	});

	it("sizes the ring and its stroke from the props", () => {
		const { container } = render(ContextRing, {
			props: { usage: usage(), size: 40, strokeWidth: 5 },
		});
		const svg = container.querySelector(".ft-ctxring-ring") as SVGSVGElement;

		expect(svg.getAttribute("viewBox")).toBe("0 0 40 40");
		expect(arc(container).getAttribute("stroke-width")).toBe("5");
		// Radius is inset by half the stroke so the arc stays inside the box.
		expect(Number(arc(container).getAttribute("r"))).toBeCloseTo(17.5, 5);
		expect(arc(container).getAttribute("transform")).toBe("rotate(-90 20 20)");
	});

	it("stays a plain readout with nothing to press when it is not expandable", () => {
		const { container } = render(ContextRing, {
			props: { usage: usage({ breakdown: [{ label: "System prompt", tokens: 1200 }] }) },
		});

		expect(trigger(container)).toBeNull();
		expect(panel(container)).toBeNull();
	});

	it("opens a breakdown popover on click and lists every row", async () => {
		const { container } = render(ContextRing, {
			props: {
				usage: usage({
					breakdown: [
						{ label: "System prompt", tokens: 1200 },
						{ label: "Transcript", tokens: 9800 },
						{ label: "Tool results", tokens: 1400 },
					],
				}),
				expandable: true,
			},
		});

		const button = trigger(container) as HTMLButtonElement;
		expect(button.getAttribute("aria-expanded")).toBe("false");
		expect(panel(container)).toBeNull();

		await fireEvent.click(button);

		expect(button.getAttribute("aria-expanded")).toBe("true");
		expect(panel(container)?.id).toBe(button.getAttribute("aria-controls"));
		expect(rows(container)).toEqual(["System prompt 1.2k", "Transcript 9.8k", "Tool results 1.4k"]);
	});

	it("closes the popover on Escape", async () => {
		const { container } = render(ContextRing, {
			props: {
				usage: usage({ breakdown: [{ label: "System prompt", tokens: 1200 }] }),
				expandable: true,
			},
		});

		await fireEvent.click(trigger(container) as HTMLButtonElement);
		expect(panel(container)).not.toBeNull();

		await fireEvent.keyDown(window, { key: "Escape" });

		expect(panel(container)).toBeNull();
		expect(trigger(container)?.getAttribute("aria-expanded")).toBe("false");
	});

	it("closes the popover when the ring is pressed again", async () => {
		const { container } = render(ContextRing, {
			props: {
				usage: usage({ breakdown: [{ label: "System prompt", tokens: 1200 }] }),
				expandable: true,
			},
		});
		const button = trigger(container) as HTMLButtonElement;

		await fireEvent.click(button);
		await fireEvent.click(button);

		expect(panel(container)).toBeNull();
	});

	it("keeps both rows when a model reports the same label twice", async () => {
		const { container } = render(ContextRing, {
			props: {
				usage: usage({
					breakdown: [
						{ label: "Tool results", tokens: 1400 },
						{ label: "Tool results", tokens: 2600 },
					],
				}),
				expandable: true,
			},
		});

		await fireEvent.click(trigger(container) as HTMLButtonElement);

		expect(rows(container)).toEqual(["Tool results 1.4k", "Tool results 2.6k"]);
	});

	it("says so when a breakdown was asked for but never reported", async () => {
		const { container } = render(ContextRing, {
			props: { usage: usage(), expandable: true },
		});

		await fireEvent.click(trigger(container) as HTMLButtonElement);

		expect(panel(container)?.textContent?.trim()).toBe("No breakdown reported.");
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(ContextRing, {
			props: { usage: usage(), class: "my-ring" },
		});

		expect(root(container).className).toContain("my-ring");
		expect(root(container).className).toContain("ft-ctxring");
	});

	it("names the trigger with the reading, since the meter inside it is not exposed", () => {
		// A button flattens its descendants to presentational, so the nested meter
		// and its value never reach assistive tech.
		const { container } = render(ContextRing, {
			props: { usage: usage({ used: 12_400, max: 200_000 }), expandable: true },
		});

		expect(trigger(container)?.getAttribute("aria-label")).toBe(
			"Context usage, 12,400 of 200,000 tokens"
		);
	});

	it("closes the popover when expandability is taken away, and leaves it closed", async () => {
		const initial = {
			usage: usage({ breakdown: [{ label: "System prompt", tokens: 1200 }] }),
			expandable: true,
		};
		const { container, rerender } = render(ContextRing, { props: initial });

		await fireEvent.click(trigger(container) as HTMLButtonElement);
		expect(panel(container)).not.toBeNull();

		await rerender({ ...initial, expandable: false });
		await tick();
		expect(panel(container)).toBeNull();

		// Turning it back on must not reopen a panel nobody asked for again.
		await rerender({ ...initial, expandable: true });
		await tick();
		expect(panel(container)).toBeNull();
		expect(trigger(container)?.getAttribute("aria-expanded")).toBe("false");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays open exactly once when the trigger opens the popover", async () => {
			const { container } = render(ContextRing, {
				props: { usage: usage(), expandable: true, sound: true },
			});

			await fireEvent.click(trigger(container) as HTMLButtonElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(ContextRing, {
				props: { usage: usage(), expandable: true },
			});

			await fireEvent.click(trigger(container) as HTMLButtonElement);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while not expandable, even with sound enabled", () => {
			const { container } = render(ContextRing, {
				props: { usage: usage(), expandable: false, sound: true },
			});

			// No trigger renders at all — nothing to synthesize a click against —
			// so a direct dispatch on the root proves the meter itself is inert.
			root(container).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays close exactly once on a second press of the trigger", async () => {
			const { container } = render(ContextRing, {
				props: { usage: usage(), expandable: true, sound: true },
			});
			const button = trigger(container) as HTMLButtonElement;

			await fireEvent.click(button);
			play.mockClear();
			await fireEvent.click(button);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays close exactly once on Escape, and never twice for one dismissal", async () => {
			const { container } = render(ContextRing, {
				props: { usage: usage(), expandable: true, sound: true },
			});
			await fireEvent.click(trigger(container) as HTMLButtonElement);
			play.mockClear();

			await fireEvent.keyDown(window, { key: "Escape" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays close exactly once on a press outside", async () => {
			const { container } = render(ContextRing, {
				props: { usage: usage(), expandable: true, sound: true },
			});
			await fireEvent.click(trigger(container) as HTMLButtonElement);
			play.mockClear();

			document.body.dispatchEvent(
				new MouseEvent("pointerdown", { bubbles: true, cancelable: true })
			);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("stays silent when expandability is taken away — that close is bookkeeping, not a dismissal", async () => {
			const initial = { usage: usage(), expandable: true, sound: true };
			const { container, rerender } = render(ContextRing, { props: initial });
			await fireEvent.click(trigger(container) as HTMLButtonElement);
			play.mockClear();

			await rerender({ ...initial, expandable: false });
			await tick();

			expect(play).not.toHaveBeenCalled();
		});
	});
});
