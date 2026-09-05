// The React layer only. `computePosition` and the `attachAnchorPosition` core
// — the flip, the clamp, the resolved-align derivation and the `onPlacement`
// dedupe — are covered assertion-for-assertion in `anchor-position.test.ts`.

import { StrictMode, useCallback } from "react";
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import type { Align, Side } from "./anchor-position.js";
import { useComposedRefs } from "./dom/use-composed-refs.js";
import { useElementRef } from "./dom/use-element-ref.js";
import { anchored } from "./motion/anchored.js";
import { usePresence } from "./motion/presence.js";
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
	recomputeKey?: string | number;
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
	recomputeKey,
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
		recomputeKey,
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

const ANCHOR_A: Partial<DOMRect> = { x: 100, y: 100, width: 50, height: 20 };
const ANCHOR_B: Partial<DOMRect> = { x: 400, y: 300, width: 50, height: 20 };
const PANEL_BOX: Partial<DOMRect> = { width: 200, height: 100 };

/** The three shapes `UseAnchorPositionOptions.anchor` accepts. */
type AnchorForm = "element" | "ref" | "getter";

/**
 * Two live anchors and one surface. `target` swaps which anchor the surface
 * points at while side, align and offset all hold still — the retarget the
 * option-diffing effect used to sleep through.
 */
function RetargetProbe({ form, target }: { form: AnchorForm; target: "a" | "b" }) {
	const [node, publishNode] = useElementRef<HTMLDivElement>();
	const [a, publishA] = useElementRef<HTMLButtonElement>();
	const [b, publishB] = useElementRef<HTMLButtonElement>();

	const setNode = useCallback(
		(el: HTMLDivElement | null) => {
			if (el) el.getBoundingClientRect = () => rect(PANEL_BOX);
			publishNode(el);
		},
		[publishNode]
	);
	const setA = useCallback(
		(el: HTMLButtonElement | null) => {
			if (el) el.getBoundingClientRect = () => rect(ANCHOR_A);
			publishA(el);
		},
		[publishA]
	);
	const setB = useCallback(
		(el: HTMLButtonElement | null) => {
			if (el) el.getBoundingClientRect = () => rect(ANCHOR_B);
			publishB(el);
		},
		[publishB]
	);

	const current = target === "a" ? a : b;
	// The ref and getter forms are rebuilt on every render on purpose: both
	// are idiomatic inline call sites, so the hook has to judge them by the
	// element they RESOLVE to, not by their own identity.
	const anchor = form === "element" ? current : form === "ref" ? { current } : () => current;

	useAnchorPosition(node, { anchor, side: "bottom", align: "start" });

	return (
		<>
			<button type="button" ref={setA} />
			<button type="button" ref={setB} />
			<div data-testid="panel" ref={setNode} />
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

	// The virtual-anchor case: one anchor ELEMENT that slides to new
	// coordinates while side, align and offset all hold still — a context
	// menu's second right-click. Nothing the option-diffing effect compares has
	// moved, so `recomputeKey` is the only thing that can tell it to look again.
	it("recomputes when recomputeKey changes with the same anchor element", () => {
		let anchorX = 100;
		const anchorRect = () => rect({ x: anchorX, y: 100 });
		const nodeRect = () => rect(PANEL_BOX);

		const { getByTestId, rerender } = render(
			<Probe
				side="bottom"
				align="start"
				offset={2}
				anchorRect={anchorRect}
				nodeRect={nodeRect}
				recomputeKey="100,100"
			/>
		);
		const panel = getByTestId("panel");
		expect(panel.style.left).toBe("100px");
		expect(panel.style.top).toBe("102px");

		// The anchor's rect moved, but its element identity and all three
		// geometry options held still: without a key change the surface stays
		// parked where it was.
		anchorX = 400;
		rerender(
			<Probe
				side="bottom"
				align="start"
				offset={2}
				anchorRect={anchorRect}
				nodeRect={nodeRect}
				recomputeKey="100,100"
			/>
		);
		expect(panel.style.left).toBe("100px");

		rerender(
			<Probe
				side="bottom"
				align="start"
				offset={2}
				anchorRect={anchorRect}
				nodeRect={nodeRect}
				recomputeKey="400,100"
			/>
		);
		expect(panel.style.left).toBe("400px");
		expect(panel.style.top).toBe("102px");
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

	it.each<AnchorForm>(["element", "ref", "getter"])(
		"re-pins the surface onto a replacement %s anchor with the geometry unchanged",
		(form) => {
			const { getByTestId, rerender } = render(<RetargetProbe form={form} target="a" />);
			const panel = getByTestId("panel");

			expect(panel.style.top).toBe("128px"); // 100 + 20 + default offset
			expect(panel.style.left).toBe("100px"); // align: start

			rerender(<RetargetProbe form={form} target="b" />);

			// Side, align and offset never moved, so nothing but the anchor
			// itself can drive this recompute. Left to the geometry-only
			// guard, the panel stayed over the anchor it no longer belongs to
			// until a scroll or a resize happened to fire — which over a
			// static page is never.
			expect(panel.style.top).toBe("328px"); // 300 + 20 + default offset
			expect(panel.style.left).toBe("400px");
		}
	);

	it("strips its position writes when enabled flips off under a still-mounted node", () => {
		const anchorRect = () => rect({ x: 100, y: 100, width: 50, height: 20 });
		const nodeRect = () => rect({ width: 200, height: 100 });

		const { getByTestId, rerender } = render(
			<Probe enabled side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} />
		);
		const panel = getByTestId("panel");
		expect(panel.style.position).toBe("fixed");
		expect(panel.style.top).toBe("128px");

		rerender(<Probe enabled={false} side="bottom" anchorRect={anchorRect} nodeRect={nodeRect} />);

		// Nothing unmounted — only the positioning stopped. A leftover
		// `position: fixed` would pin the panel to the viewport at the last
		// coordinates anyone computed for it, out of the flow it has to fall
		// back into.
		expect(panel.isConnected).toBe(true);
		expect(panel.style.position).toBe("");
		expect(panel.style.top).toBe("");
		expect(panel.style.left).toBe("");
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

/**
 * The shape every anchored surface in this package has: one presence clock
 * driving the entrance, one `useAnchorPosition` placing the panel, and the
 * panel node reaching the second through `useElementRef`'s state.
 *
 * That last part is the whole hazard. `presence.register`'s ref callback is a
 * plain one, so the clock owns the node in the commit that creates it and its
 * driver effect pins `transform: scale(0.92)` there. `useElementRef` publishes
 * through state, so the position hook does not see the node until the NEXT
 * commit — both land before paint, but the panel is already scaled by the time
 * anything measures it. Hook declaration order inside the component cannot
 * change that, which is why the guard lives in the measurement.
 */
function EntranceProbe({
	open,
	measured,
}: {
	open: boolean;
	/** The scale in force each time the panel was measured. */
	measured: number[];
}) {
	const [panel, publishPanel] = useElementRef<HTMLDivElement>();
	const [anchor, publishAnchor] = useElementRef<HTMLButtonElement>();

	const presence = usePresence(open);
	useAnchorPosition(panel, { anchor, side: "bottom", align: "center" });

	const setAnchor = useCallback(
		(el: HTMLButtonElement | null) => {
			if (el) el.getBoundingClientRect = () => rect(ANCHOR_A);
			publishAnchor(el);
		},
		[publishAnchor]
	);

	// Stands in for the browser: `getBoundingClientRect` reports the PAINTED
	// box, so it shrinks the moment the entrance pins a scale; `offsetWidth`
	// and `offsetHeight` are layout metrics and never move.
	const setPanel = useCallback(
		(el: HTMLDivElement | null) => {
			if (el) {
				let scale = 1;
				const animate = el.animate.bind(el);
				el.animate = (keyframes, options) => {
					const frames = Array.isArray(keyframes) ? (keyframes as Keyframe[]) : [];
					for (const frame of frames) {
						const match = /scale\(([\d.]+)\)/.exec(String(frame.transform ?? ""));
						if (match?.[1]) scale = Number(match[1]);
					}
					return animate(keyframes, options);
				};
				el.getBoundingClientRect = () => {
					measured.push(scale);
					return rect({ width: 200 * scale, height: 100 * scale });
				};
				Object.defineProperty(el, "offsetWidth", { configurable: true, value: 200 });
				Object.defineProperty(el, "offsetHeight", { configurable: true, value: 100 });
			}
			publishPanel(el);
		},
		[publishPanel, measured]
	);

	const panelRef = useComposedRefs(
		setPanel,
		presence.register(anchored, (entering) => ({ side: "bottom" as Side, entering }))
	);

	return (
		<>
			<button type="button" data-testid="anchor" ref={setAnchor} />
			{presence.mounted ? <div data-testid="panel" ref={panelRef} /> : null}
		</>
	);
}

describe("useAnchorPosition — entrance ordering", () => {
	it("places the panel from its resting size while the entrance transform is pinned", async () => {
		const measured: number[] = [];
		const { rerender } = render(<EntranceProbe open={false} measured={measured} />);

		// Awaited: the animation stub finishes on a microtask, and the leg that
		// settles behind it writes state.
		await act(async () => {
			rerender(<EntranceProbe open measured={measured} />);
		});

		const panel = document.querySelector<HTMLElement>('[data-testid="panel"]');
		expect(panel).not.toBeNull();
		// Centred on the RESTING 200-wide panel: 100 + 25 - 100. Measured
		// through the painted box it would sit at 33px and stay there — the
		// entrance settles and nothing recomputes.
		expect(panel?.style.left).toBe("25px");
		expect(panel?.style.top).toBe("128px");
	});

	// The reason the guard above has to exist. If this ever stops being true
	// the clock has changed when it starts a leg, and the ordering claim in
	// `anchor-position.ts`'s `measureFloating` needs rereading.
	it("has already pinned the entrance transform by the time the panel is first measured", async () => {
		const measured: number[] = [];
		const { rerender } = render(<EntranceProbe open={false} measured={measured} />);

		await act(async () => {
			rerender(<EntranceProbe open measured={measured} />);
		});

		expect(measured.length).toBeGreaterThan(0);
		expect(measured[0]).toBeCloseTo(0.92, 5);
	});
});
