import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ChatMessageAction from "./ChatMessageAction.svelte";
import ChatMessageActions from "./ChatMessageActions.svelte";
import ChatMessageBranches from "./ChatMessageBranches.svelte";
import Harness from "./ChatMessageHarness.test.svelte";
import { sound } from "../sound/sound.svelte.js";

/** Longer than the action's internal confirmation window. */
const PAST_CONFIRM = 2100;

function button(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button") as HTMLButtonElement;
}

function rail(container: HTMLElement): HTMLElement {
	// Selected by aria-label rather than role: ChatMessageBranches is also a
	// role="group" inside the same harness, and only the label disambiguates.
	return container.querySelector('[aria-label="Message actions"]') as HTMLElement;
}

describe("ChatMessageAction", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("names itself with the label, in the accessible name and the tooltip", () => {
		const { container } = render(ChatMessageAction, { props: { label: "Regenerate" } });

		expect(button(container).getAttribute("aria-label")).toBe("Regenerate");
		expect(button(container).getAttribute("title")).toBe("Regenerate");
		expect(button(container).getAttribute("type")).toBe("button");
	});

	it("fires onclick with the event", async () => {
		const onclick = vi.fn();
		const { container } = render(ChatMessageAction, { props: { label: "Copy", onclick } });

		await fireEvent.click(button(container));
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(onclick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
	});

	it("swaps in the confirmation label for two seconds, then goes back", async () => {
		vi.useFakeTimers();
		const { container } = render(ChatMessageAction, {
			props: { label: "Copy", confirmLabel: "Copied" },
		});

		await fireEvent.click(button(container));
		expect(button(container).getAttribute("aria-label")).toBe("Copied");
		expect(button(container).getAttribute("title")).toBe("Copied");

		await vi.advanceTimersByTimeAsync(PAST_CONFIRM);
		expect(button(container).getAttribute("aria-label")).toBe("Copy");
	});

	it("restarts the confirmation window on a second click", async () => {
		vi.useFakeTimers();
		const { container } = render(ChatMessageAction, {
			props: { label: "Copy", confirmLabel: "Copied" },
		});

		await fireEvent.click(button(container));
		await vi.advanceTimersByTimeAsync(1500);
		await fireEvent.click(button(container));

		// The first deadline has passed by now; only the second one counts.
		await vi.advanceTimersByTimeAsync(1000);
		expect(button(container).getAttribute("aria-label")).toBe("Copied");

		await vi.advanceTimersByTimeAsync(PAST_CONFIRM);
		expect(button(container).getAttribute("aria-label")).toBe("Copy");
	});

	it("stays silent about pressedness unless it is a toggle", async () => {
		const { container, rerender } = render(ChatMessageAction, { props: { label: "Like" } });
		expect(button(container).hasAttribute("aria-pressed")).toBe(false);

		await rerender({ label: "Like", active: false });
		expect(button(container).getAttribute("aria-pressed")).toBe("false");

		await rerender({ label: "Like", active: true });
		expect(button(container).getAttribute("aria-pressed")).toBe("true");
	});

	it("schedules nothing without a confirmation label, and leaves no timer behind", async () => {
		vi.useFakeTimers();
		const plain = render(ChatMessageAction, { props: { label: "Copy" } });
		await fireEvent.click(button(plain.container));
		expect(vi.getTimerCount()).toBe(0);

		cleanup();
		const confirming = render(ChatMessageAction, {
			props: { label: "Copy", confirmLabel: "Copied" },
		});
		await fireEvent.click(button(confirming.container));
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		expect(() => confirming.unmount()).not.toThrow();
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("ChatMessageBranches", () => {
	afterEach(cleanup);

	it("reads as a labelled group with the position in it", () => {
		const { container } = render(ChatMessageBranches, {
			props: { index: 2, count: 3, onNavigate: () => {} },
		});
		const group = container.querySelector('[role="group"]') as HTMLElement;

		expect(group.getAttribute("aria-label")).toBe("Response versions");
		expect(group.textContent).toContain("2/3");
	});

	it("navigates by 1-based index in both directions", async () => {
		const onNavigate = vi.fn();
		const { getByLabelText } = render(ChatMessageBranches, {
			props: { index: 2, count: 3, onNavigate },
		});

		await fireEvent.click(getByLabelText("Previous version"));
		expect(onNavigate).toHaveBeenLastCalledWith(1);

		await fireEvent.click(getByLabelText("Next version"));
		expect(onNavigate).toHaveBeenLastCalledWith(3);
		expect(onNavigate).toHaveBeenCalledTimes(2);
	});

	it("disables the edge it is already sitting on", async () => {
		const { getByLabelText, rerender } = render(ChatMessageBranches, {
			props: { index: 1, count: 3, onNavigate: () => {} },
		});
		expect((getByLabelText("Previous version") as HTMLButtonElement).disabled).toBe(true);
		expect((getByLabelText("Next version") as HTMLButtonElement).disabled).toBe(false);

		await rerender({ index: 3, count: 3, onNavigate: () => {} });
		expect((getByLabelText("Previous version") as HTMLButtonElement).disabled).toBe(false);
		expect((getByLabelText("Next version") as HTMLButtonElement).disabled).toBe(true);
	});

	it("disables both ends when there is only one version", () => {
		const { getByLabelText } = render(ChatMessageBranches, {
			props: { index: 1, count: 1, onNavigate: () => {} },
		});
		expect((getByLabelText("Previous version") as HTMLButtonElement).disabled).toBe(true);
		expect((getByLabelText("Next version") as HTMLButtonElement).disabled).toBe(true);
	});
});

describe("ChatMessageActions", () => {
	afterEach(cleanup);

	it("is a labelled group rather than a toolbar with unimplemented arrow-key navigation", () => {
		const { container } = render(ChatMessageActions, {});
		expect(rail(container).getAttribute("role")).toBe("group");
		expect(rail(container).getAttribute("aria-label")).toBe("Message actions");
	});

	it("stays hidden until the message it lives in is hovered", async () => {
		const { container } = render(Harness, {});
		const message = container.querySelector("article") as HTMLElement;

		expect(rail(container).className).not.toContain("ft-visible");

		await fireEvent.pointerEnter(message);
		expect(rail(container).className).toContain("ft-visible");

		await fireEvent.pointerLeave(message);
		expect(rail(container).className).not.toContain("ft-visible");
	});

	it("stays out while the keyboard is inside the message", async () => {
		const { container } = render(Harness, {});
		const message = container.querySelector("article") as HTMLElement;

		await fireEvent.focusIn(message);
		expect(rail(container).className).toContain("ft-visible");

		// A pointer wandering off must not strand a focused button in an invisible rail.
		await fireEvent.pointerLeave(message);
		expect(rail(container).className).toContain("ft-visible");

		await fireEvent.focusOut(message);
		expect(rail(container).className).not.toContain("ft-visible");
	});

	it("bypasses the hover gate entirely when alwaysVisible is set", () => {
		const { container } = render(Harness, { props: { alwaysVisible: true } });
		expect(rail(container).className).toContain("ft-visible");
	});

	it("composes inside a message without warnings, and wires the parts to its context", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const onNavigate = vi.fn();
		const onCopy = vi.fn();

		const { container, getByLabelText } = render(Harness, {
			props: { role: "user", index: 2, count: 3, onNavigate, onCopy },
		});

		// The branch navigator hugs the same edge the user turn does. Selected by
		// aria-label: the action rail is also role="group" in this harness.
		expect(
			(container.querySelector('[aria-label="Response versions"]') as HTMLElement).className
		).toContain("justify-end");

		await fireEvent.click(getByLabelText("Copy"));
		expect(onCopy).toHaveBeenCalledTimes(1);

		await fireEvent.click(getByLabelText("Next version"));
		expect(onNavigate).toHaveBeenLastCalledWith(3);

		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});
});

describe("sound", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
		vi.useRealTimers();
	});

	describe("ChatMessageAction", () => {
		it("plays the press cue exactly once when a message action is clicked, with sound enabled on the root", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { sound: true } });

			await fireEvent.click(button(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays nothing by default (the root's sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, {});

			await fireEvent.click(button(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing for a loose action button outside a ChatMessage root", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(ChatMessageAction, { props: { label: "Copy" } });

			await fireEvent.click(button(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("does not double-fire: one click plays one cue, and the confirmLabel window is untouched", async () => {
			vi.useFakeTimers();
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(Harness, { props: { sound: true } });

			await fireEvent.click(button(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(button(container).getAttribute("aria-label")).toBe("Copied");
		});
	});

	describe("ChatMessageBranches", () => {
		it("plays the select cue exactly once when a version is stepped, with sound enabled on the root", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(Harness, { props: { sound: true, index: 2, count: 3 } });

			await fireEvent.click(getByLabelText("Next version"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays nothing by default (the root's sound prop omitted)", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(Harness, { props: { index: 2, count: 3 } });

			await fireEvent.click(getByLabelText("Next version"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing at the start edge, even via a synthetic dispatch that bypasses the native disabled attribute", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const onNavigate = vi.fn();
			const { getByLabelText } = render(Harness, {
				props: { sound: true, index: 1, count: 3, onNavigate },
			});

			getByLabelText("Previous version").dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
			expect(onNavigate).not.toHaveBeenCalled();
		});

		it("does not double-fire: one step plays one cue, not two", async () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { getByLabelText } = render(Harness, { props: { sound: true, index: 2, count: 3 } });

			await fireEvent.click(getByLabelText("Next version"));

			expect(play).toHaveBeenCalledTimes(1);
		});
	});
});
