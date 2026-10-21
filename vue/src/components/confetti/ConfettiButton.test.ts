import { render, screen, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import { h } from "vue";
import confetti from "canvas-confetti";
import ConfettiButton from "./ConfettiButton.vue";

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
		const submit = vi.fn((e: Event) => e.preventDefault());
		const Host = {
			render: () => h("form", { onSubmit: submit }, [h(ConfettiButton, null, () => "go")]),
		};
		render(Host);
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("type", "button");
		await fireEvent.click(button);
		expect(submit).toHaveBeenCalledTimes(0);
	});

	it("lets type=submit override the default", () => {
		render(ConfettiButton, { attrs: { type: "submit" } });
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	it("merges class and forwards native attributes", () => {
		render(ConfettiButton, {
			props: { class: "extra" },
			attrs: { "aria-label": "party", "data-testid": "cb" },
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
		const onClick = vi.fn(() => order.push("click"));
		render(ConfettiButton, { props: { onClick } });

		await fireEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(order).toEqual(["burst", "click"]);
	});

	it("accepts a consumer click listener through attrs", async () => {
		const onClick = vi.fn();
		render(ConfettiButton, { attrs: { onClick } });
		await fireEvent.click(screen.getByRole("button"));
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("does nothing when disabled", async () => {
		const onClick = vi.fn();
		render(ConfettiButton, { props: { disabled: true, onClick } });
		await fireEvent.click(screen.getByRole("button"));
		expect(onClick).not.toHaveBeenCalled();
		expect(confetti).not.toHaveBeenCalled();
	});
});
