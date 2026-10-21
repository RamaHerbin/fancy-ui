import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { SavePublishExample } from "../../../docs-examples/recipes/save-publish.js";
import { dismissToast, toastStore } from "./store.js";

/** The React recipe must retry with the checkbox as it is NOW, not as it was at the first click. */
describe("save-publish recipe (React)", () => {
	beforeEach(() => vi.useFakeTimers());
	afterEach(() => {
		for (const item of [...toastStore.items]) dismissToast(item.id);
		cleanup();
		vi.useRealTimers();
	});

	it("Retry reads the live 'fail next' flag", async () => {
		const { container } = render(<SavePublishExample />);
		const box = container.querySelector("input[type=checkbox]") as HTMLInputElement;
		const publishButton = screen.getByRole("button", { name: /publish/i });

		fireEvent.click(box);
		fireEvent.click(publishButton);
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1300);
		});
		expect(document.body.textContent).toContain("Could not publish");

		fireEvent.click(box); // untick
		fireEvent.click(screen.getByRole("button", { name: "Retry" }));
		await act(async () => {
			await vi.advanceTimersByTimeAsync(1300);
		});
		// The retry succeeded: the status mark says so and no failure is left.
		expect(document.body.textContent).toContain("Done");
		expect(document.body.textContent).not.toContain("Failed");
	});

	it("shows a single progress indicator while saving (no Button loading spinner)", async () => {
		render(<SavePublishExample />);
		fireEvent.click(screen.getByRole("button", { name: /publish/i }));
		expect(document.querySelector(".ft-btn-spinner")).toBeNull();
	});
});
