import { render, cleanup } from "@testing-library/vue";
import { mount } from "@vue/test-utils";
import { createSSRApp, defineComponent, h, reactive, ref } from "vue";
import { renderToString } from "vue/server-renderer";
import { afterEach, describe, it, expect, vi } from "vitest";
import TerminalText from "./TerminalText.vue";

// The template has static whitespace between the line rows and the trailing
// cursor row that shows up as stray spaces in textContent depending on which
// branch is active. Stripping all whitespace isolates the actual streamed
// characters.
function text(el: Element): string {
	return (el.textContent ?? "").replace(/\s+/g, "");
}

// The first glyph of the component's GLITCH_GLYPHS set. With `Math.random`
// pinned to 0 the glitch loop is fully deterministic: a 2000ms interval, line
// index 0, character index 0, and this glyph as the swapped-in character.
const FIRST_GLYPH = "ア";

/**
 * Harness: owns `lines` and `glitch` as its OWN independent refs, mutated
 * through exposed instance methods — deliberately not as incoming props
 * driven by `rerender()`. A rerender in the Vue testing adapter still gives
 * each declared prop its own reactive source, but this harness mirrors the
 * Svelte one for parity of intent: two independent signals, each free to
 * change without touching the other.
 *
 * `lines` being a ref also means this harness never re-allocates the array on
 * an unrelated re-render — the "stream keying" block below covers that path
 * with a parent of its own.
 */
const TerminalTextHarness = defineComponent({
	setup(_props, { expose }) {
		const lines = ref<string[]>(["abc"]);
		const glitch = ref(true);

		expose({
			setLines(next: string[]) {
				lines.value = next;
			},
			setGlitch(next: boolean) {
				glitch.value = next;
			},
		});

		return () =>
			h(TerminalText, {
				lines: lines.value,
				glitch: glitch.value,
				speed: 5,
				cursor: false,
			});
	},
});

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

		// The mount pass only schedules timeouts synchronously; none have fired yet.
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
		expect(lineDivs[0]!.textContent).toBe("a");
		expect(lineDivs[1]!.textContent).toBe("bb");
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
			const wrapper = mount(TerminalTextHarness, { attachTo: document.body });
			const host = wrapper.element as HTMLElement;
			try {
				// t=30: "abc" fully streamed (push@0, chars@5/10/15, done@30).
				await vi.advanceTimersByTimeAsync(30);
				expect(text(host)).toBe("abc");

				// t=30: a new `lines` restarts the stream — and used to clear the
				// glitch chain's pending self-reschedule along with it.
				(wrapper.vm as unknown as { setLines: (v: string[]) => void }).setLines(["xyz"]);
				await wrapper.vm.$nextTick();
				await vi.advanceTimersByTimeAsync(30);
				expect(text(host)).toBe("xyz");

				// t=2000: the chain armed at mount still fires and swaps a glyph in.
				await vi.advanceTimersByTimeAsync(1940);
				expect(text(host)).toBe(`${FIRST_GLYPH}yz`);
			} finally {
				wrapper.unmount();
				random.mockRestore();
			}
		});

		it("runs exactly one chain after glitch is toggled off and back on", async () => {
			vi.useFakeTimers();
			const random = vi.spyOn(Math, "random").mockReturnValue(0);
			const wrapper = mount(TerminalTextHarness, { attachTo: document.body });
			const host = wrapper.element as HTMLElement;
			const vm = wrapper.vm as unknown as { setGlitch: (v: boolean) => void };
			try {
				// Chain armed at mount is due at t=2000.
				await vi.advanceTimersByTimeAsync(30);
				expect(text(host)).toBe("abc");

				vm.setGlitch(false);
				await wrapper.vm.$nextTick();
				await vi.advanceTimersByTimeAsync(100);
				// t=130: a fresh chain, due at t=2130.
				vm.setGlitch(true);
				await wrapper.vm.$nextTick();

				// t=2000: the chain from before the toggle is gone, so nothing
				// fires here. A stacked second chain would swap a glyph in.
				await vi.advanceTimersByTimeAsync(1870);
				expect(text(host)).toBe("abc");

				// t=2130: the one live chain fires, on its own phase.
				await vi.advanceTimersByTimeAsync(130);
				expect(text(host)).toBe(`${FIRST_GLYPH}bc`);
			} finally {
				wrapper.unmount();
				random.mockRestore();
			}
		});
	});

	/**
	 * The stream is keyed on the CONTENT of `lines`, not on the array itself.
	 * A parent that passes an inline literal re-allocates the array on every
	 * one of its own re-renders; keying on identity would wipe the typed-out
	 * text and restart the animation each time, where the Svelte source — whose
	 * effect tracks real values, and an inline array literal in a template is
	 * not one — keeps streaming.
	 */
	describe("stream keying", () => {
		it("keeps a running stream alive when an unrelated parent change re-allocates the lines literal", async () => {
			vi.useFakeTimers();
			const glitch = ref(false);
			const Parent = defineComponent({
				setup: () => () =>
					h(TerminalText, {
						lines: ["abcdef"],
						speed: 10,
						cursor: false,
						glitch: glitch.value,
					}),
			});
			const wrapper = mount(Parent, { attachTo: document.body });
			const host = wrapper.element as HTMLElement;
			try {
				// t=30: three of six characters typed.
				await vi.advanceTimersByTimeAsync(31);
				expect(text(host)).toBe("abc");

				// The parent re-renders for its own reason. `:lines` is a fresh
				// array every pass; the stream must not notice.
				glitch.value = true;
				await wrapper.vm.$nextTick();
				await vi.advanceTimersByTimeAsync(0);
				expect(text(host)).toBe("abc");

				// The pending schedule survived and finishes the line.
				await vi.advanceTimersByTimeAsync(30);
				expect(text(host)).toBe("abcdef");
			} finally {
				wrapper.unmount();
			}
		});

		it("restarts the stream when the lines content changes", async () => {
			vi.useFakeTimers();
			const lines = ref<string[]>(["abc"]);
			const Parent = defineComponent({
				setup: () => () => h(TerminalText, { lines: lines.value, speed: 10, cursor: false }),
			});
			const wrapper = mount(Parent, { attachTo: document.body });
			const host = wrapper.element as HTMLElement;
			try {
				await vi.advanceTimersByTimeAsync(31);
				expect(text(host)).toBe("abc");

				lines.value = ["xy"];
				await wrapper.vm.$nextTick();
				await vi.advanceTimersByTimeAsync(0);
				expect(text(host)).toBe("");

				await vi.advanceTimersByTimeAsync(21);
				expect(text(host)).toBe("xy");
			} finally {
				wrapper.unmount();
			}
		});

		it("restarts the stream when the lines array is mutated in place", async () => {
			// Serialising the array reads its elements, so a reactive array's
			// in-place mutation is tracked — the source's `streamLines()` reads
			// the same indices inside its own effect and restarts too.
			vi.useFakeTimers();
			const lines = reactive<string[]>(["abc"]);
			const Parent = defineComponent({
				setup: () => () => h(TerminalText, { lines, speed: 10, cursor: false }),
			});
			const wrapper = mount(Parent, { attachTo: document.body });
			const host = wrapper.element as HTMLElement;
			try {
				await vi.advanceTimersByTimeAsync(31);
				expect(text(host)).toBe("abc");

				lines.push("d");
				await wrapper.vm.$nextTick();
				await vi.advanceTimersByTimeAsync(0);
				expect(text(host)).toBe("");
			} finally {
				wrapper.unmount();
			}
		});

		it("does not restart the stream when an unrelated prop changes", async () => {
			vi.useFakeTimers();
			const cursorChar = ref("_");
			const lines = ["abcdef"];
			const Parent = defineComponent({
				setup: () => () => h(TerminalText, { lines, speed: 10, cursorChar: cursorChar.value }),
			});
			const wrapper = mount(Parent, { attachTo: document.body });
			const host = wrapper.element as HTMLElement;
			try {
				await vi.advanceTimersByTimeAsync(31);
				expect(text(host)).toBe("abc_");

				cursorChar.value = "#";
				await wrapper.vm.$nextTick();
				await vi.advanceTimersByTimeAsync(0);
				expect(text(host)).toBe("abc#");
			} finally {
				wrapper.unmount();
			}
		});
	});

	// The node-environment file pins what the SERVER render emits; this pins
	// that the client accepts it. The markup is the empty shell either way —
	// the whole engine lives in `onMounted` — so hydration has nothing to
	// disagree about.
	it("hydrates a server render without a mismatch warning", async () => {
		vi.useFakeTimers();
		const props = { lines: ["hi"], speed: 10, cursor: false };
		const html = await renderToString(createSSRApp(TerminalText, { ...props }));

		const host = document.createElement("div");
		host.innerHTML = html;
		document.body.appendChild(host);

		const messages: string[] = [];
		const record = (...args: unknown[]) => {
			messages.push(args.map(String).join(" "));
		};
		const warnSpy = vi.spyOn(console, "warn").mockImplementation(record);
		const errorSpy = vi.spyOn(console, "error").mockImplementation(record);

		const app = createSSRApp(TerminalText, { ...props });
		app.config.warnHandler = (msg) => {
			messages.push(msg);
		};
		try {
			app.mount(host);
			expect(messages.filter((message) => /hydrat|mismatch/i.test(message))).toEqual([]);

			// The engine still runs on the hydrated instance.
			await vi.advanceTimersByTimeAsync(21);
			expect(text(host)).toBe("hi");
		} finally {
			app.unmount();
			host.remove();
			warnSpy.mockRestore();
			errorSpy.mockRestore();
		}
	});
});
