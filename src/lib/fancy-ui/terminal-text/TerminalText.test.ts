import { render, cleanup } from "@testing-library/svelte";
import { flushSync, mount, unmount as unmountInstance } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import TerminalText from "./TerminalText.svelte";
import TerminalTextHarness from "./TerminalTextHarness.test.svelte";

// The template has static whitespace between its {#each} and {#if} blocks
// that shows up as stray spaces in textContent depending on which branch is
// active. Stripping all whitespace isolates the actual streamed characters.
function text(el: Element): string {
	return (el.textContent ?? "").replace(/\s+/g, "");
}

// The first glyph of the component's GLITCH_GLYPHS set. With `Math.random`
// pinned to 0 the glitch loop is fully deterministic: a 2000ms interval, line
// index 0, character index 0, and this glyph as the swapped-in character.
const FIRST_GLYPH = "\u30a2";

/** Mounts the harness (own `$state` per prop) into a throwaway target. */
function mountHarness() {
	const target = document.createElement("div");
	document.body.appendChild(target);
	const instance = mount(TerminalTextHarness, { target });
	flushSync();
	return {
		instance,
		host: target.firstElementChild as HTMLElement,
		dispose() {
			unmountInstance(instance);
			target.remove();
		},
	};
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

	describe("glitch loop lifecycle", () => {
		it("keeps glitching after the lines change restarts the stream", async () => {
			vi.useFakeTimers();
			const random = vi.spyOn(Math, "random").mockReturnValue(0);
			const rig = mountHarness();
			try {
				// t=30: "abc" fully streamed (push@0, chars@5/10/15, done@30).
				await vi.advanceTimersByTimeAsync(30);
				expect(text(rig.host)).toBe("abc");

				// t=30: a new `lines` restarts the stream — and used to clear the
				// glitch chain's pending self-reschedule along with it.
				flushSync(() => rig.instance.setLines(["xyz"]));
				await vi.advanceTimersByTimeAsync(30);
				expect(text(rig.host)).toBe("xyz");

				// t=2000: the chain armed at mount still fires and swaps a glyph in.
				await vi.advanceTimersByTimeAsync(1940);
				expect(text(rig.host)).toBe(`${FIRST_GLYPH}yz`);
			} finally {
				rig.dispose();
				random.mockRestore();
			}
		});

		it("runs exactly one chain after glitch is toggled off and back on", async () => {
			vi.useFakeTimers();
			const random = vi.spyOn(Math, "random").mockReturnValue(0);
			const rig = mountHarness();
			try {
				// Chain armed at mount is due at t=2000.
				await vi.advanceTimersByTimeAsync(30);
				expect(text(rig.host)).toBe("abc");

				flushSync(() => rig.instance.setGlitch(false));
				await vi.advanceTimersByTimeAsync(100);
				// t=130: a fresh chain, due at t=2130.
				flushSync(() => rig.instance.setGlitch(true));

				// t=2000: the chain from before the toggle is gone, so nothing
				// fires here. A stacked second chain would swap a glyph in.
				await vi.advanceTimersByTimeAsync(1870);
				expect(text(rig.host)).toBe("abc");

				// t=2130: the one live chain fires, on its own phase.
				await vi.advanceTimersByTimeAsync(130);
				expect(text(rig.host)).toBe(`${FIRST_GLYPH}bc`);
			} finally {
				rig.dispose();
				random.mockRestore();
			}
		});
	});
});
