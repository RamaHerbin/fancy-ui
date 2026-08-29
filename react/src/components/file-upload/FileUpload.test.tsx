import { render, cleanup, fireEvent, waitFor, act } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { FileUpload } from "./FileUpload.js";
import type { UploadFile } from "./FileUpload.js";
import { FieldProvider } from "../../internals/field.js";
import type { FieldContext } from "../../internals/field.js";

function makeFile(name: string, size = 1024, type = "application/octet-stream"): File {
	return new File([new ArrayBuffer(size)], name, { type });
}

function fileInput(container: HTMLElement): HTMLInputElement {
	return container.querySelector('input[type="file"]') as HTMLInputElement;
}

function dropzone(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-file-upload-dropzone") as HTMLElement;
}

function rows(container: HTMLElement): NodeListOf<HTMLLIElement> {
	return container.querySelectorAll("li");
}

function removeButtons(container: HTMLElement): NodeListOf<HTMLButtonElement> {
	return container.querySelectorAll("[data-file-remove]");
}

function progressFill(container: HTMLElement): HTMLElement {
	return container.querySelector(".ft-file-upload-progress-fill") as HTMLElement;
}

/**
 * Flushes the microtask-resolved animation stub plus the React updates a
 * settling transition leg schedules. `runTransition` chains a dummy into the
 * real animation, so a settled leg is two turns away — the Svelte side's
 * `await tick()` becomes this.
 */
const settle = () => act(async () => {});

/** Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. `prefersReducedMotion()` resolves it fresh every time a transition
 * starts, so an override installed before a click is visible to that click. */
function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches: matches && query.includes("prefers-reduced-motion"),
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

/**
 * Parks every real transition animation so an exit window stays open for as
 * long as a test wants it. The test-setup stub resolves `onfinish` on a
 * microtask, which is right for suites that just want the DOM to settle but
 * wrong here: it compresses a 200 ms exit into less than one tick, so the state
 * a browser actually spends that 200 ms in — leaving row still mounted, still
 * `inert` — is never observable.
 *
 * `runTransition` issues two `animate()` calls per leg, exactly as the source
 * runtime does: a zero-length dummy whose `onfinish` builds the real keyframes,
 * then the real one. The dummy still resolves on a microtask; only the real one
 * is held. Returns a `release()` that finishes everything held so far.
 */
function holdExits() {
	const parked: Array<() => void> = [];
	const spy = vi.spyOn(Element.prototype, "animate").mockImplementation((_keyframes, options) => {
		const animation = {
			playState: "running",
			currentTime: 0,
			startTime: 0,
			effect: null as unknown,
			onfinish: null as (() => void) | null,
			oncancel: null as (() => void) | null,
			cancelled: false,
			cancel() {
				this.cancelled = true;
				this.playState = "idle";
			},
			finish() {},
			play() {},
			pause() {},
			reverse() {},
			updatePlaybackRate() {},
			commitStyles() {},
			persist() {},
			addEventListener() {},
			removeEventListener() {},
		};
		const fire = () => {
			if (animation.cancelled) return;
			animation.playState = "finished";
			animation.onfinish?.();
		};
		if (
			typeof options === "object" &&
			options &&
			typeof options.duration === "number" &&
			options.duration > 0
		) {
			parked.push(fire);
		} else {
			queueMicrotask(fire);
		}
		return animation as unknown as Animation;
	});

	return {
		release() {
			const pending = parked.splice(0);
			for (const fire of pending) fire();
		},
		restore() {
			spy.mockRestore();
		},
	};
}

/**
 * Transposed from the Svelte value harness: `bind:files` becomes the
 * controlled `files` + `onFilesChange` pair — the harness owns the list,
 * writes it back from the callback, and echoes the count into the DOM so a
 * test can prove it travels back out to the consumer rather than merely
 * changing what FileUpload draws internally. The ref effect mirrors the
 * Svelte harness's `$effect` proving `bind:ref` lands on the consumer's
 * variable.
 */
function ValueHarness({ onFilesChange }: { onFilesChange?: (files: UploadFile[]) => void }) {
	const [files, setFiles] = useState<UploadFile[]>([]);
	const el = useRef<HTMLInputElement | null>(null);

	useEffect(() => {
		el.current?.setAttribute("data-bound-ref", "yes");
	});

	return (
		<>
			<FileUpload
				ref={el}
				files={files}
				onFilesChange={(next) => {
					setFiles(next);
					onFilesChange?.(next);
				}}
				multiple
			/>
			<span data-testid="bound-count">{files.length}</span>
		</>
	);
}

/**
 * Transposed from the Svelte field harness: publishes a hand-built
 * FieldContext through FieldProvider instead of rendering a real FormField —
 * this wave's components are built against the frozen FieldContext surface,
 * not against each other, so a fake provider here is the one way to test the
 * consumer side in isolation.
 */
function FieldHarness({ context }: { context: FieldContext }) {
	// Deliberately passed own props that disagree with the context, so a test
	// can prove the context wins rather than merely matching by coincidence.
	return (
		<FieldProvider value={context}>
			<FileUpload id="own-id" invalid={false} required={false} disabled={false} />
		</FieldProvider>
	);
}

describe("FileUpload", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders a real file input behind the drop zone, plus the prompt and hint", () => {
		const { container } = render(<FileUpload hint="PNG, SVG — 4 MB max" />);
		const input = fileInput(container);

		expect(input.tagName).toBe("INPUT");
		expect(input.type).toBe("file");
		expect(container.textContent).toContain("Drag and drop or");
		expect(container.textContent).toContain("browse");
		expect(container.textContent).toContain("PNG, SVG — 4 MB max");
	});

	it("the file input is tab-reachable and focusable on a fresh render, not just after a row is removed", () => {
		// `sr-only` is a clip-based visually-hidden treatment (position:
		// absolute + clip), not `display:none` and not `tabindex="-1"` — this
		// is what actually keeps the input in the tab order. tabIndex reflects
		// the browser's own default (0) for a native, non-disabled control with
		// no explicit tabindex attribute; a regression that swapped in
		// `tabindex="-1"` or the `hidden` attribute would flip one of these two
		// checks even though the other focus tests in this file (which only
		// ever check focus *after* a removal) would stay green regardless.
		const { container } = render(<FileUpload />);
		const input = fileInput(container);

		expect(input.tabIndex).toBe(0);
		expect(input.hasAttribute("hidden")).toBe(false);

		input.focus();
		expect(document.activeElement).toBe(input);
	});

	it("selecting a file via the input adds a row", async () => {
		const onFilesChange = vi.fn();
		const { container } = render(<FileUpload onFilesChange={onFilesChange} />);
		const input = fileInput(container);
		const file = makeFile("logo.svg");

		fireEvent.change(input, { target: { files: [file] } });
		await settle();

		expect(rows(container)).toHaveLength(1);
		expect(container.textContent).toContain("logo.svg");
		expect(onFilesChange).toHaveBeenCalledTimes(1);
		const passed = onFilesChange.mock.calls[0]![0] as UploadFile[];
		expect(passed).toHaveLength(1);
		expect(passed[0]!.status).toBe("pending");
		expect(passed[0]!.file).toBe(file);
	});

	it("dropping a file adds a row", async () => {
		const onFilesChange = vi.fn();
		const { container } = render(<FileUpload onFilesChange={onFilesChange} />);
		const zone = dropzone(container);
		const file = makeFile("photo.png", 2048, "image/png");

		fireEvent.drop(zone, { dataTransfer: { files: [file] } });
		await settle();

		expect(rows(container)).toHaveLength(1);
		expect(container.textContent).toContain("photo.png");
		expect(onFilesChange).toHaveBeenCalledWith([
			expect.objectContaining({ file, status: "pending" }),
		]);
	});

	it("dropping two files onto a non-multiple zone keeps the first and announces the second, rather than discarding it silently", async () => {
		const onFilesChange = vi.fn();
		const { container } = render(<FileUpload onFilesChange={onFilesChange} />);
		const zone = dropzone(container);
		const first = makeFile("logo.svg");
		const extra = makeFile("extra.svg");

		fireEvent.drop(zone, { dataTransfer: { files: [first, extra] } });
		await settle();

		expect(rows(container)).toHaveLength(1);
		expect(rows(container)[0]!.textContent).toContain("logo.svg");
		expect(rows(container)[0]!.textContent).not.toContain("extra.svg");
		const passed = onFilesChange.mock.calls[0]![0] as UploadFile[];
		expect(passed).toHaveLength(1);
		expect(passed[0]!.file).toBe(first);

		// The extra file never reached the OS picker's own filtering either —
		// a non-multiple <input> can't multi-select in the first place, so a
		// drop is the only path this case can even arrive by. It still needs
		// to be announced, the same as any other rejection.
		const live = container.querySelector('[aria-live="polite"]');
		expect(live?.textContent).toMatch(/extra\.svg/);
		expect(live?.textContent).toMatch(/only one file/i);
	});

	it("a file over maxSize lands as an error row with a message, not silently dropped", async () => {
		const { container } = render(<FileUpload maxSize={1_000_000} />);
		const zone = dropzone(container);
		const big = makeFile("huge.zip", 5_000_000, "application/zip");

		fireEvent.drop(zone, { dataTransfer: { files: [big] } });
		await settle();

		expect(rows(container)).toHaveLength(1);
		const row = rows(container)[0]!;
		expect(row.textContent).toContain("huge.zip");
		expect(row.textContent).toMatch(/exceeds/i);
		// Announced too, not only rendered inline.
		const live = container.querySelector('[aria-live="polite"]');
		expect(live?.textContent).toMatch(/huge\.zip/);
	});

	it("accept rejects a mismatching drop with an error row and announces it, even though the browser's own filter never saw it", async () => {
		const { container } = render(<FileUpload accept=".png,image/png" />);
		const zone = dropzone(container);
		const text = makeFile("notes.txt", 100, "text/plain");

		fireEvent.drop(zone, { dataTransfer: { files: [text] } });
		await settle();

		expect(rows(container)).toHaveLength(1);
		const row = rows(container)[0]!;
		expect(row.textContent).toContain("notes.txt");
		expect(row.textContent).toMatch(/not an accepted file type/i);
		const live = container.querySelector('[aria-live="polite"]');
		expect(live?.textContent).toMatch(/notes\.txt/);
	});

	it("accept allows a matching drop through as a plain pending row, with no error text", async () => {
		const { container } = render(<FileUpload accept=".png,image/png" />);
		const zone = dropzone(container);
		const png = makeFile("ok.png", 100, "image/png");

		fireEvent.drop(zone, { dataTransfer: { files: [png] } });
		await settle();

		expect(rows(container)).toHaveLength(1);
		const row = rows(container)[0]!;
		expect(row.textContent).toContain("ok.png");
		expect(row.querySelector(".text-destructive")).toBeNull();
		const live = container.querySelector('[aria-live="polite"]');
		expect(live?.textContent).toMatch(/1 file added/i);
	});

	it("maxFiles caps the list instead of growing past it, and announces the file it turned away", async () => {
		const onFilesChange = vi.fn();
		const { container } = render(<FileUpload multiple maxFiles={2} onFilesChange={onFilesChange} />);
		const zone = dropzone(container);
		const a = makeFile("a.txt");
		const b = makeFile("b.txt");
		const c = makeFile("c.txt");

		fireEvent.drop(zone, { dataTransfer: { files: [a, b, c] } });
		await settle();

		expect(rows(container)).toHaveLength(2);
		const passed = onFilesChange.mock.calls.at(-1)?.[0] as UploadFile[];
		expect(passed).toHaveLength(2);
		expect(passed.map((entry) => entry.file.name)).toEqual(["a.txt", "b.txt"]);
		const live = container.querySelector('[aria-live="polite"]');
		expect(live?.textContent).toMatch(/c\.txt/);
		expect(live?.textContent).toMatch(/limit of 2/i);
	});

	it("disabled blocks both the picker and the drop", async () => {
		const onFilesChange = vi.fn();
		const { container } = render(<FileUpload disabled onFilesChange={onFilesChange} />);
		const input = fileInput(container);
		const zone = dropzone(container);

		expect(input.disabled).toBe(true);

		// A synthetic change bypasses the native disabled guard the same way a
		// synthetic click does on a button, so the handler needs its own check.
		fireEvent.change(input, { target: { files: [makeFile("a.txt")] } });
		fireEvent.drop(zone, { dataTransfer: { files: [makeFile("b.txt")] } });
		await settle();

		expect(rows(container)).toHaveLength(0);
		expect(onFilesChange).not.toHaveBeenCalled();
	});

	it("renders progressbar aria values while uploading, and omits aria-valuenow when progress is null", () => {
		const entry: UploadFile = {
			id: "1",
			file: makeFile("logo.svg"),
			progress: 70,
			status: "uploading",
		};
		// The Svelte side's non-bound `files` prop — seed once, then the
		// component owns it — is React's `defaultFiles`.
		const { container } = render(<FileUpload defaultFiles={[entry]} />);
		const bar = container.querySelector('[role="progressbar"]') as HTMLElement;

		expect(bar).toBeTruthy();
		expect(bar.getAttribute("aria-valuemin")).toBe("0");
		expect(bar.getAttribute("aria-valuemax")).toBe("100");
		expect(bar.getAttribute("aria-valuenow")).toBe("70");
		expect(bar.getAttribute("aria-label")).toMatch(/logo\.svg/);
		expect(container.textContent).toContain("70%");
	});

	it("does not claim a value it does not have when progress is null", () => {
		const entry: UploadFile = {
			id: "1",
			file: makeFile("logo.svg"),
			progress: null,
			status: "uploading",
		};
		const { container } = render(<FileUpload defaultFiles={[entry]} />);
		const bar = container.querySelector('[role="progressbar"]') as HTMLElement;

		expect(bar).toBeTruthy();
		expect(bar.hasAttribute("aria-valuenow")).toBe(false);
		expect(bar.getAttribute("aria-valuemin")).toBe("0");
		expect(bar.getAttribute("aria-valuemax")).toBe("100");
	});

	// The determinate bar is driven by `transform: scaleX(var(...))`, so the
	// value has to reach CSS as a 0–1 ratio on a custom property rather than as
	// an inline `width` percentage. Asserting on the property is the only way to
	// catch a regression back to `width`: jsdom computes no transform, so the
	// rendered geometry proves nothing either way.
	it("carries determinate progress as a 0–1 ratio on a custom property, never as an inline width", () => {
		const entry: UploadFile = {
			id: "1",
			file: makeFile("logo.svg"),
			progress: 70,
			status: "uploading",
		};
		const { container } = render(<FileUpload defaultFiles={[entry]} />);
		const fill = progressFill(container);

		expect(fill.style.getPropertyValue("--ft-fileupload-progress")).toBe("0.7");
		expect(fill.style.width).toBe("");
	});

	it("omits the progress custom property entirely while progress is null", () => {
		const entry: UploadFile = {
			id: "1",
			file: makeFile("logo.svg"),
			progress: null,
			status: "uploading",
		};
		const { container } = render(<FileUpload defaultFiles={[entry]} />);
		const fill = progressFill(container);

		// `undefined`, not `""`, is what the style object treats as "omit" — an
		// empty string would write the property with no value and leave the
		// indeterminate block sitting at `scaleX()` of nothing.
		expect(fill.style.getPropertyValue("--ft-fileupload-progress")).toBe("");
		expect(fill.classList.contains("ft-file-upload-progress-indeterminate")).toBe(true);
	});

	// A row leaves through an exit transition now, so `removed-from-files`
	// then `node-goes` stops being one step. The row must still be in the DOM
	// while it fades, and marked `inert` for the whole of it — a closing row
	// is not something a pointer or a screen reader should be able to reach.
	it("keeps a removed row mounted and inert for the length of its exit, then drops it", async () => {
		const held = holdExits();
		try {
			const entries: UploadFile[] = [
				{ id: "1", file: makeFile("a.txt"), progress: null, status: "pending" },
				{ id: "2", file: makeFile("b.txt"), progress: null, status: "pending" },
			];
			const { container } = render(<FileUpload defaultFiles={entries} />);
			expect(rows(container)).toHaveLength(2);

			fireEvent.click(removeButtons(container)[0]!);
			await settle();

			// Still two rows: the first one is on its way out, not gone.
			expect(rows(container)).toHaveLength(2);
			expect(rows(container)[0]!.inert).toBe(true);
			expect(rows(container)[0]!.textContent).toContain("a.txt");

			await act(async () => {
				held.release();
			});
			await waitFor(() => expect(rows(container)).toHaveLength(1));
			expect(container.textContent).not.toContain("a.txt");
		} finally {
			held.restore();
		}
	});

	// The LAST row is the one case where the Svelte side needed `|global`: the
	// list's own `{#if}` tears the whole `<ul>` down when `files.length` hits
	// zero, and without it every other removal faded while the final row
	// vanished on the spot. Here the rendered list owns the clock explicitly —
	// the `<ul>` stays mounted while any row, exiting included, remains.
	it("plays the exit for the FINAL row too, keeping the list mounted until it finishes", async () => {
		const held = holdExits();
		try {
			const entries: UploadFile[] = [
				{ id: "1", file: makeFile("only.txt"), progress: null, status: "pending" },
			];
			const { container } = render(<FileUpload defaultFiles={entries} />);
			expect(rows(container)).toHaveLength(1);

			fireEvent.click(removeButtons(container)[0]!);
			await settle();

			// The list and its last row are still there, fading, not gone.
			expect(rows(container)).toHaveLength(1);
			expect(rows(container)[0]!.inert).toBe(true);
			expect(container.querySelector(".ft-file-upload-list")).not.toBeNull();

			await act(async () => {
				held.release();
			});
			await waitFor(() => expect(rows(container)).toHaveLength(0));
			expect(container.querySelector(".ft-file-upload-list")).toBeNull();
		} finally {
			held.restore();
		}
	});

	// The regression the id-based lookup in `removeFile` exists to stop: while the
	// removed row is still animating out it is still in the DOM AND `inert`, so a
	// DOM-order lookup would hand focus to the button that is leaving — which a
	// real browser refuses to focus, dropping focus onto <body>, exactly where
	// that code exists to stop it landing.
	it("moves focus to the surviving row while the removed one is still leaving", async () => {
		const held = holdExits();
		try {
			const entries: UploadFile[] = [
				{ id: "1", file: makeFile("a.txt"), progress: null, status: "pending" },
				{ id: "2", file: makeFile("b.txt"), progress: null, status: "pending" },
			];
			const { container } = render(<FileUpload defaultFiles={entries} />);

			fireEvent.click(removeButtons(container)[0]!);
			await settle();
			await settle();

			expect(rows(container)).toHaveLength(2);
			expect((document.activeElement as HTMLElement)?.getAttribute("aria-label")).toBe(
				"Remove b.txt"
			);
		} finally {
			held.restore();
		}
	});

	// The fast path: `duration: 0` makes `runTransition` call its finish
	// callback synchronously and never touch `element.animate()`, so a visitor
	// who asked for less motion gets exactly the synchronous removal this list
	// had before the exit existed.
	it("removes a row synchronously and never animates when the user asked for reduced motion", async () => {
		stubReducedMotion(true);
		const animateSpy = vi.spyOn(Element.prototype, "animate");
		const entries: UploadFile[] = [
			{ id: "1", file: makeFile("a.txt"), progress: null, status: "pending" },
			{ id: "2", file: makeFile("b.txt"), progress: null, status: "pending" },
		];
		const { container } = render(<FileUpload defaultFiles={entries} />);

		fireEvent.click(removeButtons(container)[0]!);
		await settle();

		expect(rows(container)).toHaveLength(1);
		expect(container.textContent).not.toContain("a.txt");
		expect(animateSpy).not.toHaveBeenCalled();
		animateSpy.mockRestore();
	});

	it("removing a row drops it from the list and moves focus to the row that took its place", async () => {
		const entries: UploadFile[] = [
			{ id: "1", file: makeFile("a.txt"), progress: null, status: "pending" },
			{ id: "2", file: makeFile("b.txt"), progress: null, status: "pending" },
		];
		const onFilesChange = vi.fn();
		const { container } = render(<FileUpload defaultFiles={entries} onFilesChange={onFilesChange} />);

		expect(rows(container)).toHaveLength(2);
		fireEvent.click(removeButtons(container)[0]!);

		await waitFor(() => expect(rows(container)).toHaveLength(1));
		expect(container.textContent).toContain("b.txt");
		expect(container.textContent).not.toContain("a.txt");
		expect(onFilesChange).toHaveBeenCalledWith([
			expect.objectContaining({ file: entries[1]!.file }),
		]);
		expect(document.activeElement).toBe(removeButtons(container)[0]!);
	});

	it("removing the last row moves focus back to the file input", async () => {
		const entries: UploadFile[] = [
			{ id: "1", file: makeFile("a.txt"), progress: null, status: "pending" },
		];
		const { container } = render(<FileUpload defaultFiles={entries} />);

		fireEvent.click(removeButtons(container)[0]!);

		await waitFor(() => expect(rows(container)).toHaveLength(0));
		expect(document.activeElement).toBe(fileInput(container));
	});

	it("each row's remove button names the file, not a bare glyph", () => {
		const entries: UploadFile[] = [
			{ id: "1", file: makeFile("logo.svg"), progress: null, status: "pending" },
		];
		const { container } = render(<FileUpload defaultFiles={entries} />);

		expect(removeButtons(container)[0]!.getAttribute("aria-label")).toBe("Remove logo.svg");
	});

	it("the drag counter survives crossing an inner element without flickering the dragging state off", async () => {
		const { container } = render(<FileUpload />);
		const zone = dropzone(container);
		const inner = container.querySelector(".ft-file-upload-icon") as HTMLElement;

		fireEvent.dragEnter(zone);
		expect(zone.getAttribute("data-dragging")).toBe("true");

		// Pointer moves onto a child: browsers fire enter on the child (bubbles
		// here) and leave on the outer zone, in either order.
		fireEvent.dragEnter(inner);
		fireEvent.dragLeave(zone);
		expect(zone.getAttribute("data-dragging")).toBe("true");

		// Pointer fully leaves.
		fireEvent.dragLeave(inner);
		expect(zone.getAttribute("data-dragging")).toBeNull();
	});

	it("clears the dragging state on drop", async () => {
		const { container } = render(<FileUpload />);
		const zone = dropzone(container);

		fireEvent.dragEnter(zone);
		expect(zone.getAttribute("data-dragging")).toBe("true");

		fireEvent.drop(zone, { dataTransfer: { files: [] } });
		expect(zone.getAttribute("data-dragging")).toBeNull();
	});

	it("round-trips files and ref through the controlled files/onFilesChange pair and the forwarded ref", async () => {
		const { container, getByTestId } = render(<ValueHarness />);
		const input = fileInput(container);

		expect(getByTestId("bound-count").textContent).toBe("0");
		fireEvent.change(input, { target: { files: [makeFile("a.txt"), makeFile("b.txt")] } });
		await settle();

		expect(getByTestId("bound-count").textContent).toBe("2");
		expect(input.getAttribute("data-bound-ref")).toBe("yes");
	});

	it("works standalone: useField() has no provider, so its own props apply untouched", () => {
		const { container } = render(
			<FileUpload id="solo" invalid required disabled={false} />
		);
		const input = fileInput(container);

		expect(input.id).toBe("solo");
		expect(input.getAttribute("aria-invalid")).toBe("true");
		expect(input.required).toBe(true);
	});

	it("inside a FormField, the context wins for controlId, aria-describedby, aria-invalid, required and disabled", () => {
		const context: FieldContext = {
			controlId: "ctx-id",
			describedBy: "ctx-help ctx-error",
			invalid: true,
			valid: false,
			required: true,
			disabled: true,
		};
		const { container } = render(<FieldHarness context={context} />);
		const input = fileInput(container);

		// The harness passes id="own-id" invalid={false} required={false}
		// disabled={false} straight to FileUpload — every one of those is
		// overridden by the context above.
		expect(input.id).toBe("ctx-id");
		expect(input.getAttribute("aria-describedby")).toBe("ctx-help ctx-error");
		expect(input.getAttribute("aria-invalid")).toBe("true");
		expect(input.required).toBe(true);
		expect(input.disabled).toBe(true);
	});
});
