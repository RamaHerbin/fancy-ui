import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { Book } from "./Book.js";

describe("Book", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(<Book />);
		const wrapper = container.querySelector(".group");
		expect(wrapper).toBeInTheDocument();
	});

	it("has perspective class", () => {
		const { container } = render(<Book />);
		const wrapper = container.querySelector(".group");
		expect(wrapper?.className).toContain("[perspective:800px]");
	});

	it("applies default size (md = 220px)", () => {
		const { container } = render(<Book />);
		const inner = container.querySelector(".group > div") as HTMLElement;
		expect(inner?.style.width).toBe("220px");
	});

	it("applies custom size", () => {
		const { container } = render(<Book size="lg" />);
		const inner = container.querySelector(".group > div") as HTMLElement;
		expect(inner?.style.width).toBe("260px");
	});

	it("applies static transform when isStatic", () => {
		const { container } = render(<Book isStatic />);
		const inner = container.querySelector(".group > div");
		expect(inner?.className).toContain("[transform:rotateY(-30deg)]");
		expect(inner?.className).not.toContain("group-hover");
	});

	it("applies hover transform by default", () => {
		const { container } = render(<Book />);
		const inner = container.querySelector(".group > div");
		expect(inner?.className).toContain("group-hover:[transform:rotateY(-30deg)]");
	});

	it("applies custom class", () => {
		const { container } = render(<Book className="my-book" />);
		const wrapper = container.querySelector(".group");
		expect(wrapper?.className).toContain("my-book");
	});

	it("renders spine element", () => {
		const { container } = render(<Book />);
		const spine = container.querySelector('[style*="rotateY(90deg)"]');
		expect(spine).toBeInTheDocument();
	});
});
