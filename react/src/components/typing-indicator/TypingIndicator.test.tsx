import { render, cleanup } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { TypingIndicator } from "./TypingIndicator.js";

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

describe("TypingIndicator", () => {
	afterEach(cleanup);

	it("renders exactly three dots, all hidden from assistive technology", () => {
		const { container } = render(<TypingIndicator />);
		const dots = container.querySelectorAll(".ft-dot");

		expect(dots).toHaveLength(3);
		for (const dot of dots) {
			expect(dot.getAttribute("aria-hidden")).toBe("true");
		}
	});

	it("exposes a polite live region carrying the visually hidden label", () => {
		const { container } = render(<TypingIndicator />);
		const el = root(container);

		expect(el.getAttribute("role")).toBe("status");
		expect(el.getAttribute("aria-live")).toBe("polite");

		const srOnly = el.querySelector(".sr-only");
		expect(srOnly?.textContent).toBe("Typing");
	});

	it("uses a custom label when one is given", () => {
		const { container } = render(<TypingIndicator label="Assistant is replying" />);
		expect(container.querySelector(".sr-only")?.textContent).toBe("Assistant is replying");
	});

	it("writes the size prop into the root inline style", () => {
		const { container } = render(<TypingIndicator />);
		expect(root(container).style.getPropertyValue("--ft-typing-size")).toBe("6px");

		cleanup();

		const large = render(<TypingIndicator size={14} />);
		expect(root(large.container).style.getPropertyValue("--ft-typing-size")).toBe("14px");
	});

	it("passes the color through untouched so a custom property can win", () => {
		const { container } = render(<TypingIndicator />);
		expect(root(container).style.getPropertyValue("--ft-typing-color-resolved")).toBe(
			"var(--ft-typing-color, currentColor)"
		);

		cleanup();

		const red = render(<TypingIndicator color="#ff0000" />);
		expect(root(red.container).style.getPropertyValue("--ft-typing-color-resolved")).toBe(
			"#ff0000"
		);
	});

	it("derives the cycle duration and per-dot stagger from the speed prop", () => {
		const { container } = render(<TypingIndicator speed={1.8} />);

		expect(root(container).style.getPropertyValue("--ft-typing-speed")).toBe("1.8s");

		const delays = [...container.querySelectorAll<HTMLElement>(".ft-dot")].map(
			(d) => d.style.animationDelay
		);
		expect(delays).toEqual(["0s", "0.3s", "0.6s"]);
	});

	it("keeps a positive animation duration when speed is zero or negative", () => {
		const { container } = render(<TypingIndicator speed={-1} />);
		expect(root(container).style.getPropertyValue("--ft-typing-speed")).toBe("0.01s");
	});

	it("merges the class prop with the base layout classes", () => {
		const { container } = render(<TypingIndicator className="text-blue-500" />);
		const cls = root(container).className;

		expect(cls).toContain("inline-flex");
		expect(cls).toContain("items-center");
		expect(cls).toContain("text-blue-500");
	});
});
