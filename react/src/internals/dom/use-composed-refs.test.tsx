import { StrictMode, useRef } from "react";
import type { Ref } from "react";
import { render, renderHook, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { assignRef, useComposedRefs } from "./use-composed-refs.js";

describe("assignRef", () => {
	it("calls a function ref with the node", () => {
		const fn = vi.fn();
		const node = document.createElement("div");

		assignRef(fn, node);
		expect(fn).toHaveBeenCalledWith(node);
	});

	it("writes a node onto an object ref", () => {
		const ref: { current: HTMLDivElement | null } = { current: null };
		const node = document.createElement("div");

		assignRef(ref, node);
		expect(ref.current).toBe(node);

		assignRef(ref, null);
		expect(ref.current).toBeNull();
	});

	it("skips nullish refs", () => {
		const node = document.createElement("div");
		expect(() => assignRef(null, node)).not.toThrow();
		expect(() => assignRef(undefined, node)).not.toThrow();
	});

	it("hands back the cleanup a React 19 callback ref returns", () => {
		const cleanup = () => {};
		const node = document.createElement("div");

		expect(assignRef(() => cleanup, node)).toBe(cleanup);
		// Nothing to hand back: the pre-19 shape, and an object ref.
		expect(assignRef(() => {}, node)).toBeUndefined();
		expect(assignRef({ current: null }, node)).toBeUndefined();
	});
});

describe("useComposedRefs", () => {
	afterEach(cleanup);

	it("publishes the node to every ref, and null on unmount", () => {
		const callbackRef = vi.fn();
		const objectRef: { current: HTMLDivElement | null } = { current: null };

		function Probe() {
			const composed = useComposedRefs<HTMLDivElement>(callbackRef, objectRef, null, undefined);
			return <div ref={composed} data-testid="target" />;
		}

		const { unmount, getByTestId } = render(<Probe />);
		const node = getByTestId("target");

		expect(callbackRef).toHaveBeenCalledWith(node);
		expect(objectRef.current).toBe(node);

		unmount();
		expect(callbackRef).toHaveBeenLastCalledWith(null);
		expect(objectRef.current).toBeNull();
	});

	/*
	 * React 19 lets a callback ref return a cleanup, and runs THAT on detach
	 * instead of calling the ref with `null`. A composer that discarded the
	 * return value published nothing back to React, so React fell back to the
	 * `null` call and the consumer's cleanup never ran at all.
	 */
	it("runs a callback ref's own cleanup on detach instead of calling it with null", () => {
		const cleanup = vi.fn();
		const withCleanup = vi.fn((_node: HTMLDivElement | null) => cleanup);
		const plain = vi.fn();
		const objectRef: { current: HTMLDivElement | null } = { current: null };

		function Probe() {
			const composed = useComposedRefs<HTMLDivElement>(withCleanup, plain, objectRef);
			return <div ref={composed} data-testid="target" />;
		}

		const { unmount, getByTestId } = render(<Probe />);
		const node = getByTestId("target");

		expect(withCleanup).toHaveBeenCalledWith(node);
		expect(cleanup).not.toHaveBeenCalled();

		unmount();
		expect(cleanup).toHaveBeenCalledTimes(1);
		// The ref that owns a cleanup is never ALSO nulled — running the
		// cleanup is the whole of its teardown.
		expect(withCleanup).toHaveBeenCalledTimes(1);
		expect(withCleanup).not.toHaveBeenCalledWith(null);
		// The ones that returned nothing keep the pre-19 contract.
		expect(plain).toHaveBeenLastCalledWith(null);
		expect(objectRef.current).toBeNull();
	});

	it("runs the cleanup when the ref list changes, before the new refs attach", () => {
		const cleanup = vi.fn();
		const withCleanup = vi.fn((_node: HTMLDivElement | null) => cleanup);

		function Probe({ second }: { second: Ref<HTMLDivElement> }) {
			const composed = useComposedRefs<HTMLDivElement>(withCleanup, second);
			return <div ref={composed} data-testid="target" />;
		}

		const { rerender } = render(<Probe second={vi.fn((_node: HTMLDivElement | null) => {})} />);
		expect(cleanup).not.toHaveBeenCalled();

		rerender(<Probe second={vi.fn((_node: HTMLDivElement | null) => {})} />);
		expect(cleanup).toHaveBeenCalledTimes(1);
		// Re-attached with the node, not left detached.
		expect(withCleanup).toHaveBeenCalledTimes(2);
	});

	it("forwards to an inner ref alongside the component's own", () => {
		const outer: { current: HTMLDivElement | null } = { current: null };

		function Probe({ forwarded }: { forwarded: Ref<HTMLDivElement> }) {
			const own = useRef<HTMLDivElement | null>(null);
			const composed = useComposedRefs<HTMLDivElement>(forwarded, own);
			return (
				<div ref={composed} data-testid="target">
					{own.current ? "attached" : ""}
				</div>
			);
		}

		const { getByTestId } = render(<Probe forwarded={outer} />);
		expect(outer.current).toBe(getByTestId("target"));
	});

	it("keeps its identity while the ref list is unchanged", () => {
		const a = vi.fn();
		const b = vi.fn();

		const { result, rerender } = renderHook(() => useComposedRefs<HTMLDivElement>(a, b));
		const first = result.current;

		rerender();
		expect(result.current).toBe(first);
	});

	it("changes identity when one of the refs does", () => {
		const a = vi.fn();

		const { result, rerender } = renderHook(({ second }) => useComposedRefs<HTMLDivElement>(a, second), {
			initialProps: { second: vi.fn() },
		});
		const first = result.current;

		rerender({ second: vi.fn() });
		expect(result.current).not.toBe(first);
	});

	/*
	 * The peer range is `^18 || ^19`, and React 18 has no ref-cleanup channel:
	 * it logs "Unexpected return value from a callback ref" for every callback
	 * ref that returns a function, on every attach. With 48 modules wired
	 * through this hook, one <Tabs> alone produced five of those, and a
	 * consumer whose CI fails on console.error could not use the package at
	 * all. Returning nothing costs React 19 nothing: the `null` call detaches
	 * on both versions, and it is the only detach channel now.
	 */
	it("never hands React a cleanup function — React 18 warns about one", () => {
		const withCleanup = vi.fn((_node: HTMLDivElement | null) => () => {});

		const { result } = renderHook(() => useComposedRefs<HTMLDivElement>(withCleanup));
		const node = document.createElement("div");

		expect(result.current(node)).toBeUndefined();
		expect(result.current(null)).toBeUndefined();
	});

	it("detaches exactly once across a mount → null → mount cycle", () => {
		const released = vi.fn();
		const withCleanup = vi.fn((_node: HTMLDivElement | null) => released);
		const plain = vi.fn();
		const objectRef: { current: HTMLDivElement | null } = { current: null };

		const { result } = renderHook(() =>
			useComposedRefs<HTMLDivElement>(withCleanup, plain, objectRef)
		);
		const first = document.createElement("div");
		const second = document.createElement("div");

		expect(result.current(first)).toBeUndefined();
		expect(objectRef.current).toBe(first);
		expect(released).not.toHaveBeenCalled();

		expect(result.current(null)).toBeUndefined();
		expect(released).toHaveBeenCalledTimes(1);
		expect(plain).toHaveBeenLastCalledWith(null);
		expect(objectRef.current).toBeNull();

		// Idempotent: a second detach of the same attachment releases nothing
		// a second time, which is what lets both React versions funnel through
		// the one channel without double-running a consumer's teardown.
		result.current(null);
		expect(released).toHaveBeenCalledTimes(1);

		result.current(second);
		expect(objectRef.current).toBe(second);
		expect(released).toHaveBeenCalledTimes(1);
	});

	/*
	 * §9.4's StrictMode row: the leak counter returns to rest. Here the counter
	 * is outstanding attachments — attaches minus detaches — and this is the
	 * one module where both React versions' attach/detach channels are
	 * reconciled, so the mount/cleanup/mount rehearsal is exactly where an
	 * unbalanced edit would show up.
	 */
	it("leaves exactly one live attachment under StrictMode, and none after unmount", () => {
		const released = vi.fn();
		const withCleanup = vi.fn((_node: HTMLDivElement | null) => released);
		const plain = vi.fn();
		const objectRef: { current: HTMLDivElement | null } = { current: null };

		function Probe() {
			const composed = useComposedRefs<HTMLDivElement>(withCleanup, plain, objectRef);
			return <div ref={composed} data-testid="target" />;
		}

		const { unmount, getByTestId } = render(
			<StrictMode>
				<Probe />
			</StrictMode>
		);
		const node = getByTestId("target");

		expect(withCleanup.mock.calls.length - released.mock.calls.length).toBe(1);
		// No stale node left behind by the rehearsal, on either ref shape.
		expect(plain).toHaveBeenLastCalledWith(node);
		expect(objectRef.current).toBe(node);

		unmount();
		expect(released).toHaveBeenCalledTimes(withCleanup.mock.calls.length);
		expect(plain).toHaveBeenLastCalledWith(null);
		expect(objectRef.current).toBeNull();
	});
});
