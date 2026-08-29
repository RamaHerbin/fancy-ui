import { render, cleanup, fireEvent } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { VoiceInput } from "./VoiceInput.js";

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
 * Test-only rig echoing the controlled `active` into the DOM — the only way to
 * prove the recording state travels back out to the consumer rather than merely
 * changing what the component draws. Mirrors the Svelte harness's `bind:active`.
 */
function Harness({ initialActive = false }: { initialActive?: boolean }) {
	const [active, setActive] = useState(initialActive);
	return (
		<>
			<VoiceInput active={active} onActiveChange={setActive} />
			<span data-testid="bound-active">{active ? "recording" : "idle"}</span>
		</>
	);
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
		const { container } = render(<VoiceInput />);

		expect(root(container).getAttribute("role")).toBe("group");
		expect(root(container).getAttribute("aria-label")).toBe("Voice input");
	});

	it("shows nothing but the mic button while idle", () => {
		const { container } = render(<VoiceInput />);

		expect(mic(container)).not.toBeNull();
		expect(canvas(container)).toBeNull();
		expect(container.querySelector(".ft-voice-panel")).toBeNull();
		expect(root(container).dataset.active).toBe("false");
	});

	it("opens the panel and reports the start when the mic is pressed", () => {
		const onStart = vi.fn();
		const { container } = render(<VoiceInput onStart={onStart} />);

		fireEvent.click(mic(container) as HTMLButtonElement);

		expect(onStart).toHaveBeenCalledTimes(1);
		expect(mic(container)).toBeNull();
		expect(container.querySelector(".ft-voice-panel")).not.toBeNull();
		expect(canvas(container)).not.toBeNull();
		expect(root(container).dataset.active).toBe("true");
	});

	it("writes the recording state back out through the controlled pair", () => {
		const { container, getByTestId } = render(<Harness />);
		expect(getByTestId("bound-active").textContent).toBe("idle");

		fireEvent.click(mic(container) as HTMLButtonElement);
		expect(getByTestId("bound-active").textContent).toBe("recording");

		fireEvent.click(cancelButton(container));
		expect(getByTestId("bound-active").textContent).toBe("idle");
	});

	it("writes the confirm back out through the pair too", () => {
		const { container, getByTestId } = render(<Harness initialActive />);

		fireEvent.click(confirmButton(container));

		expect(getByTestId("bound-active").textContent).toBe("idle");
	});

	it("follows an active prop driven from outside", () => {
		const { container, rerender } = render(<VoiceInput active={false} />);
		expect(mic(container)).not.toBeNull();

		rerender(<VoiceInput active={true} />);
		expect(mic(container)).toBeNull();
		expect(container.querySelector(".ft-voice-panel")).not.toBeNull();
	});

	it("closes the panel and reports the cancel", () => {
		const onCancel = vi.fn();
		const onStop = vi.fn();
		const { container } = render(<VoiceInput active onCancel={onCancel} onStop={onStop} />);

		fireEvent.click(cancelButton(container));

		expect(onCancel).toHaveBeenCalledTimes(1);
		expect(onStop).not.toHaveBeenCalled();
		expect(mic(container)).not.toBeNull();
	});

	it("closes the panel and reports the confirm", () => {
		const onCancel = vi.fn();
		const onStop = vi.fn();
		const { container } = render(<VoiceInput active onCancel={onCancel} onStop={onStop} />);

		fireEvent.click(confirmButton(container));

		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onCancel).not.toHaveBeenCalled();
		expect(mic(container)).not.toBeNull();
	});

	it("opens on an externally driven active without claiming the user started it", () => {
		const onStart = vi.fn();
		const { container } = render(<VoiceInput active onStart={onStart} />);

		expect(container.querySelector(".ft-voice-panel")).not.toBeNull();
		expect(onStart).not.toHaveBeenCalled();
	});

	it("announces the recording through a live region that survives the state change", () => {
		const { container } = render(<VoiceInput />);

		expect(statusLine(container).getAttribute("role")).toBe("status");
		expect(statusLine(container).textContent).toBe("");

		fireEvent.click(mic(container) as HTMLButtonElement);
		expect(statusLine(container).textContent).toBe("Recording");

		fireEvent.click(confirmButton(container));
		expect(statusLine(container).textContent).toBe("");
	});

	it("renders the transcript under the waveform and lets it grow in place", () => {
		const { container, rerender } = render(<VoiceInput active transcript="show me" />);

		expect(transcriptLine(container)?.textContent?.trim()).toBe("show me");

		rerender(<VoiceInput active transcript="show me the retry policy" />);
		expect(transcriptLine(container)?.textContent?.trim()).toBe("show me the retry policy");
	});

	it("leaves the transcript line out entirely until there is something to say", () => {
		const { container } = render(<VoiceInput active />);

		expect(transcriptLine(container)).toBeNull();
	});

	it("hides the waveform from assistive tech and times the recording out loud", () => {
		const { container } = render(<VoiceInput active />);

		expect(canvas(container)?.getAttribute("aria-hidden")).toBe("true");
		const time = container.querySelector("time") as HTMLTimeElement;
		expect(time.textContent).toBe("0s");
		expect(time.getAttribute("datetime")).toBe("PT0S");
	});

	it("renders the panel unharmed when the canvas hands back no context", () => {
		// The global setup already makes `getContext` return null.
		expect(canvas(document.body)).toBeNull();
		const { container } = render(<VoiceInput active demo />);

		expect(container.querySelector(".ft-voice-panel")).not.toBeNull();
		expect(canvas(container)).not.toBeNull();
	});

	it("runs the loop from demo samples when no pipeline is feeding it", () => {
		const { ctx } = stubContext();
		const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);

		const { container } = render(<VoiceInput active demo />);

		expect(canvas(container)).not.toBeNull();
		expect(raf).toHaveBeenCalled();
		expect(ctx.setTransform).toHaveBeenCalled();
	});

	it("paints one still frame and starts no loop under reduced motion", () => {
		const restore = withReducedMotion();
		try {
			const { ctx } = stubContext();
			const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);

			render(<VoiceInput active demo />);

			expect(raf).not.toHaveBeenCalled();
			expect(ctx.clearRect).toHaveBeenCalledTimes(1);
		} finally {
			restore();
		}
	});

	it("draws the consumer's own samples in preference to the demo wave", () => {
		const restore = withReducedMotion();
		const restoreWidth = withCanvasWidth(25);
		try {
			const { ctx } = stubContext();

			// Every level at full scale, which the synthetic wave never reaches — so
			// a full-height bar can only have come from the pipeline.
			render(<VoiceInput active demo samples={[1, 1, 1, 1, 1]} height={48} />);

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

	it("falls back to a flat floor when there is neither a pipeline nor a demo", () => {
		const restore = withReducedMotion();
		const restoreWidth = withCanvasWidth(25);
		try {
			const { ctx } = stubContext();

			render(<VoiceInput active height={50} />);

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

	it("starts no canvas work at all while idle", () => {
		stubContext();
		const raf = vi.spyOn(globalThis, "requestAnimationFrame").mockReturnValue(1);

		render(<VoiceInput />);

		expect(raf).not.toHaveBeenCalled();
	});

	it("clamps an absurd height rather than drawing it", () => {
		const { container } = render(<VoiceInput active height={5000} />);

		expect((canvas(container) as HTMLCanvasElement).style.height).toBe("240px");
	});

	it("merges custom classes onto the root", () => {
		const { container } = render(<VoiceInput className="my-voice" />);

		expect(root(container).className).toContain("my-voice");
		expect(root(container).className).toContain("ft-voice");
	});
});
