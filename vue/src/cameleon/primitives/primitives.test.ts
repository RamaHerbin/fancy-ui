import { fireEvent, render, screen } from "@testing-library/vue";
import { h, type VNodeChild } from "vue";
import FancyProvider from "../FancyProvider.vue";
import { defaultSkin } from "../skins/default.js";
import { brutalSkin } from "../skins/brutal/index.js";
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
} from "./index.js";

function withSkin(children: () => VNodeChild) {
	return render(FancyProvider, {
		props: { skin: defaultSkin },
		slots: { default: children },
	});
}

describe("cameleon primitives", () => {
	it("Button renders with a recipe-derived class and honors disabled", () => {
		withSkin(() => h(Button, { disabled: true }, () => "Go"));
		const button = screen.getByRole("button", { name: "Go" });
		expect(button.className).toContain("cam-btn");
		expect(button).toBeDisabled();
	});

	// The sibling ornaments suite covers the glyphs on their own; what belongs
	// here is that Button mounts the active skin's `buttonTrailing` into its
	// fixed slot, and renders nothing for a skin that ships none.
	it("Button mounts the active skin's trailing ornament", () => {
		render(FancyProvider, {
			props: { skin: brutalSkin },
			slots: { default: () => h(Button, null, () => "Go") },
		});
		expect(screen.getByRole("button", { name: "Go" }).querySelector("svg")).toBeInTheDocument();
	});

	it("Button renders no ornament for a skin that defines none", () => {
		withSkin(() => h(Button, null, () => "Go"));
		expect(screen.getByRole("button", { name: "Go" }).querySelector("svg")).toBeNull();
	});

	it("Input renders with a recipe-derived class", () => {
		withSkin(() => h(Input, { placeholder: "name" }));
		expect(screen.getByPlaceholderText("name").className.length).toBeGreaterThan(0);
	});

	it("Textarea renders with a recipe-derived class", () => {
		withSkin(() => h(Textarea, { placeholder: "bio" }));
		expect(screen.getByPlaceholderText("bio").className.length).toBeGreaterThan(0);
	});

	it("Select renders with a recipe-derived class", () => {
		withSkin(() =>
			h(Select, { "data-testid": "select" }, () => h("option", { value: "a" }, "A"))
		);
		expect(screen.getByTestId("select").className.length).toBeGreaterThan(0);
	});

	it("Checkbox renders with a recipe-derived class and toggles", async () => {
		withSkin(() => h(Checkbox, { "aria-label": "agree" }));
		const checkbox = screen.getByRole("checkbox", { name: "agree" }) as HTMLInputElement;
		expect(checkbox.closest("label")?.className.length).toBeGreaterThan(0);
		expect(checkbox.checked).toBe(false);
		await fireEvent.click(checkbox);
		expect(checkbox.checked).toBe(true);
	});

	it("Radio renders with a recipe-derived class", () => {
		withSkin(() => h(Radio, { "aria-label": "fruit", value: "apple" }));
		const radio = screen.getByRole("radio", { name: "fruit" });
		expect(radio.closest("label")?.className.length).toBeGreaterThan(0);
	});

	it("Switch renders with a recipe-derived class and flips aria-checked on click", async () => {
		withSkin(() => h(Switch, { "aria-label": "notifications" }));
		const toggle = screen.getByRole("switch", { name: "notifications" });
		expect(toggle.className.length).toBeGreaterThan(0);
		expect(toggle).toHaveAttribute("aria-checked", "false");
		await fireEvent.click(toggle);
		expect(toggle).toHaveAttribute("aria-checked", "true");
	});

	it("Slider renders with the cam-range hook class", () => {
		withSkin(() => h(Slider, { "aria-label": "volume" }));
		expect(screen.getByRole("slider", { name: "volume" }).className).toContain("cam-range");
	});

	it("Badge renders with a recipe-derived class", () => {
		withSkin(() => h(Badge, null, () => "New"));
		expect(screen.getByText("New").className.length).toBeGreaterThan(0);
	});

	it("Tooltip renders with a recipe-derived class", () => {
		withSkin(() => h(Tooltip, { content: "Helpful hint" }));
		expect(screen.getByRole("tooltip").textContent).toBe("Helpful hint");
		expect(
			screen.getByRole("button", { name: "Helpful hint" }).className.length
		).toBeGreaterThan(0);
	});
});
