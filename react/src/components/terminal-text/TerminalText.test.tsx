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
		vi.restoreAllMocks();
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

	describe("glitch loop lifecycle", () => {
		it("keeps glitching after the lines change restarts the stream", async () => {
			vi.useFakeTimers();
			// Pinning Math.random makes the loop deterministic: a 2000ms interval,
			// the first line with content, its first character, the first glyph.
			vi.spyOn(Math, "random").mockReturnValue(0);
			const { container, rerender } = render(
				<TerminalText lines={["ab"]} speed={10} cursor={false} glitch />
			);
			const wrapper = container.firstElementChild as HTMLElement;

			// push@0, a@10, b@20, done@50.
			await advance(50);
			expect(text(wrapper)).toBe("ab");

			// t=2000: the first glitch swap lands.
			await advance(1960);
			expect(text(wrapper)).toBe("アb");

			// t=2100: the 100ms restore puts the original character back.
			await advance(200);
			expect(text(wrapper)).toBe("ab");

			// A new transcript restarts the stream; the glitch loop must survive it.
			rerender(<TerminalText lines={["cd"]} speed={10} cursor={false} glitch />);
			await advance(60);
			expect(text(wrapper)).toBe("cd");

			// t=4000: the loop's next tick still fires against the new transcript.
			await advance(1790);
			expect(text(wrapper)).toBe("アd");
		});

		it("runs exactly one chain after glitch is toggled off and back on", async () => {
			vi.useFakeTimers();
			vi.spyOn(Math, "random").mockReturnValue(0);
			const { container, rerender } = render(
				<TerminalText lines={["ab"]} speed={10} cursor={false} glitch />
			);
			const wrapper = container.firstElementChild as HTMLElement;

			// The stream has run to completion; the only pending timer is the
			// glitch loop's next tick, armed at mount and due at t=2000.
			await advance(50);
			expect(vi.getTimerCount()).toBe(1);

			// Turning glitch off tears the chain down instead of leaving it running.
			rerender(<TerminalText lines={["ab"]} speed={10} cursor={false} glitch={false} />);
			expect(vi.getTimerCount()).toBe(0);

			// t=150: turning it back on starts exactly one chain, due at t=2150.
			await advance(100);
			rerender(<TerminalText lines={["ab"]} speed={10} cursor={false} glitch />);
			expect(vi.getTimerCount()).toBe(1);

			// t=2000: the chain from before the toggle is gone, so nothing fires
			// here. A stacked second chain would swap a glyph in.
			await advance(1850);
			expect(text(wrapper)).toBe("ab");

			// t=2150: the one live chain fires, on its own phase.
			await advance(150);
			expect(text(wrapper)).toBe("アb");
		});
	});

	it("does not re-serialize `lines` on renders that reuse the same array reference", () => {
		// One render happens per streamed character, all reusing the SAME
		// `lines` array identity (only internal state changes between them).
		// JSON.stringify-ing the whole transcript on every one of those is
		// O(n^2) over a long stream; it should run once per distinct
		// reference, not once per render.
		const lines = ["Hello world"];
		const stringifySpy = vi.spyOn(JSON, "stringify");
		try {
			const { rerender } = render(<TerminalText lines={lines} speed={10} />);
			stringifySpy.mockClear();

			for (let i = 0; i < 20; i++) {
				rerender(<TerminalText lines={lines} speed={10} />);
			}

			const callsOnSameReference = stringifySpy.mock.calls.filter(
				([value]) => value === lines
			).length;
			expect(callsOnSameReference).toBe(0);
		} finally {
			stringifySpy.mockRestore();
		}
	});
});
