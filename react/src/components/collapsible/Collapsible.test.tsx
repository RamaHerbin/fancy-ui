import { createRef, StrictMode, useState } from "react";
import type { ComponentProps } from "react";
import { render, cleanup, fireEvent, act, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import { Collapsible } from "./Collapsible.js";
import { CollapsibleTrigger } from "./CollapsibleTrigger.js";
import { CollapsibleContent } from "./CollapsibleContent.js";
import {
	DEFAULT_SETTLE_MS,
	SETTLE_SLACK_MS,
	parseTimeList,
	settleDelayMs,
} from "./collapsible-core.js";

interface HarnessProps {
	open?: boolean;
	defaultOpen?: boolean;
	onOpenChange?: (open: boolean) => void;
	disabled?: boolean;
	forceMount?: boolean;
	rootClassName?: string;
	triggerClassName?: string;
	contentClassName?: string;
	rootRef?: React.Ref<HTMLDivElement>;
	triggerRef?: React.Ref<HTMLButtonElement>;
	contentRef?: React.Ref<HTMLDivElement>;
	rootAttrs?: ComponentProps<"div">;
	triggerAttrs?: ComponentProps<"button">;
	contentAttrs?: ComponentProps<"div">;
}

/**
 * Test-only rig, the counterpart of the Svelte suite's
 * `CollapsibleHarness.test.svelte`: a real root with its trigger and content.
 * `open` is passed straight through, so a caller choosing it makes the root
 * controlled, exactly as a consumer would.
 */
function Harness({
	open,
	defaultOpen,
	onOpenChange,
	disabled,
	forceMount,
	rootClassName,
	triggerClassName,
	contentClassName,
	rootRef,
	triggerRef,
	contentRef,
	rootAttrs,
	triggerAttrs,
	contentAttrs,
}: HarnessProps) {
	return (
		<Collapsible
			ref={rootRef}
			open={open}
			defaultOpen={defaultOpen}
			onOpenChange={onOpenChange}
			disabled={disabled}
			className={rootClassName}
			data-testid="root"
			{...rootAttrs}
		>
			<CollapsibleTrigger
				ref={triggerRef}
				className={triggerClassName}
				data-testid="trigger"
				{...triggerAttrs}
			>
				Toggle
			</CollapsibleTrigger>
			<CollapsibleContent
				ref={contentRef}
				forceMount={forceMount}
				className={contentClassName}
				data-testid="content"
				{...contentAttrs}
			>
				<button type="button" data-testid="inside">
					Inside
				</button>
			</CollapsibleContent>
		</Collapsible>
	);
}

/** A parent that owns the state, the way a controlled consumer does. */
function Controlled({ initial = false, ...rest }: HarnessProps & { initial?: boolean }) {
	const [open, setOpen] = useState(initial);
	return (
		<>
			<button type="button" data-testid="outside" onClick={() => setOpen((o) => !o)}>
				Outside
			</button>
			<Harness
				{...rest}
				open={open}
				onOpenChange={(next) => {
					setOpen(next);
					rest.onOpenChange?.(next);
				}}
			/>
		</>
	);
}

const trigger = () => screen.getByTestId("trigger");
const content = () => screen.getByTestId("content");
const isHidden = (el: HTMLElement) => el.style.visibility === "hidden";
const isInert = (el: HTMLElement) => el.hasAttribute("inert");

/** The collapse finishing: the one `transitionend` the panel waits for. */
function endCollapse(el: HTMLElement) {
	fireEvent(
		el,
		Object.assign(new Event("transitionend", { bubbles: true }), {
			propertyName: "grid-template-rows",
		})
	);
}

async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
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
			render(<Harness />);
			expect(trigger().getAttribute("aria-expanded")).toBe("false");
			expect(content().getAttribute("data-state")).toBe("closed");
			expect(isInert(content())).toBe(true);
			expect(isHidden(content())).toBe(true);
			expect(screen.getByTestId("inside")).toBeInTheDocument();
		});

		it("links the trigger to the content through aria-controls and the content's id", () => {
			render(<Harness />);
			expect(content().id).not.toBe("");
			expect(trigger().getAttribute("aria-controls")).toBe(content().id);
			expect(trigger().id).not.toBe("");
		});

		it("renders the trigger as a native button that never submits a form", () => {
			render(<Harness />);
			expect(trigger().tagName).toBe("BUTTON");
			expect(trigger().getAttribute("type")).toBe("button");
		});

		it("starts open with defaultOpen: expanded, interactive and visible", () => {
			render(<Harness defaultOpen />);
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
			expect(content().getAttribute("data-state")).toBe("open");
			expect(isInert(content())).toBe(false);
			expect(isHidden(content())).toBe(false);
		});

		it("gives every collapsible its own id pair", () => {
			const first = render(<Harness />);
			const second = render(<Harness />);
			const ids = [
				...first.container.querySelectorAll("[id]"),
				...second.container.querySelectorAll("[id]"),
			].map((el) => el.id);
			expect(ids.length).toBe(4);
			expect(new Set(ids).size).toBe(ids.length);
		});
	});

	describe("toggling", () => {
		it("opens on click and reports onOpenChange(true) once", () => {
			const onOpenChange = vi.fn();
			render(<Harness onOpenChange={onOpenChange} />);
			fireEvent.click(trigger());
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
			expect(content().getAttribute("data-state")).toBe("open");
			expect(isInert(content())).toBe(false);
			expect(isHidden(content())).toBe(false);
			expect(onOpenChange).toHaveBeenCalledTimes(1);
			expect(onOpenChange).toHaveBeenCalledWith(true);
		});

		it("closes on a second click and reports onOpenChange(false)", () => {
			const onOpenChange = vi.fn();
			render(<Harness defaultOpen onOpenChange={onOpenChange} />);
			fireEvent.click(trigger());
			expect(trigger().getAttribute("aria-expanded")).toBe("false");
			expect(onOpenChange).toHaveBeenCalledWith(false);
		});

		it("follows a controlled value and only changes when the parent writes it back", () => {
			const onOpenChange = vi.fn();
			const { rerender } = render(<Harness open={false} onOpenChange={onOpenChange} />);
			fireEvent.click(trigger());
			expect(onOpenChange).toHaveBeenCalledWith(true);
			// The parent did not accept the change: still closed.
			expect(trigger().getAttribute("aria-expanded")).toBe("false");
			rerender(<Harness open onOpenChange={onOpenChange} />);
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
			expect(isInert(content())).toBe(false);
		});

		it("round-trips through a parent that owns the state", () => {
			render(<Controlled />);
			fireEvent.click(trigger());
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
			fireEvent.click(screen.getByTestId("outside"));
			expect(trigger().getAttribute("aria-expanded")).toBe("false");
		});

		it("keeps its own state when uncontrolled", () => {
			render(<Harness />);
			fireEvent.click(trigger());
			fireEvent.click(trigger());
			fireEvent.click(trigger());
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
		});
	});

	describe("disabled", () => {
		it("disables the trigger and ignores clicks, even a synthetic one", () => {
			const onOpenChange = vi.fn();
			render(<Harness disabled onOpenChange={onOpenChange} />);
			expect(trigger()).toBeDisabled();
			expect(trigger().getAttribute("data-disabled")).toBe("");
			fireEvent.click(trigger());
			expect(onOpenChange).not.toHaveBeenCalled();
			expect(trigger().getAttribute("aria-expanded")).toBe("false");
		});

		it("still lets a controlled change open a disabled collapsible", () => {
			const { rerender } = render(<Harness disabled open={false} />);
			rerender(<Harness disabled open />);
			expect(content().getAttribute("data-state")).toBe("open");
		});
	});

	describe("motion contract", () => {
		it("stays interactive-free but visible through the collapse, then hides on transitionend", () => {
			render(<Harness defaultOpen />);
			fireEvent.click(trigger());
			// Closing: not interactive from the first frame, still painted until it settles.
			expect(content().getAttribute("data-state")).toBe("closed");
			expect(isInert(content())).toBe(true);
			expect(isHidden(content())).toBe(false);
			endCollapse(content());
			expect(isHidden(content())).toBe(true);
			expect(isInert(content())).toBe(true);
			expect(screen.getByTestId("inside")).toBeInTheDocument();
		});

		it("ignores a transitionend from a child or for another property", () => {
			render(<Harness defaultOpen />);
			fireEvent.click(trigger());
			fireEvent(
				screen.getByTestId("inside"),
				Object.assign(new Event("transitionend", { bubbles: true }), {
					propertyName: "grid-template-rows",
				})
			);
			fireEvent(
				content(),
				Object.assign(new Event("transitionend", { bubbles: true }), { propertyName: "opacity" })
			);
			expect(isHidden(content())).toBe(false);
		});

		it("settles on its own when no transitionend ever arrives", async () => {
			render(<Harness defaultOpen />);
			fireEvent.click(trigger());
			expect(isHidden(content())).toBe(false);
			await advance(DEFAULT_SETTLE_MS + SETTLE_SLACK_MS + 10);
			expect(isHidden(content())).toBe(true);
		});

		it("settles immediately under reduced motion, with no transitionend needed", () => {
			stubReducedMotion(true);
			render(<Harness defaultOpen />);
			fireEvent.click(trigger());
			expect(isHidden(content())).toBe(true);
			expect(isInert(content())).toBe(true);
		});

		it("reads the motion preference at toggle time, not at mount", () => {
			render(<Harness defaultOpen />);
			stubReducedMotion(true);
			fireEvent.click(trigger());
			expect(isHidden(content())).toBe(true);
		});

		it("declares a grid-rows collapse that is switched off for reduced motion", () => {
			render(<Harness />);
			const cls = content().className;
			expect(cls).toContain("grid-rows-[0fr]");
			expect(cls).toContain("data-[state=open]:grid-rows-[1fr]");
			expect(cls).toContain("transition-[grid-template-rows]");
			expect(cls).toContain("motion-reduce:transition-none");
		});

		it("survives StrictMode's double effects", async () => {
			render(
				<StrictMode>
					<Harness defaultOpen />
				</StrictMode>
			);
			fireEvent.click(trigger());
			await advance(DEFAULT_SETTLE_MS + SETTLE_SLACK_MS + 10);
			expect(isHidden(content())).toBe(true);
		});
	});

	describe("interruption", () => {
		it("open, close, open inside the animation: one onOpenChange per toggle, ends open", async () => {
			const onOpenChange = vi.fn();
			render(<Harness onOpenChange={onOpenChange} />);
			fireEvent.click(trigger());
			fireEvent.click(trigger());
			fireEvent.click(trigger());
			expect(onOpenChange.mock.calls).toEqual([[true], [false], [true]]);
			expect(trigger().getAttribute("aria-expanded")).toBe("true");
			expect(content().getAttribute("data-state")).toBe("open");
			expect(isInert(content())).toBe(false);
			// The close that was interrupted must not hide the panel afterwards.
			await advance(1000);
			expect(isHidden(content())).toBe(false);
			expect(isInert(content())).toBe(false);
		});

		it("close, open, close inside the animation: ends closed and settles exactly once", () => {
			const onOpenChange = vi.fn();
			render(<Harness defaultOpen onOpenChange={onOpenChange} />);
			fireEvent.click(trigger());
			fireEvent.click(trigger());
			fireEvent.click(trigger());
			expect(onOpenChange.mock.calls).toEqual([[false], [true], [false]]);
			expect(content().getAttribute("data-state")).toBe("closed");
			expect(isHidden(content())).toBe(false);
			endCollapse(content());
			expect(isHidden(content())).toBe(true);
		});

		it("a transitionend left over from an interrupted close does not hide a reopened panel", () => {
			render(<Harness defaultOpen />);
			fireEvent.click(trigger());
			fireEvent.click(trigger());
			endCollapse(content());
			expect(content().getAttribute("data-state")).toBe("open");
			expect(isHidden(content())).toBe(false);
		});
	});

	describe("forceMount", () => {
		it("keeps the children in the DOM while closed by default", () => {
			render(<Harness />);
			expect(screen.getByTestId("inside")).toBeInTheDocument();
		});

		it("with forceMount={false}, unmounts the children once closed and settled", () => {
			render(<Harness defaultOpen forceMount={false} />);
			expect(screen.getByTestId("inside")).toBeInTheDocument();
			fireEvent.click(trigger());
			// Still there for the length of the collapse.
			expect(screen.getByTestId("inside")).toBeInTheDocument();
			endCollapse(content());
			expect(screen.queryByTestId("inside")).toBeNull();
			// The region itself stays, so the next open has something to grow from.
			expect(content()).toBeInTheDocument();
		});

		it("with forceMount={false}, mounts the children again on open", () => {
			render(<Harness forceMount={false} />);
			expect(screen.queryByTestId("inside")).toBeNull();
			fireEvent.click(trigger());
			expect(screen.getByTestId("inside")).toBeInTheDocument();
		});
	});

	describe("outside a root", () => {
		it("renders a plain button and a closed region without throwing", () => {
			render(<CollapsibleTrigger data-testid="lone">Lone</CollapsibleTrigger>);
			expect(screen.getByTestId("lone").tagName).toBe("BUTTON");
			expect(screen.getByTestId("lone").hasAttribute("aria-expanded")).toBe(false);
			render(<CollapsibleContent data-testid="lone-content">Body</CollapsibleContent>);
			expect(screen.getByTestId("lone-content").getAttribute("data-state")).toBe("closed");
		});
	});

	describe("refs and classes", () => {
		it("merges className onto the root, the trigger and the content body", () => {
			render(<Harness rootClassName="r-x" triggerClassName="t-x" contentClassName="c-x" />);
			expect(screen.getByTestId("root")).toHaveClass("r-x");
			expect(trigger()).toHaveClass("t-x");
			// The body, not the region: padding there still collapses with the grid.
			expect(screen.getByTestId("inside").parentElement).toHaveClass("c-x");
			expect(content()).not.toHaveClass("c-x");
		});

		it("exposes the root, the trigger and the content region through refs", () => {
			const rootRef = createRef<HTMLDivElement>();
			const triggerRef = createRef<HTMLButtonElement>();
			const contentRef = createRef<HTMLDivElement>();
			render(<Harness rootRef={rootRef} triggerRef={triggerRef} contentRef={contentRef} />);
			expect(rootRef.current).toBe(screen.getByTestId("root"));
			expect(triggerRef.current).toBe(trigger());
			expect(contentRef.current).toBe(content());
		});
	});
});
