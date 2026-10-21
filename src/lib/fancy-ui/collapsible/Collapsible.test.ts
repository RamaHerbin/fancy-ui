import { render, cleanup, fireEvent, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Harness from "./CollapsibleHarness.test.svelte";
import Collapsible from "./Collapsible.svelte";
import CollapsibleTrigger from "./CollapsibleTrigger.svelte";
import CollapsibleContent from "./CollapsibleContent.svelte";
import {
	DEFAULT_SETTLE_MS,
	SETTLE_SLACK_MS,
	parseTimeList,
	settleDelayMs,
} from "./collapsible-core.js";

const trigger = () => screen.getByTestId("trigger");
const content = () => screen.getByTestId("content");
const isHidden = (el: HTMLElement) => el.style.visibility === "hidden";
const isInert = (el: HTMLElement) => el.hasAttribute("inert");

/** The collapse finishing: the one `transitionend` the panel waits for. */
async function endCollapse(el: HTMLElement) {
	await fireEvent(
		el,
		Object.assign(new Event("transitionend", { bubbles: true }), {
			propertyName: "grid-template-rows",
		})
	);
}

function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("collapsible-core", () => {
	it("parses CSS time lists in seconds and milliseconds", () => {
		expect(parseTimeList("0.2s, 150ms")).toEqual([200, 150]);
		expect(parseTimeList("")).toEqual([]);
		expect(parseTimeList("auto")[0]).toBeNaN();
	});

	it("settles at once for reduced motion or a zero-length transition", () => {
		expect(settleDelayMs(null, true)).toBe(0);
		expect(settleDelayMs({ transitionDuration: "0s", transitionDelay: "0s" }, false)).toBe(0);
	});

	it("waits for the declared transition plus slack, or the default when none is declared", () => {
		expect(settleDelayMs({ transitionDuration: "0.24s", transitionDelay: "0s" }, false)).toBe(
			240 + SETTLE_SLACK_MS
		);
		expect(settleDelayMs({ transitionDuration: "200ms", transitionDelay: "50ms" }, false)).toBe(
			250 + SETTLE_SLACK_MS
		);
		expect(settleDelayMs({ transitionDuration: "", transitionDelay: "" }, false)).toBe(
			DEFAULT_SETTLE_MS + SETTLE_SLACK_MS
		);
		expect(settleDelayMs(null, false)).toBe(DEFAULT_SETTLE_MS + SETTLE_SLACK_MS);
	});
});

describe("Collapsible", () => {
	beforeEach(() => {
		vi.useFakeTimers();
	});

	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		vi.unstubAllGlobals();
	});

	describe("structure and ARIA", () => {
		it("starts closed: collapsed, inert and hidden, with the content still in the DOM", () => {
			render(Harness);
			expect(trigger().getAttribute("aria-expanded")).toBe("false");
			expect(content().getAttribute("data-state")).toBe("closed");
			expect(isInert(content())).toBe(true);
			expect(isHidden(content())).toBe(true);
			expect(screen.getByTestId("inside")).toBeInTheDocument();
		});

		it("links the trigger to the content through aria-controls and the content's id", () => {
			render(Harness);
			expect(content().id).not.toBe("");
			expect(trigger().getAttribute("aria-controls")).toBe(content().id);
			expect(trigger().id).not.toBe("");
		});

		it("renders the trigger as a native button that never submits a form", () => {
			render(Harness);
			expect(trigger().tagName).toBe("BUTTON");
			expect(trigger().getAttribute("type")).toBe("button");
		});

		it("starts open when open is true: expanded, interactive and visible", () => {
			render(Harness, { props: { open: true } });
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
			expect(content().getAttribute("data-state")).toBe("open");
			expect(isInert(content())).toBe(false);
			expect(isHidden(content())).toBe(false);
		});

		it("gives every collapsible its own id pair", () => {
			const first = render(Harness);
			const second = render(Harness);
			const ids = [
				...first.container.querySelectorAll("[id]"),
				...second.container.querySelectorAll("[id]"),
			].map((el) => el.id);
			expect(ids.length).toBe(4);
			expect(new Set(ids).size).toBe(ids.length);
		});
	});

	describe("toggling", () => {
		it("opens on click and reports onOpenChange(true) once", async () => {
			const onOpenChange = vi.fn();
			render(Harness, { props: { onOpenChange } });
			await fireEvent.click(trigger());
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
			expect(content().getAttribute("data-state")).toBe("open");
			expect(isInert(content())).toBe(false);
			expect(isHidden(content())).toBe(false);
			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(true);
		});

		it("closes on a second click and reports onOpenChange(false)", async () => {
			const onOpenChange = vi.fn();
			render(Harness, { props: { open: true, onOpenChange } });
			await fireEvent.click(trigger());
			expect(trigger().getAttribute("aria-expanded")).toBe("false");
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("round-trips through bind:open and follows an external change", async () => {
			const { rerender } = render(Harness, { props: { open: false } });
			await rerender({ open: true });
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
			expect(isInert(content())).toBe(false);
			await rerender({ open: false });
			expect(trigger().getAttribute("aria-expanded")).toBe("false");
		});

		it("keeps its own state when the parent binds nothing", async () => {
			render(Harness);
			await fireEvent.click(trigger());
			await fireEvent.click(trigger());
			await fireEvent.click(trigger());
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
		});
	});

	describe("disabled", () => {
		it("disables the trigger and ignores clicks, even a synthetic one", async () => {
			const onOpenChange = vi.fn();
			render(Harness, { props: { disabled: true, onOpenChange } });
			expect(trigger()).toBeDisabled();
			expect(trigger().getAttribute("data-disabled")).toBe("");
			await fireEvent.click(trigger());
			expect(onOpenChange).not.toHaveBeenCalled();
			expect(trigger().getAttribute("aria-expanded")).toBe("false");
		});

		it("still lets a controlled change open a disabled collapsible", async () => {
			const { rerender } = render(Harness, { props: { disabled: true } });
			await rerender({ open: true });
			expect(content().getAttribute("data-state")).toBe("open");
		});
	});

	describe("motion contract", () => {
		it("stays interactive-free but visible through the collapse, then hides on transitionend", async () => {
			render(Harness, { props: { open: true } });
			await fireEvent.click(trigger());
			// Closing: not interactive from the first frame, still painted until it settles.
			expect(content().getAttribute("data-state")).toBe("closed");
			expect(isInert(content())).toBe(true);
			expect(isHidden(content())).toBe(false);
			await endCollapse(content());
			expect(isHidden(content())).toBe(true);
			expect(isInert(content())).toBe(true);
			expect(screen.getByTestId("inside")).toBeInTheDocument();
		});

		it("ignores a transitionend from a child or for another property", async () => {
			render(Harness, { props: { open: true } });
			await fireEvent.click(trigger());
			await fireEvent(
				screen.getByTestId("inside"),
				Object.assign(new Event("transitionend", { bubbles: true }), {
					propertyName: "grid-template-rows",
				})
			);
			await fireEvent(
				content(),
				Object.assign(new Event("transitionend", { bubbles: true }), { propertyName: "opacity" })
			);
			expect(isHidden(content())).toBe(false);
		});

		it("settles on its own when no transitionend ever arrives", async () => {
			render(Harness, { props: { open: true } });
			await fireEvent.click(trigger());
			expect(isHidden(content())).toBe(false);
			await vi.advanceTimersByTimeAsync(DEFAULT_SETTLE_MS + SETTLE_SLACK_MS + 10);
			await tick();
			expect(isHidden(content())).toBe(true);
		});

		it("settles immediately under reduced motion, with no transitionend needed", async () => {
			stubReducedMotion(true);
			render(Harness, { props: { open: true } });
			await fireEvent.click(trigger());
			await tick();
			expect(isHidden(content())).toBe(true);
			expect(isInert(content())).toBe(true);
		});

		it("reads the motion preference at toggle time, not at mount", async () => {
			render(Harness, { props: { open: true } });
			stubReducedMotion(true);
			await fireEvent.click(trigger());
			await tick();
			expect(isHidden(content())).toBe(true);
		});

		it("declares a grid-rows collapse that is switched off for reduced motion", () => {
			render(Harness);
			const cls = content().className;
			expect(cls).toContain("grid-rows-[0fr]");
			expect(cls).toContain("data-[state=open]:grid-rows-[1fr]");
			expect(cls).toContain("transition-[grid-template-rows]");
			expect(cls).toContain("motion-reduce:transition-none");
		});
	});

	describe("interruption", () => {
		it("open, close, open inside the animation: one onOpenChange per toggle, ends open", async () => {
			const onOpenChange = vi.fn();
			render(Harness, { props: { onOpenChange } });
			await fireEvent.click(trigger());
			await fireEvent.click(trigger());
			await fireEvent.click(trigger());
			expect(onOpenChange.mock.calls).toEqual([[true], [false], [true]]);
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
			expect(content().getAttribute("data-state")).toBe("open");
			expect(isInert(content())).toBe(false);
			// The close that was interrupted must not hide the panel afterwards.
			await vi.advanceTimersByTimeAsync(1000);
			await tick();
			expect(isHidden(content())).toBe(false);
			expect(isInert(content())).toBe(false);
		});

		it("close, open, close inside the animation: ends closed and settles exactly once", async () => {
			const onOpenChange = vi.fn();
			render(Harness, { props: { open: true, onOpenChange } });
			await fireEvent.click(trigger());
			await fireEvent.click(trigger());
			await fireEvent.click(trigger());
			expect(onOpenChange.mock.calls).toEqual([[false], [true], [false]]);
			expect(content().getAttribute("data-state")).toBe("closed");
			expect(isHidden(content())).toBe(false);
			await endCollapse(content());
			expect(isHidden(content())).toBe(true);
		});

		it("a transitionend left over from an interrupted close does not hide a reopened panel", async () => {
			render(Harness, { props: { open: true } });
			await fireEvent.click(trigger());
			await fireEvent.click(trigger());
			await endCollapse(content());
			expect(content().getAttribute("data-state")).toBe("open");
			expect(isHidden(content())).toBe(false);
		});
	});

	describe("forceMount", () => {
		it("keeps the children in the DOM while closed by default", async () => {
			render(Harness);
			expect(screen.getByTestId("inside")).toBeInTheDocument();
		});

		it("with forceMount={false}, unmounts the children once closed and settled", async () => {
			render(Harness, { props: { open: true, forceMount: false } });
			expect(screen.getByTestId("inside")).toBeInTheDocument();
			await fireEvent.click(trigger());
			// Still there for the length of the collapse.
			expect(screen.getByTestId("inside")).toBeInTheDocument();
			await endCollapse(content());
			expect(screen.queryByTestId("inside")).toBeNull();
			// The region itself stays, so the next open has something to grow from.
			expect(content()).toBeInTheDocument();
		});

		it("with forceMount={false}, mounts the children again on open", async () => {
			render(Harness, { props: { forceMount: false } });
			expect(screen.queryByTestId("inside")).toBeNull();
			await fireEvent.click(trigger());
			expect(screen.getByTestId("inside")).toBeInTheDocument();
		});
	});

	describe("outside a root", () => {
		it("renders a plain button and a closed region without throwing", () => {
			render(CollapsibleTrigger, { props: { "data-testid": "lone" } });
			expect(screen.getByTestId("lone").tagName).toBe("BUTTON");
			expect(screen.getByTestId("lone").hasAttribute("aria-expanded")).toBe(false);
			render(CollapsibleContent, { props: { "data-testid": "lone-content" } });
			expect(screen.getByTestId("lone-content").getAttribute("data-state")).toBe("closed");
		});
	});

	describe("refs and classes", () => {
		it("merges class onto the root, the trigger and the content body", () => {
			render(Harness, {
				props: { rootClass: "r-x", triggerClass: "t-x", contentClass: "c-x" },
			});
			expect(screen.getByTestId("root")).toHaveClass("r-x");
			expect(trigger()).toHaveClass("t-x");
			// The body, not the region: padding there still collapses with the grid.
			expect(screen.getByTestId("inside").parentElement).toHaveClass("c-x");
			expect(content()).not.toHaveClass("c-x");
		});

		it("binds the root, the trigger and the content region", async () => {
			let rootRef: HTMLDivElement | null = null;
			let triggerRef: HTMLButtonElement | null = null;
			let contentRef: HTMLDivElement | null = null;
			render(Harness, {
				props: {
					get rootRef() {
						return rootRef;
					},
					set rootRef(v) {
						rootRef = v;
					},
					get triggerRef() {
						return triggerRef;
					},
					set triggerRef(v) {
						triggerRef = v;
					},
					get contentRef() {
						return contentRef;
					},
					set contentRef(v) {
						contentRef = v;
					},
				},
			});
			await tick();
			expect(rootRef).toBe(screen.getByTestId("root"));
			expect(triggerRef).toBe(trigger());
			expect(contentRef).toBe(content());
		});
	});
});
