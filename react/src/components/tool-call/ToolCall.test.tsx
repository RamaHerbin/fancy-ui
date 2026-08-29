import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ToolCall } from "./ToolCall.js";
import type { ToolCallData } from "../../internals/ai-types.js";

function call(overrides: Partial<ToolCallData> = {}): ToolCallData {
	return { id: "call_1", name: "search_docs", status: "done", ...overrides };
}

function header(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button[aria-expanded]") as HTMLButtonElement;
}

function body(container: HTMLElement): HTMLElement {
	const id = header(container).getAttribute("aria-controls") as string;
	// useId output contains characters that are illegal in an unescaped CSS
	// selector, so the lookup goes through getElementById rather than a `#`.
	return document.getElementById(id) as HTMLElement;
}

function dot(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-toolcall-dot") as HTMLElement;
}

function payloads(container: HTMLElement): string[] {
	return [...container.querySelectorAll(".ft-toolcall-payload")].map((el) => el.textContent ?? "");
}

describe("ToolCall", () => {
	afterEach(cleanup);

	it("renders the tool name in the header", () => {
		const { container } = render(<ToolCall call={call({ name: "run_query" })} />);

		expect(header(container).textContent).toContain("run_query");
	});

	it.each([
		["pending", "ft-status-pending"],
		["running", "ft-status-running"],
		["done", "ft-status-done"],
		["error", "ft-status-error"],
		["cancelled", "ft-status-cancelled"],
	] as const)("marks the status dot for %s", (status, className) => {
		const { container } = render(<ToolCall call={call({ status })} />);

		expect(dot(container).classList.contains(className)).toBe(true);
		expect((container.firstElementChild as HTMLElement).dataset.status).toBe(status);
	});

	it("names the status out loud, since the dot is hidden from assistive tech", () => {
		const { container } = render(<ToolCall call={call({ status: "running" })} />);

		expect(dot(container).getAttribute("aria-hidden")).toBe("true");
		expect(container.querySelector(".sr-only")?.textContent).toBe("Running");
	});

	it("starts collapsed and points the header at the payloads it controls", () => {
		const { container } = render(<ToolCall call={call()} />);

		expect(header(container).getAttribute("aria-expanded")).toBe("false");
		expect(header(container).getAttribute("aria-controls")).toBe(body(container).id);
		expect(body(container).getAttribute("role")).toBe("group");
		expect(body(container).hasAttribute("inert")).toBe(true);
	});

	it("toggles aria-expanded on click and reports every flip through onToggle", async () => {
		const onToggle = vi.fn();
		const { container } = render(<ToolCall call={call()} onToggle={onToggle} />);

		await fireEvent.click(header(container));
		expect(header(container).getAttribute("aria-expanded")).toBe("true");
		expect(body(container).hasAttribute("inert")).toBe(false);
		expect(onToggle).toHaveBeenLastCalledWith(true);

		await fireEvent.click(header(container));
		expect(header(container).getAttribute("aria-expanded")).toBe("false");
		expect(onToggle).toHaveBeenLastCalledWith(false);
		expect(onToggle).toHaveBeenCalledTimes(2);
	});

	it("opens itself when the call comes back failed", () => {
		const onToggle = vi.fn();
		const { container } = render(
			<ToolCall call={call({ status: "error", error: "429 Too Many Requests" })} onToggle={onToggle} />
		);

		expect(header(container).getAttribute("aria-expanded")).toBe("true");
		// Open from the first render rather than toggled there, which is what keeps
		// server markup expanded instead of folding until hydration catches up.
		// Nothing moved, so there is nothing for onToggle to report.
		expect(onToggle).not.toHaveBeenCalled();
	});

	it("opens itself when a running call turns into a failure", async () => {
		const { container, rerender } = render(<ToolCall call={call({ status: "running" })} />);
		expect(header(container).getAttribute("aria-expanded")).toBe("false");

		rerender(<ToolCall call={call({ status: "error", error: "boom" })} />);
		expect(header(container).getAttribute("aria-expanded")).toBe("true");
	});

	it("does not reopen on a failure once the reader has closed it", async () => {
		const { container, rerender } = render(<ToolCall call={call({ status: "running" })} />);

		// Open then close by hand: the card is the reader's from here on.
		await fireEvent.click(header(container));
		await fireEvent.click(header(container));

		rerender(<ToolCall call={call({ status: "error", error: "boom" })} />);
		expect(header(container).getAttribute("aria-expanded")).toBe("false");
	});

	it("follows an open prop driven from outside", async () => {
		const { container, rerender } = render(<ToolCall call={call()} open={false} />);
		expect(header(container).getAttribute("aria-expanded")).toBe("false");

		rerender(<ToolCall call={call()} open={true} />);
		expect(header(container).getAttribute("aria-expanded")).toBe("true");
		expect(body(container).hasAttribute("inert")).toBe(false);

		rerender(<ToolCall call={call()} open={false} />);
		expect(header(container).getAttribute("aria-expanded")).toBe("false");
	});

	it("pretty-prints object payloads as JSON under labelled sections", () => {
		const { container } = render(
			<ToolCall
				call={call({ input: { query: "retry policy", limit: 3 }, output: { hits: 3 } })}
				open={true}
			/>
		);

		expect(body(container).textContent).toContain("Request");
		expect(body(container).textContent).toContain("Result");
		expect(payloads(container)).toEqual([
			'{\n  "query": "retry policy",\n  "limit": 3\n}',
			'{\n  "hits": 3\n}',
		]);
	});

	it("renders primitive payloads bare rather than as quoted literals", () => {
		const { container } = render(
			<ToolCall call={call({ input: "retry policy", output: 42 })} open={true} />
		);

		expect(payloads(container)).toEqual(["retry policy", "42"]);
	});

	it("names the cycle rather than collapsing a self-referential payload", () => {
		const cyclic: Record<string, unknown> = { name: "loop" };
		cyclic.self = cyclic;

		const { container } = render(<ToolCall call={call({ output: cyclic })} open={true} />);

		expect(payloads(container)).toEqual(['{\n  "name": "loop",\n  "self": "[Circular]"\n}']);
	});

	it("keeps a value shared by two siblings intact rather than calling the repeat a cycle", () => {
		// The bigint is what forces this payload down the replacer path at all: a
		// plain shared reference serializes on the first attempt.
		const shared = { id: "x" };
		const { container } = render(
			<ToolCall call={call({ output: { first: shared, second: shared, count: 1n } })} open={true} />
		);

		expect(payloads(container)).toEqual([
			'{\n  "first": {\n    "id": "x"\n  },\n  "second": {\n    "id": "x"\n  },\n  "count": "1n"\n}',
		]);
	});

	it("renders a bigint JSON refuses outright", () => {
		const { container } = render(
			<ToolCall call={call({ output: { tokens: 9007199254740993n } })} open={true} />
		);

		expect(payloads(container)).toEqual(['{\n  "tokens": "9007199254740993n"\n}']);
	});

	it("falls back to String() on a payload even the replacer cannot serialise", () => {
		const hostile = {
			toJSON() {
				throw new Error("nope");
			},
		};

		const { container } = render(<ToolCall call={call({ output: hostile })} open={true} />);

		expect(payloads(container)).toEqual(["[object Object]"]);
	});

	it("omits a section whose payload never arrived", () => {
		const { container } = render(
			<ToolCall call={call({ status: "running", input: { query: "x" } })} open={true} />
		);

		expect(body(container).textContent).toContain("Request");
		expect(body(container).textContent).not.toContain("Result");
	});

	it("says so when there is nothing to show at all", () => {
		const { container } = render(<ToolCall call={call({ status: "pending" })} open={true} />);

		expect(body(container).textContent).toContain("Nothing recorded yet.");
	});

	it("shows the error text in the result section", () => {
		const { container } = render(
			<ToolCall call={call({ status: "error", error: "429 Too Many Requests" })} />
		);

		expect(body(container).textContent).toContain("Result");
		expect(container.querySelector(".ft-toolcall-error-text")?.textContent).toBe(
			"429 Too Many Requests"
		);
	});

	it("still explains a failure that arrived without a reason", () => {
		const { container } = render(<ToolCall call={call({ status: "error" })} />);

		expect(container.querySelector(".ft-toolcall-error-text")?.textContent).toBe(
			"The tool call failed."
		);
	});

	it("lets the input and output render props replace the default rendering", () => {
		const { container } = render(
			<ToolCall
				call={call({ input: { query: "retry policy" }, output: { hits: 3 } })}
				open={true}
				input={(value) => <p className="custom-in">in: {(value as { query: string }).query}</p>}
				output={(value) => <p className="custom-out">out: {(value as { hits: number }).hits}</p>}
			/>
		);

		expect(payloads(container)).toEqual([]);
		expect(container.querySelector(".custom-in")?.textContent).toBe("in: retry policy");
		expect(container.querySelector(".custom-out")?.textContent).toBe("out: 3");
	});

	it("keeps the error line above an output render prop", () => {
		const { container } = render(
			<ToolCall
				call={call({ status: "error", error: "timed out", output: { partial: true } })}
				output={() => <p className="custom-out">partial</p>}
			/>
		);

		expect(container.querySelector(".ft-toolcall-error-text")?.textContent).toBe("timed out");
		expect(container.querySelector(".custom-out")?.textContent).toBe("partial");
	});

	it("replaces the default icon with the one it is handed", () => {
		const { container } = render(
			<ToolCall call={call()} icon={<span className="custom-icon">!</span>} />
		);

		const slot = container.querySelector(".ft-toolcall-icon") as HTMLElement;
		expect(slot.querySelector(".custom-icon")).not.toBeNull();
		expect(slot.querySelector("svg")).toBeNull();
		expect(slot.getAttribute("aria-hidden")).toBe("true");
	});

	it.each([
		// Sub-second work is what most calls actually are; the shared formatter
		// floors to the second and would report every one of them as "0s".
		[240, "240ms"],
		[1400, "1s"],
		[65_000, "1m 05s"],
	])("formats a duration of %ims", (durationMs, expected) => {
		const { container } = render(<ToolCall call={call({ durationMs })} />);

		expect(header(container).textContent).toContain(expected);
	});

	it("says nothing about duration when the call did not report one", () => {
		const { container } = render(<ToolCall call={call({ status: "running" })} />);

		expect(header(container).querySelector(".tabular-nums")).toBeNull();
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(<ToolCall call={call()} className="my-card" />);
		const root = container.firstElementChild as HTMLElement;

		expect(root.className).toContain("my-card");
		expect(root.className).toContain("ft-toolcall");
	});
});
