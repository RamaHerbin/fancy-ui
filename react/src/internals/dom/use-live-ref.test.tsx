import { useEffect } from "react";
import { render, renderHook, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { useLiveRef } from "./use-live-ref.js";

describe("useLiveRef", () => {
	afterEach(cleanup);

	it("mirrors the latest value", () => {
		const { result, rerender } = renderHook(({ value }) => useLiveRef(value), {
			initialProps: { value: 1 },
		});

		expect(result.current.current).toBe(1);

		rerender({ value: 2 });
		expect(result.current.current).toBe(2);
	});

	it("keeps one ref object across re-renders", () => {
		const { result, rerender } = renderHook(({ value }) => useLiveRef(value), {
			initialProps: { value: "a" },
		});
		const first = result.current;

		rerender({ value: "b" });
		expect(result.current).toBe(first);
	});

	it("holds the first render's value before any effect has run", () => {
		const seen: number[] = [];

		function Probe() {
			const ref = useLiveRef(7);
			seen.push(ref.current);
			return null;
		}

		render(<Probe />);
		expect(seen[0]).toBe(7);
	});

	it("lets a closure built once at mount read the latest value", () => {
		const reads: number[] = [];

		function Probe({ count }: { count: number }) {
			const live = useLiveRef(count);

			useEffect(() => {
				const read = () => reads.push(live.current);
				document.addEventListener("fancy-read", read);
				return () => {
					document.removeEventListener("fancy-read", read);
				};
				// Bound exactly once: the ref is what keeps it current.
				// eslint-disable-next-line react-hooks/exhaustive-deps
			}, []);

			return null;
		}

		const { rerender } = render(<Probe count={1} />);
		act(() => {
			document.dispatchEvent(new Event("fancy-read"));
		});

		rerender(<Probe count={2} />);
		act(() => {
			document.dispatchEvent(new Event("fancy-read"));
		});

		expect(reads).toEqual([1, 2]);
	});
});
