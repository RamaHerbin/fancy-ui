import { render, cleanup } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ChatMessage from "./ChatMessage.svelte";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function article(container: HTMLElement): HTMLElement {
	return container.querySelector("article") as HTMLElement;
}

describe("ChatMessage", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("names the turn by its role", async () => {
		const { container, rerender } = render(ChatMessage, { props: { content: "Answer" } });
		expect(article(container).getAttribute("aria-label")).toBe("Assistant message");

		await rerender({ role: "user", content: "Answer" });
		expect(article(container).getAttribute("aria-label")).toBe("User message");
	});

	it("puts a user turn on the right and an assistant turn on the left", async () => {
		const { container, rerender } = render(ChatMessage, {
			props: { role: "user", content: "Ask" },
		});
		expect(article(container).className).toContain("flex-row-reverse");

		await rerender({ role: "assistant", content: "Ask" });
		expect(article(container).className).not.toContain("flex-row-reverse");
		expect(article(container).className).not.toContain("justify-center");
	});

	it("centres a system turn", () => {
		const { container } = render(ChatMessage, {
			props: { role: "system", content: "Model switched" },
		});
		expect(article(container).className).toContain("justify-center");
		expect(article(container).textContent).toContain("Model switched");
	});

	it("gives the user turn bubble chrome the assistant turn does not get", async () => {
		const { container, rerender } = render(ChatMessage, {
			props: { role: "user", content: "Ask" },
		});
		expect(container.querySelector(".ft-message-bubble")).toBeTruthy();

		await rerender({ role: "assistant", content: "Ask" });
		expect(container.querySelector(".ft-message-bubble")).toBeFalsy();
	});

	it("renders the content", () => {
		const { container } = render(ChatMessage, { props: { content: "Two plus two is four." } });
		expect(article(container).textContent).toContain("Two plus two is four.");
	});

	it("streams a growing content string through to the body", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(ChatMessage, {
			props: { content: "The answer", streaming: true },
		});
		expect(container.querySelector(".ft-streaming-cursor")).toBeTruthy();

		await rerender({ content: "The answer is", streaming: true });
		// The delta lands tinted: proof the accumulated string reached StreamingText
		// rather than being re-rendered wholesale.
		expect(container.querySelector(".ft-fresh")?.textContent).toBe(" is");
		expect(article(container).textContent).toContain("The answer is");

		await rerender({ content: "The answer is 4.", streaming: false });
		expect(container.querySelector(".ft-streaming-cursor")).toBeFalsy();
	});

	it("renders markdown structure when asked", () => {
		const { container } = render(ChatMessage, {
			props: { content: "A **bold** claim", markdown: true },
		});
		expect(container.querySelector("strong")?.textContent).toBe("bold");
	});

	it("shows a relative timestamp with the exact time as its tooltip", () => {
		const at = new Date(Date.now() - 5 * 60 * 1000);
		const { container } = render(ChatMessage, { props: { content: "Answer", timestamp: at } });
		const time = container.querySelector("time") as HTMLTimeElement;

		expect(time.textContent).toBe("5 minutes ago");
		expect(time.getAttribute("datetime")).toBe(at.toISOString());
		expect(time.getAttribute("title")).toBe(at.toISOString());
	});

	it("accepts an epoch number as the timestamp, and renders none without one", () => {
		const { container } = render(ChatMessage, {
			props: { content: "Answer", timestamp: Date.now() - 60 * 60 * 1000 },
		});
		expect(container.querySelector("time")?.textContent).toBe("1 hour ago");

		cleanup();
		const bare = render(ChatMessage, { props: { content: "Answer" } });
		expect(bare.container.querySelector("time")).toBeFalsy();
	});

	it("keeps the relative timestamp advancing while the message stays mounted", async () => {
		vi.useFakeTimers();
		const start = Date.now();
		const { container } = render(ChatMessage, {
			props: { content: "Answer", timestamp: start - 5 * 60 * 1000 },
		});
		const time = () => container.querySelector("time") as HTMLTimeElement;

		expect(time().textContent).toBe("5 minutes ago");

		// No prop changes — only the wall clock moves, through the shared "now"
		// clock's own refresh interval. The async variant lets the effect it
		// triggers actually flush before the assertion below runs.
		vi.setSystemTime(start + 60 * 1000);
		await vi.advanceTimersByTimeAsync(30_000);

		expect(time().textContent).toBe("6 minutes ago");
	});

	it("stops ticking once unmounted, leaving no timer behind", () => {
		vi.useFakeTimers();
		const { unmount } = render(ChatMessage, {
			props: { content: "Answer", timestamp: Date.now() - 5 * 60 * 1000 },
		});

		expect(vi.getTimerCount()).toBeGreaterThan(0);
		unmount();
		expect(vi.getTimerCount()).toBe(0);
	});

	it("marks the body as a polite, busy-aware live region while streaming", async () => {
		const { container, rerender } = render(ChatMessage, {
			props: { content: "The answer", streaming: true },
		});
		const body = container.querySelector(".text-sm.leading-relaxed") as HTMLElement;

		expect(body.getAttribute("aria-live")).toBe("polite");
		expect(body.getAttribute("aria-atomic")).toBe("true");
		expect(body.getAttribute("aria-busy")).toBe("true");

		await rerender({ content: "The answer is 4.", streaming: false });
		expect(body.getAttribute("aria-busy")).toBe("false");
	});

	it("marks a system turn's body as a polite live region too", () => {
		const { container } = render(ChatMessage, {
			props: { role: "system", content: "Model switched" },
		});
		const body = container.querySelector(".text-xs.leading-relaxed") as HTMLElement;

		expect(body.getAttribute("aria-live")).toBe("polite");
		expect(body.getAttribute("aria-busy")).toBe("false");
	});

	it("lets the children snippet replace the default body", () => {
		const { container } = render(ChatMessage, {
			props: {
				content: "ignored",
				children: snippet('<p data-testid="custom">Rendered by the consumer</p>'),
			},
		});

		expect(container.querySelector('[data-testid="custom"]')?.textContent).toBe(
			"Rendered by the consumer"
		);
		expect(article(container).textContent).not.toContain("ignored");
	});

	it("renders the avatar, actions and footer snippets", () => {
		const { container } = render(ChatMessage, {
			props: {
				content: "Answer",
				avatar: snippet('<span data-testid="avatar">AI</span>'),
				actions: snippet('<span data-testid="actions">rail</span>'),
				footer: snippet('<span data-testid="footer">branches</span>'),
			},
		});

		expect(container.querySelector('[data-testid="avatar"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="actions"]')).toBeTruthy();
		expect(container.querySelector('[data-testid="footer"]')).toBeTruthy();
	});

	it("drops the avatar and the rail on a system turn, keeping the footer", () => {
		const { container } = render(ChatMessage, {
			props: {
				role: "system",
				content: "Model switched",
				avatar: snippet('<span data-testid="avatar">S</span>'),
				actions: snippet('<span data-testid="actions">rail</span>'),
				footer: snippet('<span data-testid="footer">note</span>'),
			},
		});

		// A system line is a notice about the conversation, not a turn you act on.
		expect(container.querySelector('[data-testid="avatar"]')).toBeFalsy();
		expect(container.querySelector('[data-testid="actions"]')).toBeFalsy();
		expect(container.querySelector('[data-testid="footer"]')).toBeTruthy();
	});

	it("mirrors the role onto the root as a data attribute", () => {
		const { container } = render(ChatMessage, { props: { role: "user", content: "Ask" } });
		expect(article(container).dataset.role).toBe("user");
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(ChatMessage, {
			props: { content: "Answer", class: "my-message" },
		});
		expect(article(container).className).toContain("my-message");
		expect(article(container).className).toContain("ft-message");
	});
});
