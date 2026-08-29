import { describe, it, expect, vi } from "vitest";
import { render } from "@testing-library/react";
import { TextGenerateEffect } from "./TextGenerateEffect.js";

describe("TextGenerateEffect", () => {
	it("renders all words as spans", () => {
		const { container } = render(<TextGenerateEffect words="hello world test" />);
		const spans = container.querySelectorAll("span");
		expect(spans.length).toBe(3);
	});

	it("words start hidden with blur", () => {
		const { container } = render(<TextGenerateEffect words="fade in" />);
		const spans = container.querySelectorAll("span");
		expect(spans[0]!.style.opacity).toBe("0");
		expect(spans[0]!.style.filter).toContain("blur(10px)");
	});

	it("words start hidden without blur when filter is false", () => {
		const { container } = render(<TextGenerateEffect words="no blur" filter={false} />);
		const spans = container.querySelectorAll("span");
		expect(spans[0]!.style.opacity).toBe("0");
		expect(spans[0]!.style.filter).toBe("none");
	});

	it("reveals words after stagger delay", async () => {
		vi.useFakeTimers();
		const { container } = render(<TextGenerateEffect words="one two three" stagger={100} />);
		const spans = container.querySelectorAll("span");

		// Flush the outer setTimeout(fn, 0) + first word setTimeout(fn, 0)
		await vi.advanceTimersByTimeAsync(1);
		expect(spans[0]!.style.opacity).toBe("1");
		expect(spans[1]!.style.opacity).toBe("0");

		// After 100ms — second word
		await vi.advanceTimersByTimeAsync(100);
		expect(spans[1]!.style.opacity).toBe("1");
		expect(spans[2]!.style.opacity).toBe("0");

		// After 200ms — third word
		await vi.advanceTimersByTimeAsync(100);
		expect(spans[2]!.style.opacity).toBe("1");

		vi.useRealTimers();
	});

	it("respects initial delay", async () => {
		vi.useFakeTimers();
		const { container } = render(<TextGenerateEffect words="delayed text" delay={500} />);
		const spans = container.querySelectorAll("span");

		await vi.advanceTimersByTimeAsync(499);
		expect(spans[0]!.style.opacity).toBe("0");

		await vi.advanceTimersByTimeAsync(2);
		expect(spans[0]!.style.opacity).toBe("1");

		vi.useRealTimers();
	});

	it("applies custom class", () => {
		const { container } = render(<TextGenerateEffect words="styled" className="my-class" />);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("my-class");
	});

	it("sets custom duration in transition style", () => {
		const { container } = render(<TextGenerateEffect words="fast" duration={0.3} />);
		const span = container.querySelector("span") as HTMLElement;
		expect(span.style.transition).toContain("0.3s");
	});
});
