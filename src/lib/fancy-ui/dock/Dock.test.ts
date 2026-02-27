import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import Dock from "./Dock.svelte";

describe("Dock", () => {
	afterEach(cleanup);

	it("renders a toolbar element", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]');
		expect(toolbar).toBeInTheDocument();
	});

	it("has backdrop-blur-md class", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("backdrop-blur-md");
	});

	it("has rounded-2xl class", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("rounded-2xl");
	});

	it("applies custom class names", () => {
		const { container } = render(Dock, { props: { class: "my-dock" } });
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("my-dock");
	});

	it("uses vertical layout when orientation is vertical", () => {
		const { container } = render(Dock, { props: { orientation: "vertical" } });
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("flex-col");
	});

	it("applies items-end class for bottom direction", () => {
		const { container } = render(Dock, { props: { direction: "bottom" } });
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("items-end");
	});

	it("applies items-start class for top direction", () => {
		const { container } = render(Dock, { props: { direction: "top" } });
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("items-start");
	});

	it("applies items-center class for middle direction (default)", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("items-center");
	});

	it("has flex class for layout", () => {
		const { container } = render(Dock);
		const toolbar = container.querySelector('[role="toolbar"]') as HTMLElement;
		expect(toolbar?.className).toContain("flex");
	});
});
