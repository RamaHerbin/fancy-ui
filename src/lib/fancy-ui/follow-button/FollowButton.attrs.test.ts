import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import FollowButton from "./FollowButton.svelte";

const button = (c: HTMLElement) => c.querySelector("button") as HTMLButtonElement;

describe("FollowButton native attributes", () => {
	afterEach(() => {
		cleanup();
	});

	it("forwards id, aria-* and data-* to the button", () => {
		const { container } = render(FollowButton, {
			props: { id: "fb", "aria-describedby": "hint", "data-testid": "follow" },
		});
		const el = button(container);
		expect(el.id).toBe("fb");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("follow");
	});

	it("fires a listener the component does not handle once", async () => {
		const onblur = vi.fn();
		const { container } = render(FollowButton, { props: { onblur } });
		await fireEvent.blur(button(container));
		expect(onblur).toHaveBeenCalledTimes(1);
	});

	it("uses a consumer aria-label as the accessible name when `label` is absent", () => {
		const { container } = render(FollowButton, { props: { "aria-label": "Follow the team" } });
		expect(button(container).getAttribute("aria-label")).toBe("Follow the team");
	});

	it("keeps aria-pressed, aria-busy, data-state and type under consumer overrides", async () => {
		const { container } = render(FollowButton, {
			props: {
				"aria-pressed": "mixed",
				"aria-busy": "true",
				"data-state": "wrong",
				...({ type: "submit" } as Record<string, unknown>),
			},
		});
		const el = button(container);
		expect(el.getAttribute("aria-pressed")).toBe("false");
		expect(el.hasAttribute("aria-busy")).toBe(false);
		expect(el.getAttribute("data-state")).toBe("idle");
		expect(el.type).toBe("button");
	});

	it("does not call the consumer click while disabled", async () => {
		const onclick = vi.fn();
		const { container } = render(FollowButton, { props: { disabled: true, onclick } });
		await fireEvent.click(button(container));
		expect(onclick).not.toHaveBeenCalled();
	});
});
