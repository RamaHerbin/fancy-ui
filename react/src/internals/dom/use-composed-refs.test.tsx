import { useRef } from "react";
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
});
