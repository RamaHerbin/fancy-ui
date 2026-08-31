import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ChatError from "./ChatError.svelte";
import { sound } from "../sound/sound.svelte.js";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function retryButton(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector(".ft-error-retry");
}

describe("ChatError", () => {
	afterEach(cleanup);

	it("announces a default message as an alert", () => {
		const { container } = render(ChatError);
		const root = container.firstElementChild as HTMLElement;

		expect(root.getAttribute("role")).toBe("alert");
		expect(container.querySelector(".ft-error-message")?.textContent).toBe("Something went wrong");
	});

	it("renders the given message and detail", () => {
		const { container } = render(ChatError, {
			props: { message: "The reply could not be delivered", detail: "network_error · 8f21c0" },
		});

		expect(container.querySelector(".ft-error-message")?.textContent).toBe(
			"The reply could not be delivered"
		);
		expect(container.querySelector(".ft-error-detail")?.textContent).toBe("network_error · 8f21c0");
	});

	it("renders no detail line when none is given", () => {
		const { container } = render(ChatError, { props: { message: "Failed" } });
		expect(container.querySelector(".ft-error-detail")).toBeFalsy();
	});

	it("renders no retry button without an onRetry handler", () => {
		const { container } = render(ChatError, { props: { message: "Failed" } });
		expect(retryButton(container)).toBeFalsy();
	});

	it("calls onRetry when the retry button is pressed", async () => {
		const onRetry = vi.fn();
		const { container } = render(ChatError, { props: { onRetry } });

		const button = retryButton(container) as HTMLButtonElement;
		expect(button.textContent?.trim()).toBe("Retry");

		await fireEvent.click(button);
		expect(onRetry).toHaveBeenCalledTimes(1);
	});

	it("uses a custom retry label", () => {
		const { container } = render(ChatError, {
			props: { onRetry: () => {}, retryLabel: "Try again" },
		});
		expect(retryButton(container)?.textContent?.trim()).toBe("Try again");
	});

	it("disables the retry button and marks the row busy while retrying", () => {
		const onRetry = vi.fn();
		const { container } = render(ChatError, { props: { onRetry, retrying: true } });
		const root = container.firstElementChild as HTMLElement;

		expect(root.getAttribute("aria-busy")).toBe("true");
		expect(retryButton(container)?.disabled).toBe(true);
		expect(container.querySelector(".ft-error-dot")).toBeTruthy();

		// `.click()` honours the disabled state the way a real press does, unlike a
		// synthetic `fireEvent.click`, which dispatches straight past it.
		retryButton(container)?.click();
		expect(onRetry).not.toHaveBeenCalled();
	});

	it("leaves the row unbusy and dotless when it is not retrying", () => {
		const { container } = render(ChatError, { props: { onRetry: () => {} } });
		const root = container.firstElementChild as HTMLElement;

		expect(root.getAttribute("aria-busy")).toBeNull();
		expect(retryButton(container)?.disabled).toBe(false);
		expect(container.querySelector(".ft-error-dot")).toBeFalsy();
	});

	it("replaces the message and detail with the children snippet", () => {
		const { container } = render(ChatError, {
			props: {
				message: "Something went wrong",
				detail: "network_error",
				children: snippet("<span>Rate limit reached, retrying in 30s</span>"),
			},
		});

		expect(container.querySelector(".ft-error-message")).toBeFalsy();
		expect(container.querySelector(".ft-error-detail")).toBeFalsy();
		expect(container.querySelector(".ft-error-body")?.textContent).toBe(
			"Rate limit reached, retrying in 30s"
		);
	});

	it("swaps the default triangle for the icon snippet, still hidden from assistive tech", () => {
		const { container } = render(ChatError, {
			props: { icon: snippet('<span class="my-icon">!</span>') },
		});
		const slot = container.querySelector(".ft-error-icon") as HTMLElement;

		expect(slot.getAttribute("aria-hidden")).toBe("true");
		expect(slot.querySelector("svg")).toBeFalsy();
		expect(slot.querySelector(".my-icon")).toBeTruthy();
	});

	it("merges custom class names alongside the base classes", () => {
		const { container } = render(ChatError, { props: { class: "my-error" } });
		const root = container.firstElementChild as HTMLElement;

		expect(root.className).toContain("my-error");
		expect(root.className).toContain("ft-error");
	});

	describe("sound", () => {
		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the press cue exactly once when retry is pressed, with sound enabled", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onRetry = vi.fn();
			const { container } = render(ChatError, { props: { onRetry, sound: true } });

			await fireEvent.click(retryButton(container) as HTMLButtonElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
			expect(onRetry).toHaveBeenCalledTimes(1);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(ChatError, { props: { onRetry: () => {} } });

			await fireEvent.click(retryButton(container) as HTMLButtonElement);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while retrying, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onRetry = vi.fn();
			const { container } = render(ChatError, {
				props: { onRetry, retrying: true, sound: true },
			});

			// A synthetic dispatch bypasses jsdom's own disabled handling, unlike
			// `.click()` — this is what actually proves the handler's own guard,
			// not just the native `disabled` attribute.
			retryButton(container)?.dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
			expect(onRetry).not.toHaveBeenCalled();
		});

		it("does not double-fire: one click plays one cue, not two", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(ChatError, { props: { onRetry: () => {}, sound: true } });

			await fireEvent.click(retryButton(container) as HTMLButtonElement);

			expect(play).toHaveBeenCalledTimes(1);
		});
	});
});
