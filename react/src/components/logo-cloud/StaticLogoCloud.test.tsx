import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { StaticLogoCloud } from "./index.js";
import type { Wordmark } from "./index.js";

const mockLogos = [
	{ name: "Svelte", path: "/svelte.svg" },
	{ name: "React", path: "/react.svg" },
];

const mockWordmarks: Wordmark[] = [
	{ name: "Acme Corp", size: 22, weight: 700 },
	{ name: "Nimbus Labs", size: 20, weight: 400, italic: true, tracking: 1 },
	{ name: "FOUNDRY", size: 18, weight: 900, transform: "uppercase", serif: true },
];

describe("StaticLogoCloud", () => {
	afterEach(cleanup);

	it("renders logo images when logos is provided without wordmarks", () => {
		const { container } = render(<StaticLogoCloud logos={mockLogos} />);
		const imgs = container.querySelectorAll("img");
		expect(imgs.length).toBe(2);
	});

	it("renders wordmark spans instead of images when wordmarks is provided", () => {
		const { container } = render(<StaticLogoCloud logos={mockLogos} wordmarks={mockWordmarks} />);
		expect(container.querySelectorAll("img").length).toBe(0);
		const spans = container.querySelectorAll("span");
		expect(spans.length).toBe(3);
		expect(spans[0]?.textContent?.trim()).toBe("Acme Corp");
	});

	it("applies inline font styles from wordmark data", () => {
		const { container } = render(<StaticLogoCloud wordmarks={mockWordmarks} />);
		const span = container.querySelector("span") as HTMLElement;
		expect(span.style.fontSize).toBe("22px");
		expect(span.style.fontWeight).toBe("700");
		expect(span.style.opacity).toBe("0.85");
	});

	it("applies italic and tracking to the relevant mark", () => {
		const { container } = render(<StaticLogoCloud wordmarks={mockWordmarks} />);
		const spans = container.querySelectorAll("span");
		const nimbus = spans[1] as HTMLElement;
		expect(nimbus.style.fontStyle).toBe("italic");
		expect(nimbus.style.letterSpacing).toBe("1px");
	});

	it("applies serif font stack and uppercase transform to the relevant mark", () => {
		const { container } = render(<StaticLogoCloud wordmarks={mockWordmarks} />);
		const spans = container.querySelectorAll("span");
		const foundry = spans[2] as HTMLElement;
		expect(foundry.style.fontFamily).toContain("Georgia");
		expect(foundry.style.textTransform).toBe("uppercase");
	});

	it("applies custom class names to the wordmark row", () => {
		const { container } = render(
			<StaticLogoCloud wordmarks={mockWordmarks} className="custom-wordmarks" />
		);
		const row = container.querySelector(".custom-wordmarks");
		expect(row).toBeTruthy();
	});
});
