import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { FollowButton } from "./FollowButton.js";

const button = (c: HTMLElement) => c.querySelector("button") as HTMLButtonElement;

describe("FollowButton native attributes", () => {
	afterEach(() => {
		cleanup();
	});

	it("forwards id, aria-* and data-* to the button", () => {
		const { container } = render(
			<FollowButton id="fb" aria-describedby="hint" data-testid="follow" />
		);
		const el = button(container);
		expect(el.id).toBe("fb");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("follow");
	});

	it("fires a listener the component does not handle once", () => {
		const onBlur = vi.fn();
		const { container } = render(<FollowButton onBlur={onBlur} />);
		fireEvent.blur(button(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("uses a consumer aria-label as the accessible name when `label` is absent", () => {
		const { container } = render(<FollowButton aria-label="Follow the team" />);
		expect(button(container).getAttribute("aria-label")).toBe("Follow the team");
	});

	it("keeps aria-pressed, aria-busy, data-state and type under consumer overrides", () => {
		const { container } = render(
			<FollowButton
				aria-pressed="mixed"
				aria-busy="true"
				data-state="wrong"
				{...({ type: "submit" } as Record<string, unknown>)}
			/>
		);
		const el = button(container);
		expect(el.getAttribute("aria-pressed")).toBe("false");
		expect(el.hasAttribute("aria-busy")).toBe(false);
		expect(el.getAttribute("data-state")).toBe("idle");
		expect(el.type).toBe("button");
	});

	it("does not call the consumer click while disabled", () => {
		const onClick = vi.fn();
		const { container } = render(<FollowButton disabled onClick={onClick} />);
		fireEvent.click(button(container));
		expect(onClick).not.toHaveBeenCalled();
	});
});
