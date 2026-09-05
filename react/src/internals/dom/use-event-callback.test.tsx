import { useEffect } from "react";
import { render, renderHook, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useEventCallback } from "./use-event-callback.js";
import { useElementRef } from "./use-element-ref.js";

describe("useEventCallback", () => {
	afterEach(cleanup);

	it("keeps one identity across re-renders", () => {
		const { result, rerender } = renderHook(({ fn }) => useEventCallback(fn), {
			initialProps: { fn: () => "a" },
		});
		const first = result.current;

		rerender({ fn: () => "b" });
		rerender({ fn: () => "c" });

		expect(result.current).toBe(first);
	});

	it("always calls the most recent fn", () => {
		const first = vi.fn(() => "a");
		const second = vi.fn(() => "b");

		const { result, rerender } = renderHook(({ fn }) => useEventCallback(fn), {
			initialProps: { fn: first },
		});
		rerender({ fn: second });

		expect(result.current()).toBe("b");
		expect(first).not.toHaveBeenCalled();
		expect(second).toHaveBeenCalledTimes(1);
	});

	it("forwards its arguments and returns the result", () => {
		const { result } = renderHook(() => useEventCallback((a: number, b: number) => a + b));
		expect(result.current(2, 3)).toBe(5);
	});

	it("calls the first render's fn before any effect has run", () => {
		const fn = vi.fn(() => "ready");
		const seen: (string | undefined)[] = [];

		function Probe() {
			const stable = useEventCallback(fn);
			seen.push(stable());
			return null;
		}

		render(<Probe />);
		expect(seen[0]).toBe("ready");
	});

	it("yields a stable no-op returning undefined for `undefined`", () => {
		const { result, rerender } = renderHook(({ fn }) => useEventCallback(fn), {
			initialProps: { fn: undefined as ((n: number) => number) | undefined },
		});
		const first = result.current;

		expect(result.current(1)).toBeUndefined();

		rerender({ fn: undefined });
		expect(result.current).toBe(first);
		expect(() => result.current(2)).not.toThrow();
	});

	it("lets a listener bound once at mount see the latest callback", () => {
		const calls: string[] = [];

		function Probe({ label }: { label: string }) {
			const [node, ref] = useElementRef<HTMLButtonElement>();
			const onClick = useEventCallback(() => {
				calls.push(label);
			});

			useEffect(() => {
				if (!node) return;
				node.addEventListener("click", onClick);
				return () => {
					node.removeEventListener("click", onClick);
				};
			}, [node, onClick]);

			return <button type="button" ref={ref} />;
		}

		const { rerender, container } = render(<Probe label="first" />);
		const button = container.querySelector("button") as HTMLButtonElement;

		act(() => {
			button.click();
		});
		rerender(<Probe label="second" />);
		act(() => {
			button.click();
		});

		expect(calls).toEqual(["first", "second"]);
	});
});
