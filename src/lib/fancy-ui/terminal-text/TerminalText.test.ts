import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import TerminalText from "./TerminalText.svelte";

// The template has static whitespace between its {#each} and {#if} blocks
// that shows up as stray spaces in textContent depending on which branch is
// active. Stripping all whitespace isolates the actual streamed characters.
function text(el: Element): string {
	return (el.textContent ?? "").replace(/\s+/g, "");
}

describe("TerminalText", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders nothing until the first scheduled tick, then streams characters over time and completes", async () => {
		vi.useFakeTimers();
		const onComplete = vi.fn();
		const { container } = render(TerminalText, {
			props: { lines: ["hi"], speed: 10, onComplete },
		});
		const wrapper = container.firstElementChild as HTMLElement;

		// The effect only schedules timeouts synchronously; none have fired yet.
		expect(text(wrapper)).toBe("");

		// t=0: empty line placeholder + blinking cursor appear.
		await vi.advanceTimersByTimeAsync(1);
		expect(text(wrapper)).toBe("█");
		expect(onComplete).not.toHaveBeenCalled();

		// t=10: first character streamed in.
		await vi.advanceTimersByTimeAsync(9);
		expect(text(wrapper)).toBe("h█");

		// t=20: second character streamed in.
		await vi.advanceTimersByTimeAsync(10);
		expect(text(wrapper)).toBe("hi█");
		expect(onComplete).not.toHaveBeenCalled();

		// t=50: stream marked done, onComplete fires exactly once.
		await vi.advanceTimersByTimeAsync(30);
		expect(text(wrapper)).toBe("hi█");
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it("renders no cursor glyph anywhere when cursor is false", async () => {
		vi.useFakeTimers();
		const { container } = render(TerminalText, {
			props: { lines: ["ok"], speed: 5, cursor: false },
		});
		await vi.advanceTimersByTimeAsync(25);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(text(wrapper)).toBe("ok");
		expect(container.querySelector(".cursor-blink")).toBeFalsy();
	});

	it("streams multiple lines in order, one div per line", async () => {
		vi.useFakeTimers();
		const { container } = render(TerminalText, {
			props: { lines: ["a", "bb"], speed: 10, cursor: false },
		});
		await vi.advanceTimersByTimeAsync(90);
		const wrapper = container.firstElementChild as HTMLElement;
		const lineDivs = Array.from(wrapper.children) as HTMLElement[];
		expect(lineDivs).toHaveLength(2);
		expect(lineDivs[0].textContent).toBe("a");
		expect(lineDivs[1].textContent).toBe("bb");
	});

	it("applies custom class names alongside the base classes", () => {
		const { container } = render(TerminalText, {
			props: { lines: ["x"], class: "my-terminal" },
		});
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("my-terminal");
		expect(wrapper.className).toContain("font-mono");
	});

	it("uses a custom cursor character once the stream is done", async () => {
		vi.useFakeTimers();
		const { container } = render(TerminalText, {
			props: { lines: ["a"], speed: 5, cursorChar: "_" },
		});
		// push@0, char@5, done@20 (5 + speed*3=15)
		await vi.advanceTimersByTimeAsync(20);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(text(wrapper)).toBe("a_");
	});

	it("does not throw or leave dangling timers when glitch is enabled", async () => {
		vi.useFakeTimers();
		const { unmount } = render(TerminalText, {
			props: { lines: ["glitchy line"], speed: 5, glitch: true },
		});
		await vi.advanceTimersByTimeAsync(5000);
		expect(() => unmount()).not.toThrow();
	});
});
