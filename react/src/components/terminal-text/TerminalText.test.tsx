import { render, cleanup, act } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { TerminalText } from "./TerminalText.js";

// The markup carries incidental whitespace between the line spans and the
// cursor span depending on which branch is active. Stripping all whitespace
// isolates the actual streamed characters.
function text(el: Element): string {
	return (el.textContent ?? "").replace(/\s+/g, "");
}

async function advance(ms: number) {
	await act(async () => {
		await vi.advanceTimersByTimeAsync(ms);
	});
}

describe("TerminalText", () => {
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
	});

	it("renders nothing until the first scheduled tick, then streams characters over time and completes", async () => {
		vi.useFakeTimers();
		const onComplete = vi.fn();
		const { container } = render(<TerminalText lines={["hi"]} speed={10} onComplete={onComplete} />);
		const wrapper = container.firstElementChild as HTMLElement;

		// The effect only schedules timeouts synchronously; none have fired yet.
		expect(text(wrapper)).toBe("");

		// t=0: empty line placeholder + blinking cursor appear.
		await advance(1);
		expect(text(wrapper)).toBe("█");
		expect(onComplete).not.toHaveBeenCalled();

		// t=10: first character streamed in.
		await advance(9);
		expect(text(wrapper)).toBe("h█");

		// t=20: second character streamed in.
		await advance(10);
		expect(text(wrapper)).toBe("hi█");
		expect(onComplete).not.toHaveBeenCalled();

		// t=50: stream marked done, onComplete fires exactly once.
		await advance(30);
		expect(text(wrapper)).toBe("hi█");
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it("renders no cursor glyph anywhere when cursor is false", async () => {
		vi.useFakeTimers();
		const { container } = render(<TerminalText lines={["ok"]} speed={5} cursor={false} />);
		await advance(25);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(text(wrapper)).toBe("ok");
		expect(container.querySelector(".cursor-blink")).toBeFalsy();
	});

	it("streams multiple lines in order, one div per line", async () => {
		vi.useFakeTimers();
		const { container } = render(<TerminalText lines={["a", "bb"]} speed={10} cursor={false} />);
		await advance(90);
		const wrapper = container.firstElementChild as HTMLElement;
		const lineDivs = Array.from(wrapper.children) as HTMLElement[];
		expect(lineDivs).toHaveLength(2);
		expect(lineDivs[0]!.textContent).toBe("a");
		expect(lineDivs[1]!.textContent).toBe("bb");
	});

	it("applies custom class names alongside the base classes", () => {
		const { container } = render(<TerminalText lines={["x"]} className="my-terminal" />);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(wrapper.className).toContain("my-terminal");
		expect(wrapper.className).toContain("font-mono");
	});

	it("uses a custom cursor character once the stream is done", async () => {
		vi.useFakeTimers();
		const { container } = render(<TerminalText lines={["a"]} speed={5} cursorChar="_" />);
		// push@0, char@5, done@20 (5 + speed*3=15)
		await advance(20);
		const wrapper = container.firstElementChild as HTMLElement;
		expect(text(wrapper)).toBe("a_");
	});

	it("keeps streaming when the parent re-renders with an equal but freshly allocated lines array", async () => {
		vi.useFakeTimers();
		const onComplete = vi.fn();
		// A call site writing lines={["ab", "cd"]} inline hands a NEW array on
		// every parent render. That must not wipe the typed-out text.
		const { container, rerender } = render(
			<TerminalText lines={["ab", "cd"]} speed={10} cursor={false} onComplete={onComplete} />
		);
		const wrapper = container.firstElementChild as HTMLElement;

		await advance(20);
		expect(text(wrapper)).toBe("ab");

		rerender(
			<TerminalText lines={["ab", "cd"]} speed={10} cursor={false} onComplete={onComplete} />
		);
		expect(text(wrapper)).toBe("ab");

		// The original schedule survives: line 2 lands on the original timeline
		// (push@50, chars@60/@70, done@100) rather than starting over.
		await advance(50);
		expect(text(wrapper)).toBe("abcd");
		await advance(30);
		expect(onComplete).toHaveBeenCalledTimes(1);
	});

	it("restarts the stream when the lines content actually changes", async () => {
		vi.useFakeTimers();
		const { container, rerender } = render(
			<TerminalText lines={["ab"]} speed={10} cursor={false} />
		);
		const wrapper = container.firstElementChild as HTMLElement;

		await advance(20);
		expect(text(wrapper)).toBe("ab");

		rerender(<TerminalText lines={["zz"]} speed={10} cursor={false} />);
		expect(text(wrapper)).toBe("");

		await advance(20);
		expect(text(wrapper)).toBe("zz");
	});

	it("does not throw or leave dangling timers when glitch is enabled", async () => {
		vi.useFakeTimers();
		const { unmount } = render(<TerminalText lines={["glitchy line"]} speed={5} glitch={true} />);
		await advance(5000);
		expect(() => unmount()).not.toThrow();
	});
});
