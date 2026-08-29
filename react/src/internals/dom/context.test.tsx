import { useState } from "react";
import type { ReactNode } from "react";
import { render, renderHook, screen, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { createInternalContext } from "./context.js";

interface CounterContextValue {
	readonly count: number;
}

const CounterContext = createInternalContext<CounterContextValue>("CounterContext");
const OtherContext = createInternalContext<{ readonly label: string }>("OtherContext");

describe("createInternalContext", () => {
	afterEach(cleanup);

	it("useOptional returns undefined with no provider", () => {
		const { result } = renderHook(() => CounterContext.useOptional());
		expect(result.current).toBeUndefined();
	});

	it("useRequired throws a named error with no provider", () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => renderHook(() => CounterContext.useRequired())).toThrow(/CounterContext/);
		errors.mockRestore();
	});

	it("both readers see the provided value", () => {
		function Wrapper({ children }: { children: ReactNode }) {
			return <CounterContext.Provider value={{ count: 3 }}>{children}</CounterContext.Provider>;
		}

		const required = renderHook(() => CounterContext.useRequired(), { wrapper: Wrapper });
		expect(required.result.current).toEqual({ count: 3 });

		const optional = renderHook(() => CounterContext.useOptional(), { wrapper: Wrapper });
		expect(optional.result.current).toEqual({ count: 3 });
	});

	it("re-renders consumers when the provider rebuilds its value object", () => {
		function Consumer() {
			const { count } = CounterContext.useRequired();
			return <span data-testid="count">{count}</span>;
		}

		function Root() {
			const [count, setCount] = useState(0);
			// A plain object rebuilt from its scalar input — the rebuild IS what
			// makes consumers re-render.
			return (
				<CounterContext.Provider value={{ count }}>
					<button type="button" onClick={() => setCount((n) => n + 1)}>
						bump
					</button>
					<Consumer />
				</CounterContext.Provider>
			);
		}

		render(<Root />);
		expect(screen.getByTestId("count")).toHaveTextContent("0");

		act(() => {
			screen.getByRole("button").click();
		});
		expect(screen.getByTestId("count")).toHaveTextContent("1");
	});

	it("keeps separate contexts independent", () => {
		function Wrapper({ children }: { children: ReactNode }) {
			return <OtherContext.Provider value={{ label: "other" }}>{children}</OtherContext.Provider>;
		}

		const { result } = renderHook(
			() => ({ counter: CounterContext.useOptional(), other: OtherContext.useOptional() }),
			{ wrapper: Wrapper }
		);

		expect(result.current.counter).toBeUndefined();
		expect(result.current.other).toEqual({ label: "other" });
	});
});
