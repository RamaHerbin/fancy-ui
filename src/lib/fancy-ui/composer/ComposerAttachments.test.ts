import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ComposerAttachment from "./ComposerAttachment.svelte";
import ComposerAttachments from "./ComposerAttachments.svelte";
import Harness from "./ComposerHarness.test.svelte";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";
import type { AttachmentData } from "../_internals/ai-types.js";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

/**
 * A composer standing in for the real root.
 *
 * `getContext` only answers during a child's initialisation, so the parts are
 * mounted with the context handed straight to Svelte's `mount` — the same trick
 * the card-3d suite uses. It keeps every assertion about the part itself rather
 * than about a root that has its own tests, and the last case in this file
 * mounts them against a real `Composer` to prove the two halves meet.
 */
function fakeComposer(options: { attachments?: AttachmentData[]; disabled?: boolean } = {}) {
	const attachments = options.attachments ?? [];
	const addFiles = vi.fn();
	const removeAttachment = vi.fn();
	const context: ComposerContext = {
		value: { current: "" },
		attachments: { current: attachments },
		disabled: options.disabled ?? false,
		streaming: false,
		stoppable: false,
		textareaRef: { current: null },
		submit: vi.fn(),
		stop: vi.fn(),
		setValue: vi.fn(),
		insertText: vi.fn(),
		addFiles,
		removeAttachment,
	};
	return { context, addFiles, removeAttachment };
}

function provide(context: ComposerContext) {
	return new Map<symbol, ComposerContext>([[COMPOSER_CONTEXT_KEY, context]]);
}

function chips(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(".ft-composer-attachment"));
}

function names(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll(".ft-composer-attachment-name")).map(
		(node) => node.textContent ?? ""
	);
}

function addButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button.ft-composer-attach") as HTMLButtonElement;
}

function fileInput(container: HTMLElement): HTMLInputElement {
	return container.querySelector('input[type="file"]') as HTMLInputElement;
}

function removeButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button.ft-composer-attachment-remove") as HTMLButtonElement;
}

function bar(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-composer-attachment-bar");
}

function sizeText(container: HTMLElement): string {
	return container.querySelector(".ft-composer-attachment-size")?.textContent ?? "";
}

/**
 * Watch what the component writes to `input.value` without letting jsdom's own
 * file-input semantics answer for it.
 */
function watchValue(input: HTMLInputElement): string[] {
	const written: string[] = [];
	Object.defineProperty(input, "value", {
		configurable: true,
		get: () => "C:\\fakepath\\one.png",
		set: (next: string) => written.push(next),
	});
	return written;
}

describe("ComposerAttachments", () => {
	afterEach(cleanup);

	it("renders a chip per attachment the composer is carrying, in order", () => {
		const { context } = fakeComposer({
			attachments: [
				{ id: "a1", name: "notes.pdf", size: 2048 },
				{ id: "a2", name: "shot.png", size: 1024 },
			],
		});
		const { container } = render(ComposerAttachments, { context: provide(context) });

		expect(chips(container)).toHaveLength(2);
		expect(names(container)).toEqual(["notes.pdf", "shot.png"]);
	});

	it("survives two attachments arriving under the same id", () => {
		const error = vi.spyOn(console, "error").mockImplementation(() => {});
		const { context } = fakeComposer({
			attachments: [
				{ id: "dup", name: "first.png" },
				{ id: "dup", name: "second.png" },
			],
		});

		const { container } = render(ComposerAttachments, { context: provide(context) });

		expect(names(container)).toEqual(["first.png", "second.png"]);
		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it("keeps its line inside a composer with nothing attached yet", () => {
		const { context } = fakeComposer();
		const { container } = render(ComposerAttachments, { context: provide(context) });

		expect(chips(container)).toHaveLength(0);
		expect(addButton(container)).not.toBeNull();
	});

	it("renders nothing at all outside a composer", () => {
		const { container } = render(ComposerAttachments, {});

		expect(container.querySelector(".ft-composer-attachments")).toBeNull();
		expect(container.textContent).toBe("");
	});

	it("names the add button, by default and on request", async () => {
		const { context } = fakeComposer();
		const { container, rerender } = render(ComposerAttachments, { context: provide(context) });

		expect(addButton(container).getAttribute("aria-label")).toBe("Attach files");
		expect(addButton(container).getAttribute("title")).toBe("Attach files");
		// Inside a form, so it must say it is not the submit button.
		expect(addButton(container).getAttribute("type")).toBe("button");

		await rerender({ addLabel: "Add a file" });
		expect(addButton(container).getAttribute("aria-label")).toBe("Add a file");
	});

	it("carries accept and multiple through to the hidden picker", async () => {
		const { context } = fakeComposer();
		const { container, rerender } = render(ComposerAttachments, { context: provide(context) });

		// Out of the tab order and out of the accessibility tree: the button names it.
		expect(fileInput(container).getAttribute("tabindex")).toBe("-1");
		expect(fileInput(container).getAttribute("aria-hidden")).toBe("true");
		expect(fileInput(container).multiple).toBe(true);
		expect(fileInput(container).hasAttribute("accept")).toBe(false);

		await rerender({ accept: "image/*", multiple: false });
		expect(fileInput(container).getAttribute("accept")).toBe("image/*");
		expect(fileInput(container).multiple).toBe(false);
	});

	it("opens the picker from the add button", async () => {
		const { context } = fakeComposer();
		const { container } = render(ComposerAttachments, { context: provide(context) });
		const opened = vi.spyOn(fileInput(container), "click").mockImplementation(() => {});

		await fireEvent.click(addButton(container));

		expect(opened).toHaveBeenCalledTimes(1);
	});

	it("hands the picked files to the composer and clears the input", async () => {
		const { context, addFiles } = fakeComposer();
		const { container } = render(ComposerAttachments, { context: provide(context) });
		const input = fileInput(container);
		const written = watchValue(input);
		const files = [new File(["a"], "one.png"), new File(["b"], "two.png")];

		await fireEvent.change(input, { target: { files } });

		expect(addFiles).toHaveBeenCalledTimes(1);
		expect(addFiles.mock.calls[0][0]).toEqual(files);
		// Cleared, or re-picking the same file would fire no second change event.
		expect(written).toEqual([""]);
	});

	it("stays quiet when a pick is cancelled, and still clears the input", async () => {
		const { context, addFiles } = fakeComposer();
		const { container } = render(ComposerAttachments, { context: provide(context) });
		const input = fileInput(container);
		const written = watchValue(input);

		await fireEvent.change(input, { target: { files: [] } });

		expect(addFiles).not.toHaveBeenCalled();
		expect(written).toEqual([""]);
	});

	it("goes flat while the composer is disabled", () => {
		const { context } = fakeComposer({ disabled: true });
		const { container } = render(ComposerAttachments, { context: provide(context) });

		expect(addButton(container).disabled).toBe(true);
		expect(fileInput(container).disabled).toBe(true);
	});

	it("lets children replace the chips while keeping the picker wiring", () => {
		const { context } = fakeComposer({ attachments: [{ id: "a1", name: "notes.pdf" }] });
		const { container } = render(ComposerAttachments, {
			props: { children: snippet("<span data-testid='own'>own chips</span>") },
			context: provide(context),
		});

		expect(chips(container)).toHaveLength(0);
		expect(container.querySelector("[data-testid='own']")?.textContent).toBe("own chips");
		expect(addButton(container)).not.toBeNull();
		expect(fileInput(container)).not.toBeNull();
	});

	it("merges custom classes onto the row", () => {
		const { context } = fakeComposer();
		const { container } = render(ComposerAttachments, {
			props: { class: "mb-2" },
			context: provide(context),
		});
		const row = container.querySelector(".ft-composer-attachments") as HTMLElement;

		expect(row.className).toContain("mb-2");
		expect(row.className).toContain("flex-wrap");
	});
});

describe("ComposerAttachment", () => {
	afterEach(cleanup);

	it("names, sizes and file-icons a plain chip", () => {
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf", size: 1536 } },
		});

		expect(names(container)).toEqual(["notes.pdf"]);
		expect(container.querySelector(".ft-composer-attachment-name")?.getAttribute("title")).toBe(
			"notes.pdf"
		);
		expect(sizeText(container)).toBe("1.5 KB");
		expect(container.querySelector("img")).toBeNull();
	});

	it("shows the thumbnail instead of the icon once a preview exists", () => {
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "shot.png", previewUrl: "blob:preview" } },
		});
		const thumb = container.querySelector("img") as HTMLImageElement;

		expect(thumb.getAttribute("src")).toBe("blob:preview");
		// Decorative: the file name beside it already says which file this is.
		expect(thumb.getAttribute("alt")).toBe("");
		// Only the remove button's cross is left.
		expect(container.querySelectorAll("svg")).toHaveLength(1);
	});

	it("reports an upload in progress, in words and as a bar", () => {
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "clip.mov", status: "uploading", progress: 0.6 } },
		});
		const chip = chips(container)[0];
		const meter = container.querySelector('[role="progressbar"]') as HTMLElement;

		expect(chip.getAttribute("aria-busy")).toBe("true");
		expect(chip.getAttribute("data-status")).toBe("uploading");
		expect(meter.getAttribute("aria-valuenow")).toBe("60");
		expect(meter.getAttribute("aria-label")).toBe("Uploading clip.mov");
		expect(bar(container)?.style.width).toBe("60%");
	});

	it("pins the bar inside its track whatever the progress claims", async () => {
		const { container, rerender } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "clip.mov", status: "uploading", progress: 1.8 } },
		});
		expect(bar(container)?.style.width).toBe("100%");

		await rerender({
			attachment: { id: "a1", name: "clip.mov", status: "uploading", progress: -2 },
		});
		expect(bar(container)?.style.width).toBe("0%");

		await rerender({ attachment: { id: "a1", name: "clip.mov", status: "uploading" } });
		expect(bar(container)?.style.width).toBe("0%");
	});

	it("tints a failed upload and says so out loud", () => {
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf", status: "error" } },
		});
		const chip = chips(container)[0];

		expect(chip.className).toContain("ft-failed");
		expect(chip.getAttribute("data-status")).toBe("error");
		expect(container.querySelector(".sr-only")?.textContent).toBe("Upload failed");
		expect(chip.hasAttribute("aria-busy")).toBe(false);
		expect(container.querySelector('[role="progressbar"]')).toBeNull();
	});

	it("drops the bar and the busy flag once the upload is done", () => {
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf", status: "done", progress: 1 } },
		});
		const chip = chips(container)[0];

		expect(chip.hasAttribute("aria-busy")).toBe(false);
		expect(chip.className).not.toContain("ft-failed");
		expect(container.querySelector('[role="progressbar"]')).toBeNull();
	});

	it("removes itself through the composer, by id", async () => {
		const { context, removeAttachment } = fakeComposer();
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf" } },
			context: provide(context),
		});

		expect(removeButton(container).getAttribute("aria-label")).toBe("Remove notes.pdf");
		expect(removeButton(container).getAttribute("type")).toBe("button");

		await fireEvent.click(removeButton(container));
		expect(removeAttachment).toHaveBeenCalledTimes(1);
		expect(removeAttachment).toHaveBeenCalledWith("a1");
	});

	it("hands removal to onRemove instead, when there is one", async () => {
		const onRemove = vi.fn();
		const { context, removeAttachment } = fakeComposer();
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf" }, onRemove },
			context: provide(context),
		});

		await fireEvent.click(removeButton(container));

		expect(onRemove).toHaveBeenCalledWith("a1");
		expect(removeAttachment).not.toHaveBeenCalled();
	});

	it("cannot be removed while the composer is disabled", () => {
		const { context } = fakeComposer({ disabled: true });
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf" } },
			context: provide(context),
		});

		expect(removeButton(container).disabled).toBe(true);
	});

	it("renders standalone, with the cross inert until something can answer it", async () => {
		const alone = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf", size: 10 } },
		});

		expect(names(alone.container)).toEqual(["notes.pdf"]);
		expect(sizeText(alone.container)).toBe("10 B");
		expect(removeButton(alone.container).disabled).toBe(true);
		await expect(fireEvent.click(removeButton(alone.container))).resolves.not.toThrow();
		cleanup();

		const onRemove = vi.fn();
		const handled = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf" }, onRemove },
		});
		expect(removeButton(handled.container).disabled).toBe(false);
		await fireEvent.click(removeButton(handled.container));
		expect(onRemove).toHaveBeenCalledWith("a1");
	});

	it("merges custom classes onto the chip", () => {
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf" }, class: "border-dashed" },
		});

		expect(chips(container)[0].className).toContain("border-dashed");
		expect(chips(container)[0].className).toContain("items-center");
	});

	it("formats sizes down to the byte and up to the megabyte", () => {
		const table: Array<[number | undefined, string]> = [
			[undefined, ""],
			[Number.NaN, ""],
			[-1, ""],
			[0, "0 B"],
			[512, "512 B"],
			[1023, "1023 B"],
			[1024, "1 KB"],
			[1536, "1.5 KB"],
			[1024 * 1024, "1 MB"],
			[2.5 * 1024 * 1024, "2.5 MB"],
			// Past the last unit the number keeps growing rather than inventing one.
			[1024 * 1024 * 1024, "1024 MB"],
		];

		for (const [size, expected] of table) {
			const { container } = render(ComposerAttachment, {
				props: { attachment: { id: "a1", name: "notes.pdf", size } },
			});
			expect(sizeText(container), `${size} bytes`).toBe(expected);
			cleanup();
		}
	});
});

describe("ComposerAttachments inside a real Composer", () => {
	afterEach(cleanup);

	it("lists the root's attachments and drops the one it removes", async () => {
		let context: ComposerContext | undefined;
		const root = render(Harness, {
			props: {
				initialAttachments: [
					{ id: "a1", name: "notes.pdf", size: 2048 },
					{ id: "a2", name: "shot.png" },
				],
				onContext: (next: ComposerContext | undefined) => (context = next),
			},
		});
		const { container } = render(ComposerAttachments, {
			context: provide(context as ComposerContext),
		});

		expect(names(container)).toEqual(["notes.pdf", "shot.png"]);

		await fireEvent.click(removeButton(container));
		await tick();

		// The root owns the list: the chip goes because the attachment did.
		expect(names(container)).toEqual(["shot.png"]);
		expect(root.container.querySelector('[data-testid="bound-attachments"]')?.textContent).toBe(
			"1"
		);
	});
});
