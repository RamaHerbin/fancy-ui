import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, inject, nextTick, ref } from "vue";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import Composer from "./Composer.vue";
import ComposerAttachment from "./ComposerAttachment.vue";
import ComposerAttachments from "./ComposerAttachments.vue";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";
import type { AttachmentData } from "../../internals/ai-types.js";
import { sound } from "../../sound/sound.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Three
 * shapes changed and nothing else did:
 *
 * - The snippet prop becomes a slot, passed as a template string.
 * - The context map handed to Svelte's `render` becomes
 *   `global: { provide: { [COMPOSER_CONTEXT_KEY]: … } }`.
 * - The `.test.svelte` rig the last case uses is declared inline below: it
 *   exists in the source only because a Svelte component needs its own file.
 */

/**
 * A composer standing in for the real root.
 *
 * `inject` only answers during a child's initialisation, so the parts are
 * mounted with the context handed straight to the app through `global.provide`.
 * It keeps every assertion about the part itself rather than about a root that
 * has its own tests, and the last case in this file mounts them against a real
 * `Composer` to prove the two halves meet.
 */
function fakeComposer(
	options: { attachments?: AttachmentData[]; disabled?: boolean; sound?: boolean } = {}
) {
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
		sound: options.sound ?? false,
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
	return { global: { provide: { [COMPOSER_CONTEXT_KEY as symbol]: context } } };
}

/** The rig the source keeps in `ComposerHarness.test.svelte`, inlined. */
const Probe = defineComponent({
	name: "ComposerProbe",
	props: { onContext: { type: Function, required: false } },
	setup(props) {
		const context = inject<ComposerContext | undefined>(COMPOSER_CONTEXT_KEY, undefined);
		props.onContext?.(context);
		return () => null;
	},
});

const Harness = defineComponent({
	name: "ComposerHarness",
	props: {
		initialAttachments: { type: Array, default: () => [] },
		onContext: { type: Function, required: false },
	},
	setup(props) {
		const attachments = ref<AttachmentData[]>([...(props.initialAttachments as AttachmentData[])]);
		return () => [
			h(
				Composer,
				{
					attachments: attachments.value,
					"onUpdate:attachments": (next: AttachmentData[]) => (attachments.value = next),
				},
				{ default: () => [h(Probe, { onContext: props.onContext })] }
			),
			h("output", { "data-testid": "bound-attachments" }, String(attachments.value.length)),
		];
	},
});

function chips(container: Element): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(".ft-composer-attachment"));
}

function names(container: Element): string[] {
	return Array.from(container.querySelectorAll(".ft-composer-attachment-name")).map(
		(node) => node.textContent ?? ""
	);
}

function addButton(container: Element): HTMLButtonElement {
	return container.querySelector("button.ft-composer-attach") as HTMLButtonElement;
}

function fileInput(container: Element): HTMLInputElement {
	return container.querySelector('input[type="file"]') as HTMLInputElement;
}

function removeButton(container: Element): HTMLButtonElement {
	return container.querySelector("button.ft-composer-attachment-remove") as HTMLButtonElement;
}

function bar(container: Element): HTMLElement | null {
	return container.querySelector(".ft-composer-attachment-bar");
}

function sizeText(container: Element): string {
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
		const { container } = render(ComposerAttachments, provide(context));

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

		const { container } = render(ComposerAttachments, provide(context));

		expect(names(container)).toEqual(["first.png", "second.png"]);
		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it("keeps its line inside a composer with nothing attached yet", () => {
		const { context } = fakeComposer();
		const { container } = render(ComposerAttachments, provide(context));

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
		const { container, rerender } = render(ComposerAttachments, provide(context));

		expect(addButton(container).getAttribute("aria-label")).toBe("Attach files");
		expect(addButton(container).getAttribute("title")).toBe("Attach files");
		// Inside a form, so it must say it is not the submit button.
		expect(addButton(container).getAttribute("type")).toBe("button");

		await rerender({ addLabel: "Add a file" });
		expect(addButton(container).getAttribute("aria-label")).toBe("Add a file");
	});

	it("carries accept and multiple through to the hidden picker", async () => {
		const { context } = fakeComposer();
		const { container, rerender } = render(ComposerAttachments, provide(context));

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
		const { container } = render(ComposerAttachments, provide(context));
		const opened = vi.spyOn(fileInput(container), "click").mockImplementation(() => {});

		await fireEvent.click(addButton(container));

		expect(opened).toHaveBeenCalledTimes(1);
	});

	it("hands the picked files to the composer and clears the input", async () => {
		const { context, addFiles } = fakeComposer();
		const { container } = render(ComposerAttachments, provide(context));
		const input = fileInput(container);
		const written = watchValue(input);
		const files = [new File(["a"], "one.png"), new File(["b"], "two.png")];

		await fireEvent.change(input, { target: { files } });

		expect(addFiles).toHaveBeenCalledTimes(1);
		expect(addFiles.mock.calls[0]![0]).toEqual(files);
		// Cleared, or re-picking the same file would fire no second change event.
		expect(written).toEqual([""]);
	});

	it("stays quiet when a pick is cancelled, and still clears the input", async () => {
		const { context, addFiles } = fakeComposer();
		const { container } = render(ComposerAttachments, provide(context));
		const input = fileInput(container);
		const written = watchValue(input);

		await fireEvent.change(input, { target: { files: [] } });

		expect(addFiles).not.toHaveBeenCalled();
		expect(written).toEqual([""]);
	});

	it("goes flat while the composer is disabled", () => {
		const { context } = fakeComposer({ disabled: true });
		const { container } = render(ComposerAttachments, provide(context));

		expect(addButton(container).disabled).toBe(true);
		expect(fileInput(container).disabled).toBe(true);
	});

	it("lets children replace the chips while keeping the picker wiring", () => {
		const { context } = fakeComposer({ attachments: [{ id: "a1", name: "notes.pdf" }] });
		const { container } = render(ComposerAttachments, {
			slots: { default: "<span data-testid='own'>own chips</span>" },
			...provide(context),
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
			...provide(context),
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
		const chip = chips(container)[0]!;
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
		const chip = chips(container)[0]!;

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
		const chip = chips(container)[0]!;

		expect(chip.hasAttribute("aria-busy")).toBe(false);
		expect(chip.className).not.toContain("ft-failed");
		expect(container.querySelector('[role="progressbar"]')).toBeNull();
	});

	it("removes itself through the composer, by id", async () => {
		const { context, removeAttachment } = fakeComposer();
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf" } },
			...provide(context),
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
			...provide(context),
		});

		await fireEvent.click(removeButton(container));

		expect(onRemove).toHaveBeenCalledWith("a1");
		expect(removeAttachment).not.toHaveBeenCalled();
	});

	it("cannot be removed while the composer is disabled", () => {
		const { context } = fakeComposer({ disabled: true });
		const { container } = render(ComposerAttachment, {
			props: { attachment: { id: "a1", name: "notes.pdf" } },
			...provide(context),
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

		expect(chips(container)[0]!.className).toContain("border-dashed");
		expect(chips(container)[0]!.className).toContain("items-center");
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

	// `useSoundCue` forwards its optional options argument to the singleton, so
	// every cue lands as `(cue, undefined)` where the source called
	// `soundFx.play(cue)`. The first argument is the assertion that matters; the
	// sibling suites in this package spell it the same way.
	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays the press cue exactly once when a chip is removed, with sound enabled", async () => {
			const { context } = fakeComposer({ sound: true });
			const { container } = render(ComposerAttachment, {
				props: { attachment: { id: "a1", name: "notes.pdf" } },
				...provide(context),
			});

			await fireEvent.click(removeButton(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});

		it("plays nothing by default, even when the composer removes it", async () => {
			const { context } = fakeComposer();
			const { container } = render(ComposerAttachment, {
				props: { attachment: { id: "a1", name: "notes.pdf" } },
				...provide(context),
			});

			await fireEvent.click(removeButton(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled, via a synthetic dispatch", () => {
			const { context } = fakeComposer({ disabled: true, sound: true });
			const { container } = render(ComposerAttachment, {
				props: { attachment: { id: "a1", name: "notes.pdf" } },
				...provide(context),
			});

			// A synthetic dispatch bypasses jsdom's own disabled handling, proving
			// the guard lives inside `remove()` itself, not merely on the attribute.
			removeButton(container).dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
		});

		it("stays silent outside a composer — attaching stays silent, and so does an inert cross", async () => {
			const { container } = render(ComposerAttachment, {
				props: { attachment: { id: "a1", name: "notes.pdf" } },
			});

			await expect(fireEvent.click(removeButton(container))).resolves.not.toThrow();

			expect(play).not.toHaveBeenCalled();
		});
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
		const { container } = render(ComposerAttachments, provide(context as ComposerContext));

		expect(names(container)).toEqual(["notes.pdf", "shot.png"]);

		await fireEvent.click(removeButton(container));
		await nextTick();

		// The root owns the list: the chip goes because the attachment did.
		expect(names(container)).toEqual(["shot.png"]);
		expect(root.container.querySelector('[data-testid="bound-attachments"]')?.textContent).toBe(
			"1"
		);
	});
});
