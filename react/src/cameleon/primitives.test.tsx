import type { ReactNode } from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { FancyProvider } from "./FancyProvider.js";
import { defaultSkin } from "./skins/default.js";
import {
	Badge,
	Button,
	Checkbox,
	Input,
	Radio,
	Select,
	Slider,
	Switch,
	Textarea,
	Tooltip,
} from "./primitives/index.js";

function withSkin(children: ReactNode) {
	return render(<FancyProvider skin={defaultSkin}>{children}</FancyProvider>);
}

describe("cameleon primitives", () => {
	it("Button renders with a recipe-derived class and honors disabled", () => {
		withSkin(<Button disabled>Go</Button>);
		const button = screen.getByRole("button", { name: "Go" });
		expect(button.className).toContain("cam-btn");
		expect(button).toBeDisabled();
	});

	it("Input renders with a recipe-derived class", () => {
		withSkin(<Input placeholder="name" />);
		expect(screen.getByPlaceholderText("name").className.length).toBeGreaterThan(0);
	});

	it("Textarea renders with a recipe-derived class", () => {
		withSkin(<Textarea placeholder="bio" />);
		expect(screen.getByPlaceholderText("bio").className.length).toBeGreaterThan(0);
	});

	it("Select renders with a recipe-derived class", () => {
		withSkin(
			<Select data-testid="select">
				<option value="a">A</option>
			</Select>
		);
		expect(screen.getByTestId("select").className.length).toBeGreaterThan(0);
	});

	it("Checkbox renders with a recipe-derived class and toggles", () => {
		withSkin(<Checkbox aria-label="agree" />);
		const checkbox = screen.getByRole("checkbox", { name: "agree" }) as HTMLInputElement;
		expect(checkbox.closest("label")?.className.length).toBeGreaterThan(0);
		expect(checkbox.checked).toBe(false);
		fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(true);
	});

	it("Radio renders with a recipe-derived class", () => {
		withSkin(<Radio aria-label="fruit" value="apple" />);
		const radio = screen.getByRole("radio", { name: "fruit" });
		expect(radio.closest("label")?.className.length).toBeGreaterThan(0);
	});

	it("Switch renders with a recipe-derived class and flips aria-checked on click", () => {
		withSkin(<Switch aria-label="notifications" />);
		const toggle = screen.getByRole("switch", { name: "notifications" });
		expect(toggle.className.length).toBeGreaterThan(0);
		expect(toggle).toHaveAttribute("aria-checked", "false");
		fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-checked", "true");
	});

	it("Slider renders with the cam-range hook class", () => {
		withSkin(<Slider aria-label="volume" />);
		expect(screen.getByRole("slider", { name: "volume" }).className).toContain("cam-range");
	});

	it("Badge renders with a recipe-derived class", () => {
		withSkin(<Badge>New</Badge>);
		expect(screen.getByText("New").className.length).toBeGreaterThan(0);
	});

	it("Tooltip renders with a recipe-derived class", () => {
		withSkin(<Tooltip content="Helpful hint" />);
		expect(screen.getByRole("tooltip").textContent).toBe("Helpful hint");
		expect(
			screen.getByRole("button", { name: "Helpful hint" }).className.length
		).toBeGreaterThan(0);
	});
});
