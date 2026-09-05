import { useEffect, useLayoutEffect } from "react";
import { render, renderHook, cleanup, act } from "@testing-library/react";
import { hydrateRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { afterEach, describe, it, expect, vi } from "vitest";
import { useConstant, useIsHydrated, useIsomorphicLayoutEffect } from "./ssr.js";

describe("useIsomorphicLayoutEffect", () => {
	afterEach(cleanup);

	it("is useLayoutEffect in the browser", () => {
		expect(useIsomorphicLayoutEffect).toBe(useLayoutEffect);
	});

	it("runs before the passive effects of the same commit", () => {
		const order: string[] = [];

		function Probe() {
			useEffect(() => {
				order.push("passive");
			});
			useIsomorphicLayoutEffect(() => {
				order.push("layout");
			});
			return null;
		}

		render(<Probe />);
		expect(order).toEqual(["layout", "passive"]);
	});
});

describe("useIsHydrated", () => {
	afterEach(cleanup);

	it("is true in a client-only render", () => {
		const { result } = renderHook(() => useIsHydrated());
		expect(result.current).toBe(true);
	});

	it("is false on the server and through the hydration render, true after it", () => {
		const seen: boolean[] = [];

		function Probe() {
			const hydrated = useIsHydrated();
			seen.push(hydrated);
			return <span>{hydrated ? "client" : "server"}</span>;
		}

		const html = renderToString(<Probe />);
		expect(html).toContain("server");
		expect(seen).toEqual([false]);

		seen.length = 0;
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		const container = document.createElement("div");
		container.innerHTML = html;
		document.body.appendChild(container);

		let root: Root | undefined;
		act(() => {
			root = hydrateRoot(container, <Probe />);
		});

		expect(seen[0]).toBe(false);
		expect(seen.at(-1)).toBe(true);
		expect(container.textContent).toBe("client");
		expect(errors).not.toHaveBeenCalled();

		act(() => {
			root?.unmount();
		});
		container.remove();
		errors.mockRestore();
	});
});

describe("useConstant", () => {
	afterEach(cleanup);

	it("creates the value once and returns the same instance", () => {
		const create = vi.fn(() => ({ id: 1 }));

		const { result, rerender } = renderHook(() => useConstant(create));
		const first = result.current;

		rerender();
		rerender();

		expect(result.current).toBe(first);
		expect(create).toHaveBeenCalledTimes(1);
	});

	it("creates one value per component instance", () => {
		const values: object[] = [];

		function Probe() {
			values.push(useConstant(() => ({})));
			return null;
		}

		render(
			<>
				<Probe />
				<Probe />
			</>
		);

		expect(values).toHaveLength(2);
		expect(values[0]).not.toBe(values[1]);
	});
});
