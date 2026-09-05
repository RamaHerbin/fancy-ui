import { render, renderHook } from "@testing-library/react";
import { describe, it, expect } from "vitest";
import { uid, useFancyId } from "./use-id.js";

describe("uid", () => {
	it("uses the default 'fui' prefix", () => {
		expect(uid()).toMatch(/^fui-\d+$/);
	});

	it("uses a custom prefix", () => {
		expect(uid("tooltip")).toMatch(/^tooltip-\d+$/);
	});

	it("never returns the same id twice", () => {
		const first = uid();
		const second = uid();
		expect(first).not.toBe(second);
	});

	it("keeps incrementing across different prefixes", () => {
		const a = uid("a");
		const b = uid("b");
		const aNumber = Number(a.split("-")[1]);
		const bNumber = Number(b.split("-")[1]);
		expect(bNumber).toBe(aNumber + 1);
	});

	// The SSR guard lives in `use-id.ssr.test.ts`, under the node environment
	// that actually has no `window` — the condition the throw exists for.
});

describe("useFancyId", () => {
	it("uses the default 'fui' prefix", () => {
		const { result } = renderHook(() => useFancyId());
		expect(result.current).toMatch(/^fui-.+/);
	});

	it("uses a custom prefix", () => {
		const { result } = renderHook(() => useFancyId("tooltip"));
		expect(result.current).toMatch(/^tooltip-.+/);
	});

	it("is stable across re-renders", () => {
		const { result, rerender } = renderHook(() => useFancyId());
		const first = result.current;

		rerender();

		expect(result.current).toBe(first);
	});

	it("gives two instances in the same tree different ids", () => {
		function Probe() {
			const id = useFancyId();
			return <span id={id} data-testid="probe" />;
		}

		const { getAllByTestId } = render(
			<>
				<Probe />
				<Probe />
			</>
		);
		const [first, second] = getAllByTestId("probe");

		expect(first!.id).not.toBe(second!.id);
		// Delimiters and all, the id stays a legal `id` attribute and stays
		// findable — which is the whole reason the output is not transformed
		// (and the reason it must never become a CSS selector).
		expect(document.getElementById(first!.id)).toBe(first);
	});
});
