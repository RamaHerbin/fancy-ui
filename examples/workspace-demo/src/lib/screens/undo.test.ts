// The one undo pattern every screen shares: change the screen at once, hold
// the call while a toast with Undo counts down, and send it only when the
// toast closes for any reason but Undo.
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import { Toaster, dismissToast, toast } from "fancy-ui-svelte";
import "$lib/test/dom-shims.js";
import { UNDO_WINDOW_MS, undoable } from "./undo.js";

const shown: string[] = [];

afterEach(() => {
	for (const id of shown.splice(0)) dismissToast(id);
	cleanup();
	vi.useRealTimers();
});

function setup() {
	render(Toaster);
	const undo = vi.fn();
	const commit = vi.fn();
	const id = undoable({ title: "Archived 2", onUndo: undo, onCommit: commit });
	shown.push(id);
	return { id, undo, commit };
}

describe("undoable", () => {
	it("shows a six-second toast with a draining bar and an Undo action", async () => {
		setup();
		const button = await screen.findByRole("button", { name: "Undo" });
		const bar = button.closest(".ft-toast")?.querySelector<HTMLElement>(".ft-toast-progress");
		expect(bar?.style.getPropertyValue("--toast-duration")).toBe(`${UNDO_WINDOW_MS}ms`);
	});

	it("Undo restores, closes the toast and never commits", async () => {
		const { undo, commit } = setup();
		await fireEvent.click(await screen.findByRole("button", { name: "Undo" }));
		expect(undo).toHaveBeenCalledOnce();
		await waitFor(() => expect(screen.queryByRole("button", { name: "Undo" })).toBeNull());
		expect(commit).not.toHaveBeenCalled();
	});

	it("commits once when the window runs out", async () => {
		vi.useFakeTimers({ shouldAdvanceTime: true });
		const { undo, commit } = setup();
		await vi.advanceTimersByTimeAsync(UNDO_WINDOW_MS + 50);
		expect(commit).toHaveBeenCalledOnce();
		expect(undo).not.toHaveBeenCalled();
	});

	it("commits when the toast is dismissed or pushed out of the stack", async () => {
		const dismissed = setup();
		dismissToast(dismissed.id);
		expect(dismissed.commit).toHaveBeenCalledOnce();

		const pushed = setup();
		for (let i = 0; i < 4; i++) shown.push(toast({ title: `Other ${i}` }));
		expect(pushed.commit).toHaveBeenCalledOnce();
		expect(pushed.undo).not.toHaveBeenCalled();
	});
});
