import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import FileUpload from "./FileUpload.svelte";
import ValueHarness from "./FileUploadHarness.test.svelte";
import FieldHarness from "./FileUploadFieldHarness.test.svelte";
import type { FieldContext } from "../_internals/field.svelte.js";
import type { UploadFile } from "./FileUpload.svelte";

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

describe("FileUpload", () => {
	afterEach(cleanup);

	it("renders a real file input behind the drop zone, plus the prompt and hint", () => {
		const { container } = render(FileUpload, { props: { hint: "PNG, SVG — 4 MB max" } });
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
		const { container } = render(FileUpload, {});
		const input = fileInput(container);

		expect(input.tabIndex).toBe(0);
		expect(input.hasAttribute("hidden")).toBe(false);

		input.focus();
		expect(document.activeElement).toBe(input);
	});

	it("selecting a file via the input adds a row", async () => {
		const onFilesChange = vi.fn();
		const { container } = render(FileUpload, { props: { onFilesChange } });
		const input = fileInput(container);
		const file = makeFile("logo.svg");

		await fireEvent.change(input, { target: { files: [file] } });

		expect(rows(container)).toHaveLength(1);
		expect(container.textContent).toContain("logo.svg");
		expect(onFilesChange).toHaveBeenCalledTimes(1);
		const passed = onFilesChange.mock.calls[0][0] as UploadFile[];
		expect(passed).toHaveLength(1);
		expect(passed[0].status).toBe("pending");
		expect(passed[0].file).toBe(file);
	});

	it("dropping a file adds a row", async () => {
		const onFilesChange = vi.fn();
		const { container } = render(FileUpload, { props: { onFilesChange } });
		const zone = dropzone(container);
		const file = makeFile("photo.png", 2048, "image/png");

		await fireEvent.drop(zone, { dataTransfer: { files: [file] } });

		expect(rows(container)).toHaveLength(1);
		expect(container.textContent).toContain("photo.png");
		expect(onFilesChange).toHaveBeenCalledWith([
			expect.objectContaining({ file, status: "pending" }),
		]);
	});

	it("dropping two files onto a non-multiple zone keeps the first and announces the second, rather than discarding it silently", async () => {
		const onFilesChange = vi.fn();
		const { container } = render(FileUpload, { props: { onFilesChange } });
		const zone = dropzone(container);
		const first = makeFile("logo.svg");
		const extra = makeFile("extra.svg");

		await fireEvent.drop(zone, { dataTransfer: { files: [first, extra] } });

		expect(rows(container)).toHaveLength(1);
		expect(rows(container)[0].textContent).toContain("logo.svg");
		expect(rows(container)[0].textContent).not.toContain("extra.svg");
		const passed = onFilesChange.mock.calls[0][0] as UploadFile[];
		expect(passed).toHaveLength(1);
		expect(passed[0].file).toBe(first);

		// The extra file never reached the OS picker's own filtering either —
		// a non-multiple <input> can't multi-select in the first place, so a
		// drop is the only path this case can even arrive by. It still needs
		// to be announced, the same as any other rejection.
		const live = container.querySelector('[aria-live="polite"]');
		expect(live?.textContent).toMatch(/extra\.svg/);
		expect(live?.textContent).toMatch(/only one file/i);
	});

	it("a file over maxSize lands as an error row with a message, not silently dropped", async () => {
		const { container } = render(FileUpload, { props: { maxSize: 1_000_000 } });
		const zone = dropzone(container);
		const big = makeFile("huge.zip", 5_000_000, "application/zip");

		await fireEvent.drop(zone, { dataTransfer: { files: [big] } });

		expect(rows(container)).toHaveLength(1);
		const row = rows(container)[0];
		expect(row.textContent).toContain("huge.zip");
		expect(row.textContent).toMatch(/exceeds/i);
		// Announced too, not only rendered inline.
		const live = container.querySelector('[aria-live="polite"]');
		expect(live?.textContent).toMatch(/huge\.zip/);
	});

	it("accept rejects a mismatching drop with an error row and announces it, even though the browser's own filter never saw it", async () => {
		const { container } = render(FileUpload, { props: { accept: ".png,image/png" } });
		const zone = dropzone(container);
		const text = makeFile("notes.txt", 100, "text/plain");

		await fireEvent.drop(zone, { dataTransfer: { files: [text] } });

		expect(rows(container)).toHaveLength(1);
		const row = rows(container)[0];
		expect(row.textContent).toContain("notes.txt");
		expect(row.textContent).toMatch(/not an accepted file type/i);
		const live = container.querySelector('[aria-live="polite"]');
		expect(live?.textContent).toMatch(/notes\.txt/);
	});

	it("accept allows a matching drop through as a plain pending row, with no error text", async () => {
		const { container } = render(FileUpload, { props: { accept: ".png,image/png" } });
		const zone = dropzone(container);
		const png = makeFile("ok.png", 100, "image/png");

		await fireEvent.drop(zone, { dataTransfer: { files: [png] } });

		expect(rows(container)).toHaveLength(1);
		const row = rows(container)[0];
		expect(row.textContent).toContain("ok.png");
		expect(row.querySelector(".text-destructive")).toBeNull();
		const live = container.querySelector('[aria-live="polite"]');
		expect(live?.textContent).toMatch(/1 file added/i);
	});

	it("maxFiles caps the list instead of growing past it, and announces the file it turned away", async () => {
		const onFilesChange = vi.fn();
		const { container } = render(FileUpload, {
			props: { multiple: true, maxFiles: 2, onFilesChange },
		});
		const zone = dropzone(container);
		const a = makeFile("a.txt");
		const b = makeFile("b.txt");
		const c = makeFile("c.txt");

		await fireEvent.drop(zone, { dataTransfer: { files: [a, b, c] } });

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
		const { container } = render(FileUpload, { props: { disabled: true, onFilesChange } });
		const input = fileInput(container);
		const zone = dropzone(container);

		expect(input.disabled).toBe(true);

		// A synthetic change bypasses the native disabled guard the same way a
		// synthetic click does on a button, so the handler needs its own check.
		await fireEvent.change(input, { target: { files: [makeFile("a.txt")] } });
		await fireEvent.drop(zone, { dataTransfer: { files: [makeFile("b.txt")] } });

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
		const { container } = render(FileUpload, { props: { files: [entry] } });
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
		const { container } = render(FileUpload, { props: { files: [entry] } });
		const bar = container.querySelector('[role="progressbar"]') as HTMLElement;

		expect(bar).toBeTruthy();
		expect(bar.hasAttribute("aria-valuenow")).toBe(false);
		expect(bar.getAttribute("aria-valuemin")).toBe("0");
		expect(bar.getAttribute("aria-valuemax")).toBe("100");
	});

	it("removing a row drops it from the list and moves focus to the row that took its place", async () => {
		const entries: UploadFile[] = [
			{ id: "1", file: makeFile("a.txt"), progress: null, status: "pending" },
			{ id: "2", file: makeFile("b.txt"), progress: null, status: "pending" },
		];
		const onFilesChange = vi.fn();
		const { container } = render(FileUpload, { props: { files: entries, onFilesChange } });

		expect(rows(container)).toHaveLength(2);
		await fireEvent.click(removeButtons(container)[0]);

		await waitFor(() => expect(rows(container)).toHaveLength(1));
		expect(container.textContent).toContain("b.txt");
		expect(container.textContent).not.toContain("a.txt");
		expect(onFilesChange).toHaveBeenCalledWith([
			expect.objectContaining({ file: entries[1].file }),
		]);
		expect(document.activeElement).toBe(removeButtons(container)[0]);
	});

	it("removing the last row moves focus back to the file input", async () => {
		const entries: UploadFile[] = [
			{ id: "1", file: makeFile("a.txt"), progress: null, status: "pending" },
		];
		const { container } = render(FileUpload, { props: { files: entries } });

		await fireEvent.click(removeButtons(container)[0]);

		await waitFor(() => expect(rows(container)).toHaveLength(0));
		expect(document.activeElement).toBe(fileInput(container));
	});

	it("each row's remove button names the file, not a bare glyph", () => {
		const entries: UploadFile[] = [
			{ id: "1", file: makeFile("logo.svg"), progress: null, status: "pending" },
		];
		const { container } = render(FileUpload, { props: { files: entries } });

		expect(removeButtons(container)[0].getAttribute("aria-label")).toBe("Remove logo.svg");
	});

	it("the drag counter survives crossing an inner element without flickering the dragging state off", async () => {
		const { container } = render(FileUpload, {});
		const zone = dropzone(container);
		const inner = container.querySelector(".ft-file-upload-icon") as HTMLElement;

		await fireEvent.dragEnter(zone);
		expect(zone.getAttribute("data-dragging")).toBe("true");

		// Pointer moves onto a child: browsers fire enter on the child (bubbles
		// here) and leave on the outer zone, in either order.
		await fireEvent.dragEnter(inner);
		await fireEvent.dragLeave(zone);
		expect(zone.getAttribute("data-dragging")).toBe("true");

		// Pointer fully leaves.
		await fireEvent.dragLeave(inner);
		expect(zone.getAttribute("data-dragging")).toBeNull();
	});

	it("clears the dragging state on drop", async () => {
		const { container } = render(FileUpload, {});
		const zone = dropzone(container);

		await fireEvent.dragEnter(zone);
		expect(zone.getAttribute("data-dragging")).toBe("true");

		await fireEvent.drop(zone, { dataTransfer: { files: [] } });
		expect(zone.getAttribute("data-dragging")).toBeNull();
	});

	it("round-trips files and ref through bind:files / bind:ref", async () => {
		const { container, getByTestId } = render(ValueHarness);
		const input = fileInput(container);

		expect(getByTestId("bound-count").textContent).toBe("0");
		await fireEvent.change(input, { target: { files: [makeFile("a.txt"), makeFile("b.txt")] } });

		expect(getByTestId("bound-count").textContent).toBe("2");
		expect(input.getAttribute("data-bound-ref")).toBe("yes");
	});

	it("works standalone: getField() has no provider, so its own props apply untouched", () => {
		const { container } = render(FileUpload, {
			props: { id: "solo", invalid: true, required: true, disabled: false },
		});
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
		const { container } = render(FieldHarness, { props: { context } });
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
