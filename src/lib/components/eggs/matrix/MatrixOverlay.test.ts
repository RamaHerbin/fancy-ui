import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render } from "@testing-library/svelte";
import { flushSync } from "svelte";
import MatrixOverlay from "./MatrixOverlay.svelte";
import def from "./index.js";
import type { EggContext } from "../types.js";

function fakeCtx(reducedMotion = false): EggContext {
	return {
		id: "matrix",
		reducedMotion,
		dismiss: vi.fn(),
		found: vi.fn(),
		trigger: vi.fn(async () => {}),
	};
}

describe("matrix egg", () => {
	afterEach(cleanup);

	it("is triggered by typing the word and loads its overlay lazily", async () => {
		expect(def.trigger).toEqual({ kind: "word", word: "matrix" });
		const mod = await def.load();
		expect(mod.default).toBe(MatrixOverlay);
	});

	it("mounts the backdrop and a canvas (jsdom has no 2d context, the engine bails)", () => {
		const { container } = render(MatrixOverlay, { props: { ctx: fakeCtx() } });
		const root = container.querySelector("[role='dialog']");
		expect(root).not.toBeNull();
		expect(root!.getAttribute("aria-label")).toBe("Glyph rain");
		expect(container.querySelector("[data-matrix-backdrop]")).not.toBeNull();
		expect(container.querySelector("canvas")).not.toBeNull();
	});

	it("focuses Leave on mount and dismisses on click", async () => {
		const ctx = fakeCtx();
		const { getByRole } = render(MatrixOverlay, { props: { ctx } });
		flushSync();
		const leave = getByRole("button", { name: "Leave" });
		expect(document.activeElement).toBe(leave);
		await fireEvent.click(leave);
		expect(ctx.dismiss).toHaveBeenCalledTimes(1);
	});

	it("dismisses when focus leaves the overlay (Tab out)", async () => {
		const ctx = fakeCtx();
		const outside = document.createElement("button");
		document.body.append(outside);
		const { getByRole } = render(MatrixOverlay, { props: { ctx } });
		flushSync();
		await fireEvent.focusOut(getByRole("button", { name: "Leave" }), { relatedTarget: outside });
		expect(ctx.dismiss).toHaveBeenCalledTimes(1);
		outside.remove();
	});

	it("gives focus back to the previously focused element on unmount", () => {
		const before = document.createElement("a");
		before.href = "/";
		document.body.append(before);
		before.focus();
		const { unmount } = render(MatrixOverlay, { props: { ctx: fakeCtx() } });
		flushSync();
		expect(document.activeElement?.textContent?.trim()).toBe("Leave");
		unmount();
		expect(document.activeElement).toBe(before);
		before.remove();
	});

	it("dismisses when the backdrop is clicked", async () => {
		const ctx = fakeCtx();
		const { container } = render(MatrixOverlay, { props: { ctx } });
		await fireEvent.click(container.querySelector("canvas")!);
		expect(ctx.dismiss).toHaveBeenCalledTimes(1);
	});

	it("shows only the static panel and caption under reduced motion", () => {
		const { container, getByText } = render(MatrixOverlay, { props: { ctx: fakeCtx(true) } });
		expect(container.querySelector("canvas")).toBeNull();
		expect(getByText(/wake up/)).toBeTruthy();
	});
});
