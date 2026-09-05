/**
 * `useSoundFeedback` — the React layer over `attachSoundFeedback`.
 *
 * The guard matrix lives in `sound-feedback.test.ts` against the core; this
 * file only covers what the hook adds: node-keyed binding, the D-8 rebind rule
 * (listeners rebind only when the SET of event names changes, everything else
 * stays live), cleanup on unmount, and the StrictMode leak counter.
 */
import { StrictMode } from "react";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useElementRef } from "../internals/dom/use-element-ref.js";
import {
	resetSoundFeedbackForTests,
	useSoundFeedback,
	__soundFeedbackHoverInstances,
	type SoundFeedbackOptions,
} from "./sound-feedback.js";
import { resetSoundForTests, sound } from "./sound.js";
import type { SoundCue, SoundPlayOptions } from "./types.js";

// jsdom 26 — the version this package pins — does not implement PointerEvent,
// and the hover guard matrix is entirely about `pointerType`. A MouseEvent
// subclass carrying `pointerType` is the whole surface these tests touch.
if (typeof window !== "undefined" && typeof window.PointerEvent === "undefined") {
	class PointerEventShim extends MouseEvent {
		readonly pointerType: string;
		constructor(type: string, init: PointerEventInit = {}) {
			super(type, init);
			this.pointerType = init.pointerType ?? "";
		}
	}
	const Ctor = PointerEventShim as unknown as typeof PointerEvent;
	window.PointerEvent = Ctor;
	globalThis.PointerEvent = Ctor;
}

function Probe({ options }: { options?: SoundFeedbackOptions }) {
	const [node, ref] = useElementRef<HTMLButtonElement>();
	useSoundFeedback(node, options);
	return <button type="button" ref={ref} data-testid="target" />;
}

/** Renders nothing but the hook, with no node to bind to. */
function DetachedProbe({ options }: { options?: SoundFeedbackOptions }) {
	useSoundFeedback(null, options);
	return <button type="button" data-testid="target" />;
}

/** The README's shape: the hook owns the node and hands back a callback ref. */
function RefProbe({ options, show = true }: { options?: SoundFeedbackOptions; show?: boolean }) {
	const soundRef = useSoundFeedback(options);
	return show ? <button type="button" ref={soundRef} data-testid="target" /> : null;
}

function target() {
	return screen.getByTestId("target");
}

function click(node: HTMLElement) {
	node.dispatchEvent(new MouseEvent("click", { bubbles: true }));
}

describe("useSoundFeedback", () => {
	const play = vi.fn<(cue: SoundCue, options?: SoundPlayOptions) => void>();

	beforeEach(() => {
		resetSoundForTests();
		resetSoundFeedbackForTests();
		play.mockClear();
		vi.spyOn(sound, "play").mockImplementation(play);
	});

	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("binds the default click → press once the node exists", () => {
		render(<Probe />);

		click(target());

		expect(play).toHaveBeenCalledWith("press", { volume: undefined, pitch: undefined });
		expect(play).toHaveBeenCalledTimes(1);
	});

	it("binds nothing while the node is null", () => {
		render(<DetachedProbe />);

		click(target());

		expect(play).not.toHaveBeenCalled();
	});

	it("`on` replaces the defaults, exactly as the core does", () => {
		render(<Probe options={{ on: { pointerenter: "hover" }, allowUntrusted: true }} />);

		click(target());

		expect(play).not.toHaveBeenCalled();
	});

	it("swaps the cue for an unchanged event name WITHOUT rebinding (D-8)", () => {
		const { rerender } = render(<Probe options={{ on: { click: "press" } }} />);
		const node = target();
		const removeSpy = vi.spyOn(node, "removeEventListener");
		const addSpy = vi.spyOn(node, "addEventListener");

		rerender(<Probe options={{ on: { click: "select" } }} />);

		expect(removeSpy).not.toHaveBeenCalled();
		expect(addSpy).not.toHaveBeenCalled();

		click(node);
		expect(play).toHaveBeenCalledWith("select", { volume: undefined, pitch: undefined });
		expect(play).toHaveBeenCalledTimes(1);
	});

	it("does not rebind when an inline `on` literal is rebuilt with the same names", () => {
		const { rerender } = render(<Probe options={{ on: { click: "press" } }} />);
		const node = target();
		const removeSpy = vi.spyOn(node, "removeEventListener");

		rerender(<Probe options={{ on: { click: "press" } }} />);
		rerender(<Probe options={{ on: { click: "press" } }} />);

		expect(removeSpy).not.toHaveBeenCalled();

		click(node);
		expect(play).toHaveBeenCalledTimes(1);
	});

	it("rebinds when the SET of event names changes", () => {
		const { rerender } = render(<Probe options={{ on: { click: "press" } }} />);
		const node = target();
		const removeSpy = vi.spyOn(node, "removeEventListener");
		const addSpy = vi.spyOn(node, "addEventListener");

		rerender(<Probe options={{ on: { click: "press", pointerdown: "tick" } }} />);

		expect(removeSpy).toHaveBeenCalledTimes(1);
		expect(addSpy).toHaveBeenCalledTimes(2);

		node.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }));
		expect(play).toHaveBeenCalledWith("tick", { volume: undefined, pitch: undefined });
	});

	it("ignores the order the event names were declared in", () => {
		const { rerender } = render(
			<Probe options={{ on: { click: "press", pointerdown: "tick" } }} />
		);
		const node = target();
		const removeSpy = vi.spyOn(node, "removeEventListener");

		rerender(<Probe options={{ on: { pointerdown: "tick", click: "press" } }} />);

		expect(removeSpy).not.toHaveBeenCalled();
	});

	it("keeps `disabled` live without rebinding", () => {
		const { rerender } = render(<Probe options={{ on: { click: "press" } }} />);
		const node = target();
		const removeSpy = vi.spyOn(node, "removeEventListener");

		rerender(<Probe options={{ on: { click: "press" }, disabled: true }} />);
		click(node);
		expect(play).not.toHaveBeenCalled();

		rerender(<Probe options={{ on: { click: "press" }, disabled: false }} />);
		click(node);
		expect(play).toHaveBeenCalledTimes(1);

		expect(removeSpy).not.toHaveBeenCalled();
	});

	it("keeps `volume` and `pitch` live without rebinding", () => {
		const { rerender } = render(<Probe options={{ volume: 0.4, pitch: -3 }} />);
		const node = target();
		const removeSpy = vi.spyOn(node, "removeEventListener");

		click(node);
		expect(play).toHaveBeenLastCalledWith("press", { volume: 0.4, pitch: -3 });

		rerender(<Probe options={{ volume: 0.9, pitch: 5 }} />);
		click(node);
		expect(play).toHaveBeenLastCalledWith("press", { volume: 0.9, pitch: 5 });

		expect(removeSpy).not.toHaveBeenCalled();
	});

	it("keeps `allowUntrusted` live without rebinding", () => {
		const { rerender } = render(<Probe options={{ on: { pointerenter: "hover" } }} />);
		const node = target();
		const removeSpy = vi.spyOn(node, "removeEventListener");

		document.dispatchEvent(
			new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" })
		);
		node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));
		expect(play).not.toHaveBeenCalled();

		rerender(<Probe options={{ on: { pointerenter: "hover" }, allowUntrusted: true }} />);
		document.dispatchEvent(
			new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" })
		);
		node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));

		expect(play).toHaveBeenCalledWith("hover", { volume: undefined, pitch: undefined });
		expect(removeSpy).not.toHaveBeenCalled();
	});

	it("still swallows a resolver that throws", () => {
		render(
			<Probe
				options={{
					on: {
						click: () => {
							throw new Error("resolver exploded");
						},
					},
				}}
			/>
		);
		const node = target();

		expect(() => click(node)).not.toThrow();
		expect(play).not.toHaveBeenCalled();
	});

	it("unbinds on unmount", () => {
		const { unmount } = render(<Probe options={{ on: { click: "press" } }} />);
		const node = target();

		unmount();
		click(node);

		expect(play).not.toHaveBeenCalled();
	});

	describe("the callback-ref shape", () => {
		it("binds the default click → press through the returned ref", () => {
			render(<RefProbe />);

			click(target());

			expect(play).toHaveBeenCalledWith("press", { volume: undefined, pitch: undefined });
			expect(play).toHaveBeenCalledTimes(1);
		});

		it("honours `on`, `volume` and `pitch` exactly like the node shape", () => {
			render(<RefProbe options={{ on: { click: "select" }, volume: 0.4, pitch: -3 }} />);

			click(target());

			expect(play).toHaveBeenCalledWith("select", { volume: 0.4, pitch: -3 });
		});

		it("keeps one ref identity across re-renders, so React never reattaches", () => {
			const seen: unknown[] = [];
			function IdentityProbe() {
				const soundRef = useSoundFeedback({ on: { click: "press" } });
				seen.push(soundRef);
				return <button type="button" ref={soundRef} data-testid="target" />;
			}

			const { rerender } = render(<IdentityProbe />);
			rerender(<IdentityProbe />);
			rerender(<IdentityProbe />);

			expect(seen.length).toBeGreaterThan(1);
			for (const ref of seen) expect(ref).toBe(seen[0]);
		});

		it("unbinds when the element it published goes away", () => {
			const { rerender } = render(<RefProbe options={{ on: { click: "press" } }} />);
			const node = target();

			rerender(<RefProbe options={{ on: { click: "press" } }} show={false} />);
			click(node);

			expect(play).not.toHaveBeenCalled();
		});

		it("unbinds on unmount", () => {
			const { unmount } = render(<RefProbe options={{ on: { click: "press" } }} />);
			const node = target();

			unmount();
			click(node);

			expect(play).not.toHaveBeenCalled();
		});

		it("leaves the shared hover counter at rest through a StrictMode cycle", () => {
			const { unmount } = render(
				<StrictMode>
					<RefProbe options={{ on: { pointerenter: "hover" }, allowUntrusted: true }} />
				</StrictMode>
			);

			expect(__soundFeedbackHoverInstances()).toBe(1);

			unmount();
			expect(__soundFeedbackHoverInstances()).toBe(0);
		});

		it("the node shape returns nothing, so the two are never confused", () => {
			let returned: unknown = "not called";
			function NodeShapeProbe() {
				returned = useSoundFeedback(null);
				return <button type="button" data-testid="target" />;
			}

			render(<NodeShapeProbe />);

			expect(returned).toBeUndefined();
		});
	});

	it("returns the shared hover-tracking counter to rest through a StrictMode cycle", () => {
		const { unmount } = render(
			<StrictMode>
				<Probe options={{ on: { pointerenter: "hover" }, allowUntrusted: true }} />
			</StrictMode>
		);

		// One live instance despite the mount → cleanup → mount double cycle.
		expect(__soundFeedbackHoverInstances()).toBe(1);

		const node = target();
		document.dispatchEvent(
			new PointerEvent("pointermove", { bubbles: true, pointerType: "mouse" })
		);
		node.dispatchEvent(new PointerEvent("pointerenter", { bubbles: true, pointerType: "mouse" }));

		// One listener, so one cue — a leaked duplicate would double it.
		expect(play).toHaveBeenCalledTimes(1);

		unmount();
		expect(__soundFeedbackHoverInstances()).toBe(0);
	});
});
