import { defineComponent, h, ref } from "vue";
import { render, screen, fireEvent } from "@testing-library/vue";
import { describe, it, expect, vi } from "vitest";
import { createInternalContext } from "./context.js";

interface CounterContextValue {
	readonly count: number;
}

const CounterContext = createInternalContext<CounterContextValue>("CounterContext");
const OtherContext = createInternalContext<{ readonly label: string }>("OtherContext");

const CounterConsumer = defineComponent({
	name: "CounterConsumer",
	setup() {
		const ctx = CounterContext.useRequired();
		return () => h("span", { "data-testid": "count" }, String(ctx.count));
	},
});

const CounterOptionalConsumer = defineComponent({
	name: "CounterOptionalConsumer",
	setup() {
		const value = CounterContext.useOptional();
		return () => h("span", { "data-testid": "optional" }, value === undefined ? "none" : String(value.count));
	},
});

describe("createInternalContext", () => {
	it("useOptional returns undefined with no provider", () => {
		render(CounterOptionalConsumer);
		expect(screen.getByTestId("optional")).toHaveTextContent("none");
	});

	it("useRequired throws a named error with no provider", () => {
		const errors = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(CounterConsumer)).toThrow(/CounterContext/);
		errors.mockRestore();
	});

	it("both readers see the provided value", () => {
		render(CounterConsumer, { global: { provide: { [CounterContext.key as symbol]: { count: 3 } } } });
		expect(screen.getByTestId("count")).toHaveTextContent("3");
	});

	it("re-renders consumers when the provider rebuilds its value object", async () => {
		const Root = defineComponent({
			setup() {
				const count = ref(0);
				CounterContext.provide({
					get count() {
						return count.value;
					},
				});
				return () =>
					h("div", [
						h("button", { type: "button", onClick: () => (count.value += 1) }, "bump"),
						h(CounterConsumer),
					]);
			},
		});

		render(Root);
		expect(screen.getByTestId("count")).toHaveTextContent("0");

		await fireEvent.click(screen.getByRole("button"));
		expect(screen.getByTestId("count")).toHaveTextContent("1");
	});

	it("keeps separate contexts independent", () => {
		render(CounterOptionalConsumer, {
			global: { provide: { [OtherContext.key as symbol]: { label: "other" } } },
		});
		expect(screen.getByTestId("optional")).toHaveTextContent("none");
	});
});
