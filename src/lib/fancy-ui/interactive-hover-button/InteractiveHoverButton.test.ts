import { render, screen, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import InteractiveHoverButton from "./InteractiveHoverButton.svelte";
import { sound } from "../sound/sound.svelte.js";

describe("InteractiveHoverButton", () => {
	afterEach(cleanup);

	it("renders a button element", () => {
		render(InteractiveHoverButton);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it('renders default text "Button" when no text prop is provided', () => {
		render(InteractiveHoverButton);
		const button = screen.getByRole("button");
		expect(button).toHaveTextContent("Button");
	});

	it("renders custom text from the text prop", () => {
		render(InteractiveHoverButton, { props: { text: "Get Started" } });
		const button = screen.getByRole("button");
		expect(button).toHaveTextContent("Get Started");
	});

	it("displays the text twice (initial + hover overlay)", () => {
		render(InteractiveHoverButton, { props: { text: "Subscribe" } });
		const matches = screen.getAllByText("Subscribe");
		expect(matches).toHaveLength(2);
	});

	it("exposes the label once in the accessible name, not twice", () => {
		render(InteractiveHoverButton, { props: { text: "Subscribe" } });
		const button = screen.getByRole("button", { name: "Subscribe" });
		expect(button.getAttribute("aria-label")).not.toBe("Subscribe Subscribe");
	});

	it("renders the arrow SVG icon", () => {
		render(InteractiveHoverButton);
		const button = screen.getByRole("button");
		const svg = button.querySelector("svg");
		expect(svg).toBeInTheDocument();
		expect(svg?.querySelectorAll("path")).toHaveLength(2);
	});

	it("applies custom class names", () => {
		render(InteractiveHoverButton, { props: { class: "my-custom-class" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("my-custom-class");
	});

	it("preserves base classes when custom class is added", () => {
		render(InteractiveHoverButton, { props: { class: "extra" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("overflow-hidden");
		expect(button.className).toContain("rounded-full");
	});

	it("forwards native button attributes", () => {
		render(InteractiveHoverButton, {
			props: { disabled: true, type: "submit", "aria-label": "Sign up" },
		});
		const button = screen.getByRole("button");
		expect(button).toBeDisabled();
		expect(button).toHaveAttribute("type", "submit");
		expect(button).toHaveAttribute("aria-label", "Sign up");
	});

	it("renders the fill layer (the dot that opens) hidden from assistive tech", () => {
		render(InteractiveHoverButton);
		const fill = screen.getByRole("button").querySelector(".ihb-fill");
		expect(fill).toBeInTheDocument();
		expect(fill).toHaveAttribute("aria-hidden", "true");
	});

	it("keeps the hover label and its arrow out of the accessibility tree", () => {
		render(InteractiveHoverButton, { props: { text: "Subscribe" } });
		const hover = screen.getByRole("button").querySelector(".ihb-hover");
		expect(hover).toHaveAttribute("aria-hidden", "true");
		expect(hover?.querySelector("svg")).toBeInTheDocument();
		expect(hover).toHaveTextContent("Subscribe");
	});

	it("renders the resting label with room for the dot", () => {
		render(InteractiveHoverButton, { props: { text: "Subscribe" } });
		const rest = screen.getByRole("button").querySelector(".ihb-rest");
		expect(rest?.querySelector(".ihb-dot-space")).toBeInTheDocument();
		expect(rest).toHaveTextContent("Subscribe");
	});

	it("lets class override the fill colours through CSS variables", () => {
		render(InteractiveHoverButton, { props: { class: "[--ihb-fill:#ef4444]" } });
		expect(screen.getByRole("button").className).toContain("[--ihb-fill:#ef4444]");
	});
});
