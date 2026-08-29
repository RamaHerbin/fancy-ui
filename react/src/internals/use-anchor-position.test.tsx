// The React layer only. `computePosition` and the `attachAnchorPosition` core
// — the flip, the clamp, the resolved-align derivation and the `onPlacement`
// dedupe — are covered assertion-for-assertion in `anchor-position.test.ts`.

import { StrictMode, useCallback } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import type { Align, Side } from "./anchor-position.js";
import { useElementRef } from "./dom/use-element-ref.js";
import { useAnchorPosition } from "./use-anchor-position.js";
import type { ResolvedPlacement } from "./use-anchor-position.js";

function rect(partial: Partial<DOMRect>): DOMRect {
	const { x = 0, y = 0, width = 0, height = 0 } = partial;
	return {
		x,
		y,
		width,
		height,
		top: y,
		left: x,
		right: x + width,
		bottom: y + height,
		toJSON() {
			return this;
		},
	};
}

interface ProbeProps {
	side?: Side;
	align?: Align;
	offset?: number;
	enabled?: boolean;
	/** Stable across re-renders on purpose — a new ref callback would detach. */
	anchorRect: () => DOMRect;
	nodeRect: () => DOMRect;
	onPlacement?: (side: Side, align: Align) => void;
	seen?: ResolvedPlacement[];
	label?: string;
}

/**
 * jsdom gives every element a zero rect, so both the anchor and the floating
 * node need stubbed geometry for a flip to be reachable at all. The viewport
 * is jsdom's default 1024x768.
 */
function Probe({
	side,
	align,
	offset,
	enabled,
	anchorRect,
	nodeRect,
	onPlacement,
	seen,
	label,
}: ProbeProps) {
	const [node, publishNode] = useElementRef<HTMLDivElement>();
	const [anchor, publishAnchor] = useElementRef<HTMLButtonElement>();

	const placement = useAnchorPosition(node, {
		anchor,
		side,
		align,
		offset,
		enabled,
		onPlacement,
	});
	seen?.push(placement);

	const setAnchor = useCallback(
		(el: HTMLButtonElement | null) => {
			if (el) el.getBoundingClientRect = anchorRect;
			publishAnchor(el);
		},
		[publishAnchor, anchorRect]
	);
	const setNode = useCallback(
		(el: HTMLDivElement | null) => {
			if (el) el.getBoundingClientRect = nodeRect;
			publishNode(el);
		},
		[publishNode, nodeRect]
	);

	return (
		<>
			<button type="button" data-testid="anchor" ref={setAnchor} />
			<div data-testid="panel" ref={setNode}>
				{label}
			</div>
		</>
	);
}

describe("useAnchorPosition", () => {
	afterEach(cleanup);

	it("seeds the placement with the REQUESTED side and align, not a hardcoded bottom/center", () => {
		// Near the top edge, so the requested "top" cannot survive the flip —
		// which is what makes the seed observable as a distinct value.
		const anchorRect = () => rect({ x: 100, y: 10, width: 50, height: 20 });
		const nodeRect = () => rect({ width: 200, height: 100 });
		const seen: ResolvedPlacement[] = [];

		render(
			<Probe side="top" align="start" anchorRect={anchorRect} nodeRect={nodeRect} seen={seen} />
		);

		// A "bottom"/"center" seed would show as a one-frame transform-origin
		// jump on every open; only a real flip may move the origin.
		expect(seen[0]).toEqual({ side: "top", align: "start" });
		expect(seen.at(-1)).toEqual({ side: "bottom", align: "start" });
	});

	it("returns the placement as actually resolved, flip included", () => {
		const anchorRect = () => rect({ x: 100, y: 720, width: 50, height: 20 });
		const nodeRect = () => rect({ width: 200, height: 100 });
		const seen: ResolvedPlacement[] = [];

		render(<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} seen={seen} />);

		expect(seen.at(-1)).toEqual({ side: "top", align: "center" });
	});

	it("positions the element with position: fixed", () => {
		const anchorRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });
		const nodeRect = () => rect({ width: 200, height: 100 });

		const { getByTestId } = render(
			<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} />
		);
		const panel = getByTestId("panel");

		expect(panel.style.position).toBe("fixed");
		expect(panel.style.top).toBe("128px"); // anchor.bottom (120) + default offset
		expect(panel.style.left).toBe("25px"); // centred on a 50-wide anchor at x=100
	});

	it("keeps its imperative position writes across an unrelated re-render", () => {
		const anchorRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });
		const nodeRect = () => rect({ width: 200, height: 100 });

		const { getByTestId, rerender } = render(
			<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} label="a" />
		);
		rerender(<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} label="b" />);

		const panel = getByTestId("panel");
		expect(panel.textContent).toBe("b");
		expect(panel.style.position).toBe("fixed");
		expect(panel.style.left).toBe("25px");
		expect(panel.style.top).toBe("128px");
	});

	it("recomputes exactly once per side change, and not at all for an unchanged one", () => {
		const anchorRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });
		const nodeRect = vi.fn(() => rect({ width: 200, height: 100 }));

		const { rerender } = render(
			<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} />
		);
		// The mount recompute, and only that one: the attach effect already
		// placed the element, so the option-diffing effect stays out of the way.
		expect(nodeRect).toHaveBeenCalledTimes(1);

		rerender(<Probe side="top" anchorRect={anchorRect} nodeRect={nodeRect} />);
		expect(nodeRect).toHaveBeenCalledTimes(2);

		rerender(<Probe side="top" anchorRect={anchorRect} nodeRect={nodeRect} />);
		expect(nodeRect).toHaveBeenCalledTimes(2);

		rerender(<Probe side="top" align="end" anchorRect={anchorRect} nodeRect={nodeRect} />);
		expect(nodeRect).toHaveBeenCalledTimes(3);

		rerender(
			<Probe side="top" align="end" offset={16} anchorRect={anchorRect} nodeRect={nodeRect} />
		);
		expect(nodeRect).toHaveBeenCalledTimes(4);
	});

	it("does not re-render on a scroll storm that resolves to the same placement", () => {
		const anchorRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });
		const nodeRect = () => rect({ width: 200, height: 100 });
		const seen: ResolvedPlacement[] = [];

		render(<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} seen={seen} />);
		const settled = seen.length;

		act(() => {
			for (let i = 0; i < 5; i += 1) {
				window.dispatchEvent(new Event("scroll"));
				window.dispatchEvent(new Event("resize"));
			}
		});

		expect(seen.length).toBe(settled);
		expect(seen.at(-1)).toEqual({ side: "bottom", align: "center" });
	});

	it("re-renders once when a scroll actually flips the placement", () => {
		let anchorTop = 100;
		const anchorRect = () => rect({ x: 100, y: anchorTop, width: 50, height: 20 });
		const nodeRect = () => rect({ width: 200, height: 100 });
		const seen: ResolvedPlacement[] = [];

		render(<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} seen={seen} />);
		expect(seen.at(-1)).toEqual({ side: "bottom", align: "center" });
		const settled = seen.length;

		anchorTop = 720;
		act(() => {
			window.dispatchEvent(new Event("scroll"));
		});

		expect(seen.at(-1)).toEqual({ side: "top", align: "center" });
		expect(seen.length).toBe(settled + 1);
	});

	it("never re-reports to a replacement onPlacement, and calls the latest one", () => {
		let anchorTop = 100;
		const anchorRect = () => rect({ x: 100, y: anchorTop, width: 50, height: 20 });
		const nodeRect = () => rect({ width: 200, height: 100 });
		const first = vi.fn();
		const second = vi.fn();

		const { rerender } = render(
			<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} onPlacement={first} />
		);
		expect(first).toHaveBeenCalledTimes(1);
		expect(first).toHaveBeenCalledWith("bottom", "center");

		// The core's "a new callback has never been told anything" reset branch
		// is unreachable from here: the hook hands it one identity for the life
		// of the component, so an inline arrow rebuilt every render does not
		// produce a spurious report.
		rerender(
			<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} onPlacement={second} />
		);
		expect(second).not.toHaveBeenCalled();

		anchorTop = 720;
		act(() => {
			window.dispatchEvent(new Event("scroll"));
		});

		expect(second).toHaveBeenCalledTimes(1);
		expect(second).toHaveBeenCalledWith("top", "center");
		expect(first).toHaveBeenCalledTimes(1);
	});

	it("positions nothing and registers no listener while enabled is false", () => {
		const anchorRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });
		const nodeRect = vi.fn(() => rect({ width: 200, height: 100 }));
		const addSpy = vi.spyOn(window, "addEventListener");

		const { getByTestId, rerender } = render(
			<Probe enabled={false} side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} />
		);

		expect(nodeRect).not.toHaveBeenCalled();
		expect(getByTestId("panel").style.position).toBe("");
		expect(addSpy.mock.calls.filter(([type]) => type === "scroll" || type === "resize")).toEqual(
			[]
		);

		// And it starts positioning the moment it is switched on, without
		// unmounting anything.
		rerender(<Probe enabled side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} />);
		expect(nodeRect).toHaveBeenCalledTimes(1);
		expect(getByTestId("panel").style.position).toBe("fixed");

		addSpy.mockRestore();
	});

	it("leaves zero window listeners behind after a StrictMode mount/unmount", () => {
		const anchorRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });
		const nodeRect = () => rect({ width: 200, height: 100 });
		const addSpy = vi.spyOn(window, "addEventListener");
		const removeSpy = vi.spyOn(window, "removeEventListener");

		const { unmount } = render(
			<StrictMode>
				<Probe side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} />
			</StrictMode>
		);
		unmount();

		const positional = (type: unknown) => type === "scroll" || type === "resize";
		const added = addSpy.mock.calls.filter(([type]) => positional(type));
		const removed = removeSpy.mock.calls.filter(([type]) => positional(type));

		expect(added.length).toBeGreaterThan(0);
		expect(removed.length).toBe(added.length);
		expect(removed.filter(([type]) => type === "scroll").length).toBe(
			added.filter(([type]) => type === "scroll").length
		);

		addSpy.mockRestore();
		removeSpy.mockRestore();
	});
});
