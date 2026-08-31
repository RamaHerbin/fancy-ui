import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { ChatMessage } from "./ChatMessage.js";
import { ChatMessageAction } from "./ChatMessageAction.js";
import { ChatMessageActions } from "./ChatMessageActions.js";
import { ChatMessageBranches } from "./ChatMessageBranches.js";
import { ChatMessageHarness } from "./ChatMessageHarness.js";

function article(container: HTMLElement): HTMLElement {
	return container.querySelector("article") as HTMLElement;
}

/*
 * The component listens with `onPointerEnter`/`onPointerLeave`, which React
 * synthesises from the native over/out pair rather than from `pointerenter`
 * itself — same gesture, different wire.
 */
function pointerEnter(el: Element) {
	fireEvent.pointerOver(el);
}

function pointerLeave(el: Element) {
	fireEvent.pointerOut(el);
}

/*
 * A timer firing outside `act` schedules a React update that has not committed
 * by the time the next assertion runs. The Svelte suite's `await` on the async
 * advance was enough there; here the commit is what has to be awaited.
 */
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));

describe("ChatMessage", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("names the turn by its role", () => {
		const { container, rerender } = render(<ChatMessage content="Answer" />);
		expect(article(container).getAttribute("aria-label")).toBe("Assistant message");

		rerender(<ChatMessage role="user" content="Answer" />);
		expect(article(container).getAttribute("aria-label")).toBe("User message");
	});

	it("puts a user turn on the right and an assistant turn on the left", () => {
		const { container, rerender } = render(<ChatMessage role="user" content="Ask" />);
		expect(article(container).className).toContain("flex-row-reverse");

		rerender(<ChatMessage role="assistant" content="Ask" />);
		expect(article(container).className).not.toContain("flex-row-reverse");
		expect(article(container).className).not.toContain("justify-center");
	});

	it("centres a system turn", () => {
		const { container } = render(<ChatMessage role="system" content="Model switched" />);
		expect(article(container).className).toContain("justify-center");
		expect(article(container).textContent).toContain("Model switched");
	});

	it("gives the user turn bubble chrome the assistant turn does not get", () => {
		const { container, rerender } = render(<ChatMessage role="user" content="Ask" />);
		expect(container.querySelector(".ft-message-bubble")).toBeTruthy();

		rerender(<ChatMessage role="assistant" content="Ask" />);
		expect(container.querySelector(".ft-message-bubble")).toBeFalsy();
	});

	it("renders the content", () => {
		const { container } = render(<ChatMessage content="Two plus two is four." />);
		expect(article(container).textContent).toContain("Two plus two is four.");
	});

	it("streams a growing content string through to the body", () => {
		vi.useFakeTimers();
		const { container, rerender } = render(<ChatMessage content="The answer" streaming />);
		expect(container.querySelector(".ft-streaming-cursor")).toBeTruthy();

		rerender(<ChatMessage content="The answer is" streaming />);
		// The delta lands tinted: proof the accumulated string reached StreamingText
		// rather than being re-rendered wholesale.
		expect(container.querySelector(".ft-fresh")?.textContent).toBe(" is");
		expect(article(container).textContent).toContain("The answer is");

		rerender(<ChatMessage content="The answer is 4." streaming={false} />);
		expect(container.querySelector(".ft-streaming-cursor")).toBeFalsy();
	});

	it("renders markdown structure when asked", () => {
		const { container } = render(<ChatMessage content="A **bold** claim" markdown />);
		expect(container.querySelector("strong")?.textContent).toBe("bold");
	});

	it("shows a relative timestamp with the exact time as its tooltip", () => {
		const at = new Date(Date.now() - 5 * 60 * 1000);
		const { container } = render(<ChatMessage content="Answer" timestamp={at} />);
		const time = container.querySelector("time") as HTMLTimeElement;

		expect(time.textContent).toBe("5 minutes ago");
		expect(time.getAttribute("datetime")).toBe(at.toISOString());
		expect(time.getAttribute("title")).toBe(at.toISOString());
	});

	it("accepts an epoch number as the timestamp, and renders none without one", () => {
		const { container } = render(
			<ChatMessage content="Answer" timestamp={Date.now() - 60 * 60 * 1000} />
		);
		expect(container.querySelector("time")?.textContent).toBe("1 hour ago");

		cleanup();
		const bare = render(<ChatMessage content="Answer" />);
		expect(bare.container.querySelector("time")).toBeFalsy();
	});

	it("keeps the relative timestamp advancing while the message stays mounted", async () => {
		vi.useFakeTimers();
		const start = Date.now();
		const { container } = render(
			<ChatMessage content="Answer" timestamp={start - 5 * 60 * 1000} />
		);
		const time = () => container.querySelector("time") as HTMLTimeElement;

		expect(time().textContent).toBe("5 minutes ago");

		// No prop changes — only the wall clock moves, through the shared "now"
		// clock's own refresh interval. The async variant lets the state update it
		// triggers actually flush before the assertion below runs.
		vi.setSystemTime(start + 60 * 1000);
		await advance(30_000);

		expect(time().textContent).toBe("6 minutes ago");
	});

	it("stops ticking once unmounted, leaving no timer behind", () => {
		vi.useFakeTimers();
		const { unmount } = render(
			<ChatMessage content="Answer" timestamp={Date.now() - 5 * 60 * 1000} />
		);

		expect(vi.getTimerCount()).toBeGreaterThan(0);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("marks the body as a polite, busy-aware live region while streaming", () => {
		const { container, rerender } = render(<ChatMessage content="The answer" streaming />);
		const body = container.querySelector(".text-sm.leading-relaxed") as HTMLElement;

		expect(body.getAttribute("aria-live")).toBe("polite");
		expect(body.getAttribute("aria-atomic")).toBe("true");
		expect(body.getAttribute("aria-busy")).toBe("true");

		rerender(<ChatMessage content="The answer is 4." streaming={false} />);
		expect(body.getAttribute("aria-busy")).toBe("false");
	});

	it("marks a system turn's body as a polite live region too", () => {
		const { container } = render(<ChatMessage role="system" content="Model switched" />);
		const body = container.querySelector(".text-xs.leading-relaxed") as HTMLElement;

		expect(body.getAttribute("aria-live")).toBe("polite");
		expect(body.getAttribute("aria-busy")).toBe("false");
	});

	it("lets the children node replace the default body", () => {
		const { container } = render(
			<ChatMessage content="ignored">
				<p data-testid="custom">Rendered by the consumer</p>
			</ChatMessage>
		);

		expect(container.querySelector('[data-testid="custom"]')?.textContent).toBe(
			"Rendered by the consumer"
		);
		expect(article(container).textContent).not.toContain("ignored");
	});

	it("renders the avatar, actions and footer nodes", () => {
		const { container } = render(
			<ChatMessage
				content="Answer"
				avatar={<span data-testid="avatar">AI</span>}
				actions={<span data-testid="actions">rail</span>}
				footer={<span data-testid="footer">branches</span>}
			/>
		);

		expect(container.querySelector('[data-testid="avatar"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="actions"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="footer"]')).toBeTruthy();
	});

	it("drops the avatar and the rail on a system turn, keeping the footer", () => {
		const { container } = render(
			<ChatMessage
				role="system"
				content="Model switched"
				avatar={<span data-testid="avatar">S</span>}
				actions={<span data-testid="actions">rail</span>}
				footer={<span data-testid="footer">note</span>}
			/>
		);

		// A system line is a notice about the conversation, not a turn you act on.
		expect(container.querySelector('[data-testid="avatar"]')).toBeFalsy();
		expect(container.querySelector('[data-testid="actions"]')).toBeFalsy();
		expect(container.querySelector('[data-testid="footer"]')).toBeTruthy();
	});

	it("mirrors the role onto the root as a data attribute", () => {
		const { container } = render(<ChatMessage role="user" content="Ask" />);
		expect(article(container).dataset.role).toBe("user");
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(<ChatMessage content="Answer" className="my-message" />);
		expect(article(container).className).toContain("my-message");
		expect(article(container).className).toContain("ft-message");
	});
});

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
		const { container } = render(<ChatMessageAction label="Regenerate" />);

		expect(button(container).getAttribute("aria-label")).toBe("Regenerate");
		expect(button(container).getAttribute("title")).toBe("Regenerate");
		expect(button(container).getAttribute("type")).toBe("button");
	});

	it("fires onClick with the event", () => {
		const onClick = vi.fn();
		const { container } = render(<ChatMessageAction label="Copy" onClick={onClick} />);

		fireEvent.click(button(container));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(onClick.mock.calls[0]?.[0].nativeEvent).toBeInstanceOf(MouseEvent);
	});

	it("swaps in the confirmation label for two seconds, then goes back", async () => {
		vi.useFakeTimers();
		const { container } = render(<ChatMessageAction label="Copy" confirmLabel="Copied" />);

		fireEvent.click(button(container));
		expect(button(container).getAttribute("aria-label")).toBe("Copied");
		expect(button(container).getAttribute("title")).toBe("Copied");

		await advance(PAST_CONFIRM);
		expect(button(container).getAttribute("aria-label")).toBe("Copy");
	});

	it("restarts the confirmation window on a second click", async () => {
		vi.useFakeTimers();
		const { container } = render(<ChatMessageAction label="Copy" confirmLabel="Copied" />);

		fireEvent.click(button(container));
		await advance(1500);
		fireEvent.click(button(container));

		// The first deadline has passed by now; only the second one counts.
		await advance(1000);
		expect(button(container).getAttribute("aria-label")).toBe("Copied");

		await advance(PAST_CONFIRM);
		expect(button(container).getAttribute("aria-label")).toBe("Copy");
	});

	it("stays silent about pressedness unless it is a toggle", () => {
		const { container, rerender } = render(<ChatMessageAction label="Like" />);
		expect(button(container).hasAttribute("aria-pressed")).toBe(false);

		rerender(<ChatMessageAction label="Like" active={false} />);
		expect(button(container).getAttribute("aria-pressed")).toBe("false");

		rerender(<ChatMessageAction label="Like" active />);
		expect(button(container).getAttribute("aria-pressed")).toBe("true");
	});

	it("schedules nothing without a confirmation label, and leaves no timer behind", () => {
		vi.useFakeTimers();
		const plain = render(<ChatMessageAction label="Copy" />);
		fireEvent.click(button(plain.container));
		expect(vi.getTimerCount()).toBe(0);

		cleanup();
		const confirming = render(<ChatMessageAction label="Copy" confirmLabel="Copied" />);
		fireEvent.click(button(confirming.container));
		expect(vi.getTimerCount()).toBeGreaterThan(0);

		expect(() => confirming.unmount()).not.toThrow();
		expect(vi.getTimerCount()).toBe(0);
	});
});

describe("ChatMessageBranches", () => {
	afterEach(cleanup);

	it("reads as a labelled group with the position in it", () => {
		const { container } = render(
			<ChatMessageBranches index={2} count={3} onNavigate={() => {}} />
		);
		const group = container.querySelector('[role="group"]') as HTMLElement;

		expect(group.getAttribute("aria-label")).toBe("Response versions");
		expect(group.textContent).toContain("2/3");
	});

	it("navigates by 1-based index in both directions", () => {
		const onNavigate = vi.fn();
		const { getByLabelText } = render(
			<ChatMessageBranches index={2} count={3} onNavigate={onNavigate} />
		);

		fireEvent.click(getByLabelText("Previous version"));
		expect(onNavigate).toHaveBeenLastCalledWith(1);

		fireEvent.click(getByLabelText("Next version"));
		expect(onNavigate).toHaveBeenLastCalledWith(3);
		expect(onNavigate).toHaveBeenCalledTimes(2);
	});

	it("disables the edge it is already sitting on", () => {
		const { getByLabelText, rerender } = render(
			<ChatMessageBranches index={1} count={3} onNavigate={() => {}} />
		);
		expect((getByLabelText("Previous version") as HTMLButtonElement).disabled).toBe(true);
		expect((getByLabelText("Next version") as HTMLButtonElement).disabled).toBe(false);

		rerender(<ChatMessageBranches index={3} count={3} onNavigate={() => {}} />);
		expect((getByLabelText("Previous version") as HTMLButtonElement).disabled).toBe(false);
		expect((getByLabelText("Next version") as HTMLButtonElement).disabled).toBe(true);
	});

	it("disables both ends when there is only one version", () => {
		const { getByLabelText } = render(
			<ChatMessageBranches index={1} count={1} onNavigate={() => {}} />
		);
		expect((getByLabelText("Previous version") as HTMLButtonElement).disabled).toBe(true);
		expect((getByLabelText("Next version") as HTMLButtonElement).disabled).toBe(true);
	});
});

describe("ChatMessageActions", () => {
	afterEach(cleanup);

	it("is a labelled group rather than a toolbar with unimplemented arrow-key navigation", () => {
		const { container } = render(<ChatMessageActions />);
		expect(rail(container).getAttribute("role")).toBe("group");
		expect(rail(container).getAttribute("aria-label")).toBe("Message actions");
	});

	it("stays hidden until the message it lives in is hovered", () => {
		const { container } = render(<ChatMessageHarness />);
		const message = container.querySelector("article") as HTMLElement;

		expect(rail(container).className).not.toContain("ft-visible");

		pointerEnter(message);
		expect(rail(container).className).toContain("ft-visible");

		pointerLeave(message);
		expect(rail(container).className).not.toContain("ft-visible");
	});

	it("stays out while the keyboard is inside the message", () => {
		const { container } = render(<ChatMessageHarness />);
		const message = container.querySelector("article") as HTMLElement;

		fireEvent.focusIn(message);
		expect(rail(container).className).toContain("ft-visible");

		// A pointer wandering off must not strand a focused button in an invisible rail.
		pointerLeave(message);
		expect(rail(container).className).toContain("ft-visible");

		fireEvent.focusOut(message);
		expect(rail(container).className).not.toContain("ft-visible");
	});

	it("bypasses the hover gate entirely when alwaysVisible is set", () => {
		const { container } = render(<ChatMessageHarness alwaysVisible />);
		expect(rail(container).className).toContain("ft-visible");
	});

	it("composes inside a message without warnings, and wires the parts to its context", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const onNavigate = vi.fn();
		const onCopy = vi.fn();

		const { container, getByLabelText } = render(
			<ChatMessageHarness
				role="user"
				index={2}
				count={3}
				onNavigate={onNavigate}
				onCopy={onCopy}
			/>
		);

		// The branch navigator hugs the same edge the user turn does. Selected by
		// aria-label: the action rail is also role="group" in this harness.
		expect(
			(container.querySelector('[aria-label="Response versions"]') as HTMLElement).className
		).toContain("justify-end");

		fireEvent.click(getByLabelText("Copy"));
		expect(onCopy).toHaveBeenCalledTimes(1);

		fireEvent.click(getByLabelText("Next version"));
		expect(onNavigate).toHaveBeenLastCalledWith(3);

		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});
});
