import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import VoiceInput from "./VoiceInput.svelte";
import Harness from "./VoiceInputHarness.test.svelte";
import { sound } from "../sound/sound.svelte.js";

function root(container: HTMLElement): HTMLElement {
	return container.firstElementChild as HTMLElement;
}

function mic(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector('button[aria-label="Start voice input"]');
}

function cancelButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[aria-label="Cancel voice input"]') as HTMLButtonElement;
}

function confirmButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector('button[aria-label="Stop voice input"]') as HTMLButtonElement;
}

function canvas(container: HTMLElement): HTMLCanvasElement | null {
	return container.querySelector("canvas");
}

function statusLine(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-voice-status") as HTMLElement;
}

function transcriptLine(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-voice-transcript");
}

/**
 * Minimal recording stand-in for a 2D context. The global test setup makes
 * `getContext` return null, which is the null-ctx case one test below asserts —
 * every test that needs the loop to actually start installs this instead.
 */
function stubContext() {
	const ctx = {
		clearRect: vi.fn(),
		fillRect: vi.fn(),
		setTransform: vi.fn(),
		fillStyle: "",
	};
	const spy = vi
		.spyOn(HTMLCanvasElement.prototype, "getContext")
		// `getContext` is overloaded; the spy resolves against the last signature,
		// and `never` sidesteps naming a context type just to hand back a 2D stub.
		.mockReturnValue(ctx as never);
	return { ctx, spy };
}

/**
 * jsdom lays nothing out, so every element measures zero and the renderer draws
 * no bars. Give the canvas a width for the tests that care what was painted.
 */
function withCanvasWidth(width: number): () => void {
	Object.defineProperty(HTMLCanvasElement.prototype, "clientWidth", {
		configurable: true,
		get: () => width,
	});
	return () => {
		// Deleting the own property hands `clientWidth` back to Element.prototype.
		Reflect.deleteProperty(HTMLCanvasElement.prototype, "clientWidth");
	};
}

/** Swap `prefers-reduced-motion: reduce` on for one test, then hand back the undo. */
function withReducedMotion(): () => void {
	const real = window.matchMedia;
	window.matchMedia = ((query: string) => ({
		matches: query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	})) as unknown as typeof window.matchMedia;
	return () => {
		window.matchMedia = real;
	};
}

describe("VoiceInput", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("names itself as a group so the mic and the panel read as one control", () => {
		const { container } = render(VoiceInput);

		expect(root(container).getAttribute("role")).toBe("group");
		expect(root(container).getAttribute("aria-label")).toBe("Voice input");
	});

	it("shows nothing but the mic button while idle", () => {
		const { container } = render(VoiceInput);

		expect(mic(container)).not.toBeNull();
		expect(canvas(container)).toBeNull();
		expect(container.querySelector(".ft-voice-panel")).toBeNull();
		expect(root(container).dataset.active).toBe("false");
	});

	it("opens the panel and reports the start when the mic is pressed", async () => {
		const onStart = vi.fn();
		const { container } = render(VoiceInput, { props: { onStart } });

		await fireEvent.click(mic(container) as HTMLButtonElement);

		expect(onStart).toHaveBeenCalledTimes(1);
		expect(mic(container)).toBeNull();
		expect(container.querySelector(".ft-voice-panel")).not.toBeNull();
		expect(canvas(container)).not.toBeNull();
		expect(root(container).dataset.active).toBe("true");
	});

	it("writes the recording state back out through the bindable prop", async () => {
		const { container, getByTestId } = render(Harness);
		expect(getByTestId("bound-active").textContent).toBe("idle");

		await fireEvent.click(mic(container) as HTMLButtonElement);
		expect(getByTestId("bound-active").textContent).toBe("recording");

		await fireEvent.click(cancelButton(container));
		expect(getByTestId("bound-active").textContent).toBe("idle");
	});

	it("writes the confirm back out through the binding too", async () => {
		const { container, getByTestId } = render(Harness, { props: { active: true } });

		await fireEvent.click(confirmButton(container));

		expect(getByTestId("bound-active").textContent).toBe("idle");
	});

	it("follows an active prop driven from outside", async () => {
		const { container, rerender } = render(VoiceInput, { props: { active: false } });
		expect(mic(container)).not.toBeNull();

		await rerender({ active: true });
		expect(mic(container)).toBeNull();
		expect(container.querySelector(".ft-voice-panel")).not.toBeNull();
	});

	it("closes the panel and reports the cancel", async () => {
		const onCancel = vi.fn();
		const onStop = vi.fn();
		const { container } = render(VoiceInput, { props: { active: true, onCancel, onStop } });

		await fireEvent.click(cancelButton(container));

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onStop).not.toHaveBeenCalled();
		expect(mic(container)).not.toBeNull();
	});

	it("closes the panel and reports the confirm", async () => {
		const onCancel = vi.fn();
		const onStop = vi.fn();
		const { container } = render(VoiceInput, { props: { active: true, onCancel, onStop } });

		await fireEvent.click(confirmButton(container));

		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
		expect(mic(container)).not.toBeNull();
	});

	describe("focus", () => {
		it("hands focus to Cancel when the mic opens the panel", async () => {
			const { container } = render(VoiceInput);
			const button = mic(container) as HTMLButtonElement;
			button.focus();

			await fireEvent.click(button);
			await tick();

			expect(document.activeElement).toBe(cancelButton(container));
		});

		it("hands focus back to the mic when cancel closes the panel", async () => {
			const { container } = render(VoiceInput, { props: { active: true } });
			cancelButton(container).focus();

			await fireEvent.click(cancelButton(container));
			await tick();

			expect(document.activeElement).toBe(mic(container));
		});

		it("hands focus back to the mic when confirm closes the panel", async () => {
			const { container } = render(VoiceInput, { props: { active: true } });
			confirmButton(container).focus();

			await fireEvent.click(confirmButton(container));
			await tick();

			expect(document.activeElement).toBe(mic(container));
		});

		it("leaves focus alone when active is driven from outside", async () => {
			const { rerender } = render(VoiceInput, { props: { active: false } });
			const outside = document.createElement("button");
			document.body.appendChild(outside);
			outside.focus();

			try {
				await rerender({ active: true });
				await tick();

				expect(document.activeElement).toBe(outside);
			} finally {
				outside.remove();
			}
		});
	});

	it("opens on an externally driven active without claiming the user started it", () => {
		const onStart = vi.fn();
		const { container } = render(VoiceInput, { props: { active: true, onStart } });

		expect(container.querySelector(".ft-voice-panel")).not.toBeNull();
		expect(onStart).not.toHaveBeenCalled();
	});

	it("announces the recording through a live region that survives the state change", async () => {
		const { container } = render(VoiceInput);

		expect(statusLine(container).getAttribute("role")).toBe("status");
		expect(statusLine(container).textContent).toBe("");

		await fireEvent.click(mic(container) as HTMLButtonElement);
		expect(statusLine(container).textContent).toBe("Recording");

		await fireEvent.click(confirmButton(container));
		expect(statusLine(container).textContent).toBe("");
	});

	it("renders the transcript under the waveform and lets it grow in place", async () => {
		const { container, rerender } = render(VoiceInput, {
			props: { active: true, transcript: "show me" },
		});

		expect(transcriptLine(container)?.textContent?.trim()).toBe("show me");

		await rerender({ active: true, transcript: "show me the retry policy" });
		expect(transcriptLine(container)?.textContent?.trim()).toBe("show me the retry policy");
	});

	it("leaves the transcript line out entirely until there is something to say", () => {
		const { container } = render(VoiceInput, { props: { active: true } });

		expect(transcriptLine(container)).toBeNull();
	});

	it("hides the waveform from assistive tech and times the recording out loud", () => {
		const { container } = render(VoiceInput, { props: { active: true } });

		expect(canvas(container)?.getAttribute("aria-hidden")).toBe("true");
		const time = container.querySelector("time") as HTMLTimeElement;
		expect(time.textContent).toBe("0s");
		expect(time.getAttribute("datetime")).toBe("PT0S");
	});

	it("renders the panel unharmed when the canvas hands back no context", () => {
		// The global setup already makes `getContext` return null.
		expect(canvas(document.body)).toBeNull();
		const { container } = render(VoiceInput, { props: { active: true, demo: true } });

		expect(container.querySelector(".ft-voice-panel")).not.toBeNull();
		expect(canvas(container)).not.toBeNull();
	});

	it("runs the loop from demo samples when no pipeline is feeding it", async () => {
		const { ctx } = stubContext();
		const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);

		const { container } = render(VoiceInput, { props: { active: true, demo: true } });
		await Promise.resolve();

		expect(canvas(container)).not.toBeNull();
		expect(raf).toHaveBeenCalled();
		expect(ctx.setTransform).toHaveBeenCalled();
	});

	it("paints one still frame and starts no loop under reduced motion", async () => {
		const restore = withReducedMotion();
		try {
			const { ctx } = stubContext();
			const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);

			render(VoiceInput, { props: { active: true, demo: true } });
			await Promise.resolve();

			expect(raf).not.toHaveBeenCalled();
			expect(ctx.clearRect).toHaveBeenCalledTimes(1);
		} finally {
			restore();
		}
	});

	it("draws the consumer's own samples in preference to the demo wave", async () => {
		const restore = withReducedMotion();
		const restoreWidth = withCanvasWidth(25);
		try {
			const { ctx } = stubContext();

			// Every level at full scale, which the synthetic wave never reaches — so
			// a full-height bar can only have come from the pipeline.
			render(VoiceInput, {
				props: { active: true, demo: true, samples: [1, 1, 1, 1, 1], height: 48 },
			});
			await Promise.resolve();

			// 25px of surface at 3px bars and 2px gaps is five bars, each centred.
			expect(ctx.fillRect.mock.calls).toEqual([
				[0, 0, 3, 48],
				[5, 0, 3, 48],
				[10, 0, 3, 48],
				[15, 0, 3, 48],
				[20, 0, 3, 48],
			]);
		} finally {
			restoreWidth();
			restore();
		}
	});

	it("falls back to a flat floor when there is neither a pipeline nor a demo", async () => {
		const restore = withReducedMotion();
		const restoreWidth = withCanvasWidth(25);
		try {
			const { ctx } = stubContext();

			render(VoiceInput, { props: { active: true, height: 50 } });
			await Promise.resolve();

			// 6% of 50px: a live-but-silent signal, not an empty box.
			expect(ctx.fillRect).toHaveBeenCalledTimes(5);
			for (const [, , , barHeight] of ctx.fillRect.mock.calls) {
				expect(barHeight).toBeCloseTo(3, 5);
			}
		} finally {
			restoreWidth();
			restore();
		}
	});

	it("starts no canvas work at all while idle", async () => {
		stubContext();
		const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);

		render(VoiceInput);
		await Promise.resolve();

		expect(raf).not.toHaveBeenCalled();
	});

	it("clamps an absurd height rather than drawing it", () => {
		const { container } = render(VoiceInput, { props: { active: true, height: 5000 } });

		expect((canvas(container) as HTMLCanvasElement).style.height).toBe("240px");
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(VoiceInput, { props: { class: "my-voice" } });

		expect(root(container).className).toContain("my-voice");
		expect(root(container).className).toContain("ft-voice");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays open exactly once when the mic starts a recording", async () => {
			const { container } = render(VoiceInput, { props: { sound: true } });

			await fireEvent.click(mic(container) as HTMLButtonElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(VoiceInput, {});

			await fireEvent.click(mic(container) as HTMLButtonElement);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays close exactly once when cancel abandons the recording", async () => {
			const { container } = render(VoiceInput, { props: { active: true, sound: true } });

			await fireEvent.click(cancelButton(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("plays select, never close, when confirm ends the recording", async () => {
			const { container } = render(VoiceInput, { props: { active: true, sound: true } });

			await fireEvent.click(confirmButton(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("does not double-fire on a repeated cancel dispatch — the added !active guard holds", () => {
			const { container } = render(VoiceInput, { props: { active: true, sound: true } });
			const button = cancelButton(container);

			// Two synchronous dispatches, with no flush between them: the guard
			// added inside cancel() itself is what stops the second one, not the
			// button having already left the DOM once `active` flips.
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close");
		});

		it("does not double-fire on a repeated confirm dispatch — the added !active guard holds", () => {
			const { container } = render(VoiceInput, { props: { active: true, sound: true } });
			const button = confirmButton(container);

			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays nothing when active is driven from outside rather than through start()", async () => {
			const { container, rerender } = render(VoiceInput, {
				props: { active: false, sound: true },
			});

			await rerender({ active: true, sound: true });

			expect(play).not.toHaveBeenCalled();
		});
	});
});
