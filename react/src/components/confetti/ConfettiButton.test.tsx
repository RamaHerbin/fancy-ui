import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import confetti from "canvas-confetti";
import { ConfettiButton } from "./ConfettiButton.js";

const mocks = vi.hoisted(() => ({ globalFire: vi.fn() }));

vi.mock("canvas-confetti", () => {
	const mocked = mocks.globalFire as typeof mocks.globalFire & { create: () => unknown };
	mocked.create = () => Object.assign(vi.fn(), { reset: vi.fn() });
	return { default: mocked };
});

afterEach(() => {
	cleanup();
	mocks.globalFire.mockReset();
});

describe("ConfettiButton contract", () => {
	it("defaults to type=button and does not submit a surrounding form", () => {
		const submit = vi.fn((e: { preventDefault: () => void }) => e.preventDefault());
		render(
			<form onSubmit={submit}>
				<ConfettiButton>go</ConfettiButton>
			</form>
		);
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("type", "button");
		fireEvent.click(button);
		expect(submit).toHaveBeenCalledTimes(0);
	});

	it("lets type=submit override the default", () => {
		render(<ConfettiButton type="submit">go</ConfettiButton>);
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	it("merges className and forwards native attributes", () => {
		render(
			<ConfettiButton className="extra" aria-label="party" data-testid="cb">
				go
			</ConfettiButton>
		);
		const button = screen.getByTestId("cb");
		expect(button).toHaveClass("extra");
		expect(button).toHaveAttribute("aria-label", "party");
	});

	it("calls the consumer click handler once, after the burst", () => {
		const order: string[] = [];
		vi.mocked(confetti).mockImplementation((() => {
			order.push("burst");
		}) as never);
		const onClick = vi.fn(() => order.push("click"));
		render(<ConfettiButton onClick={onClick}>go</ConfettiButton>);

		fireEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(order).toEqual(["burst", "click"]);
	});

	it("does nothing when disabled", () => {
		const onClick = vi.fn();
		render(
			<ConfettiButton disabled onClick={onClick}>
				go
			</ConfettiButton>
		);
		fireEvent.click(screen.getByRole("button"));
		expect(onClick).not.toHaveBeenCalled();
		expect(confetti).not.toHaveBeenCalled();
	});
});
