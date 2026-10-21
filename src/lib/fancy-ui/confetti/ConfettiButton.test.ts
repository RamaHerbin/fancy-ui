import { render, screen, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ConfettiButton from "./ConfettiButton.svelte";
import confetti from "canvas-confetti";

vi.mock("canvas-confetti", () => {
	const globalFire = vi.fn();
	const mocked = globalFire as typeof globalFire & { create: () => unknown };
	mocked.create = () => Object.assign(vi.fn(), { reset: vi.fn() });
	return { default: mocked };
});

afterEach(() => {
	cleanup();
	vi.mocked(confetti).mockReset();
});

describe("ConfettiButton contract", () => {
	it("defaults to type=button and does not submit a surrounding form", async () => {
		const form = document.body.appendChild(document.createElement("form"));
		const submit = vi.fn((e: Event) => e.preventDefault());
		form.addEventListener("submit", submit);
		render(ConfettiButton, { target: form, props: { "aria-label": "go" } as never });

		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("type", "button");
		await fireEvent.click(button);
		expect(submit).toHaveBeenCalledTimes(0);
		form.remove();
	});

	it("lets type=submit override the default", () => {
		render(ConfettiButton, { props: { type: "submit" } as never });
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	it("merges class and forwards native attributes", () => {
		render(ConfettiButton, {
			props: { class: "extra", "aria-label": "party", "data-testid": "cb" } as never,
		});
		const button = screen.getByTestId("cb");
		expect(button).toHaveClass("extra");
		expect(button).toHaveAttribute("aria-label", "party");
	});

	it("calls the consumer click handler once, after the burst", async () => {
		const order: string[] = [];
		vi.mocked(confetti).mockImplementation((() => {
			order.push("burst");
		}) as never);
		const onclick = vi.fn(() => order.push("click"));
		render(ConfettiButton, { props: { onclick } as never });

		await fireEvent.click(screen.getByRole("button"));
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(order).toEqual(["burst", "click"]);
	});

	it("does nothing when disabled", async () => {
		const onclick = vi.fn();
		render(ConfettiButton, { props: { disabled: true, onclick } as never });

		await fireEvent.click(screen.getByRole("button"));
		expect(onclick).not.toHaveBeenCalled();
		expect(confetti).not.toHaveBeenCalled();
	});
});
