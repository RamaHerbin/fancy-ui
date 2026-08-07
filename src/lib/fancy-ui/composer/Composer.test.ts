import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Composer from "./Composer.svelte";
import ComposerInput from "./ComposerInput.svelte";
import ComposerSubmit from "./ComposerSubmit.svelte";
import Harness from "./ComposerHarness.test.svelte";
import type { ComposerContext } from "./types.js";
import type { AttachmentData } from "../_internals/ai-types.js";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function form(container: HTMLElement): HTMLFormElement {
	return container.querySelector("form") as HTMLFormElement;
}

function textarea(container: HTMLElement): HTMLTextAreaElement {
	return container.querySelector("textarea") as HTMLTextAreaElement;
}

function sendButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button.ft-composer-submit") as HTMLButtonElement;
}

function readout(container: HTMLElement, id: string): string {
	return (container.querySelector(`[data-testid="${id}"]`) as HTMLElement).textContent ?? "";
}

/** Two ticks: one for the state to reach the DOM, one for the caret restore that waits on it. */
async function settle() {
	await tick();
	await tick();
}

/** Type into the composer the way a person would, through the real input handler. */
async function type(container: HTMLElement, text: string) {
	const el = textarea(container);
	await fireEvent.input(el, { target: { value: text } });
	el.setSelectionRange(text.length, text.length);
}

interface HarnessOptions {
	initialValue?: string;
	initialAttachments?: AttachmentData[];
	disabled?: boolean;
	streaming?: boolean;
	placeholder?: string;
	maxRows?: number;
	autoAttach?: boolean;
	onSubmit?: (payload: { text: string; attachments: AttachmentData[] }) => void;
	onStop?: () => void;
	onAttach?: (files: File[]) => void;
}

/** Mount the rig and hand back its container plus the context its parts see. */
function mount(props: HarnessOptions = {}) {
	let context: ComposerContext | undefined;
	const { container } = render(Harness, {
		props: { ...props, onContext: (next: ComposerContext | undefined) => (context = next) },
	});
	return { container, context: context as ComposerContext };
}

describe("Composer", () => {
	afterEach(cleanup);

	it("is a form carrying the composer chrome", () => {
		const { container } = render(Composer, {});
		expect(form(container).className).toContain("ft-composer");
		expect(form(container).className).toContain("border");
	});

	it("composes an input and a send button by default", () => {
		const { container } = render(Composer, { props: { placeholder: "Ask anything" } });
		expect(textarea(container).getAttribute("placeholder")).toBe("Ask anything");
		expect(sendButton(container).getAttribute("aria-label")).toBe("Send");
	});

	it("hands the composition over to children, placeholder included", () => {
		const { container } = render(Composer, {
			props: { placeholder: "Ignored", children: snippet("<p>Custom</p>") },
		});
		expect(container.querySelector("p")?.textContent).toBe("Custom");
		expect(container.querySelector("textarea")).toBeNull();
	});

	it("renders the accessory as an overlay on top of the composer", () => {
		const { container } = render(Composer, { props: { accessory: snippet("<p>Voice</p>") } });
		const overlay = container.querySelector(".ft-composer-accessory") as HTMLElement;
		expect(overlay.className).toContain("absolute");
		expect(overlay.textContent).toBe("Voice");
	});

	it("keeps the submit event to itself instead of letting the page navigate", () => {
		const { container } = mount({ initialValue: "hi" });
		const event = new Event("submit", { bubbles: true, cancelable: true });
		form(container).dispatchEvent(event);
		expect(event.defaultPrevented).toBe(true);
	});

	it("submits the trimmed draft and then clears it", async () => {
		const onSubmit = vi.fn();
		const { container } = mount({ initialValue: "  hello there  ", onSubmit });

		await fireEvent.submit(form(container));

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0]).toEqual({ text: "hello there", attachments: [] });
		expect(readout(container, "bound-value")).toBe("");
		expect(textarea(container).value).toBe("");
	});

	it("refuses an empty and a whitespace-only draft", async () => {
		const onSubmit = vi.fn();
		const { container } = mount({ onSubmit });

		await fireEvent.submit(form(container));
		expect(onSubmit).not.toHaveBeenCalled();

		await type(container, "   \n  ");
		await fireEvent.submit(form(container));
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("sends an attachment-only draft, and leaves the attachments to the consumer", async () => {
		const onSubmit = vi.fn();
		const attachment: AttachmentData = { id: "a1", name: "notes.pdf" };
		const { container } = mount({ initialAttachments: [attachment], onSubmit });

		await fireEvent.submit(form(container));

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const payload = onSubmit.mock.calls[0][0] as { text: string; attachments: AttachmentData[] };
		expect(payload.text).toBe("");
		expect(payload.attachments.map((entry) => entry.id)).toEqual(["a1"]);
		// Cleared text, untouched attachments: only the consumer knows whether the
		// upload it started is still in flight.
		expect(readout(container, "bound-attachments")).toBe("1");
	});

	it("hands out a copy of the attachments rather than the live list", async () => {
		const onSubmit = vi.fn();
		const { container, context } = mount({
			initialAttachments: [{ id: "a1", name: "notes.pdf" }],
			onSubmit,
		});

		await fireEvent.submit(form(container));
		const payload = onSubmit.mock.calls[0][0] as { attachments: AttachmentData[] };
		context.removeAttachment("a1");
		await tick();

		expect(readout(container, "bound-attachments")).toBe("0");
		expect(payload.attachments).toHaveLength(1);
	});

	it("sends nothing while disabled", async () => {
		const onSubmit = vi.fn();
		const { container, context } = mount({ initialValue: "hello", disabled: true, onSubmit });

		await fireEvent.submit(form(container));
		context.submit();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("sends nothing while streaming — that is what stop is for", async () => {
		const onSubmit = vi.fn();
		const { container, context } = mount({ initialValue: "hello", streaming: true, onSubmit });

		await fireEvent.submit(form(container));
		context.submit();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("only stops while streaming", () => {
		const onStop = vi.fn();
		const idle = mount({ initialValue: "hello", onStop });
		idle.context.stop();
		expect(onStop).not.toHaveBeenCalled();
		cleanup();

		const busy = mount({ initialValue: "hello", streaming: true, onStop });
		busy.context.stop();
		expect(onStop).toHaveBeenCalledTimes(1);
	});

	it("publishes its state and commands through the context", async () => {
		const { container, context } = mount({ streaming: true, initialValue: "draft" });

		expect(context).toBeDefined();
		expect(readout(container, "context-value")).toBe("draft");
		expect(readout(container, "context-streaming")).toBe("yes");
		expect(readout(container, "context-disabled")).toBe("no");
		expect(readout(container, "context-attachments")).toBe("0");

		context.setValue("rewritten");
		await tick();
		expect(readout(container, "context-value")).toBe("rewritten");
		expect(readout(container, "bound-value")).toBe("rewritten");
		expect(textarea(container).value).toBe("rewritten");
	});

	it("writes the draft back through the bindable prop as it is typed", async () => {
		const { container } = mount({});
		await type(container, "bound both ways");
		expect(readout(container, "bound-value")).toBe("bound both ways");
	});

	it("forwards attached files to the consumer and drops attachments by id", async () => {
		const onAttach = vi.fn();
		const files = [new File(["x"], "one.png"), new File(["y"], "two.png")];
		const { container, context } = mount({ autoAttach: true, onAttach });

		context.addFiles(files);
		await tick();
		expect(onAttach).toHaveBeenCalledTimes(1);
		expect(onAttach.mock.calls[0][0]).toEqual(files);
		expect(readout(container, "bound-attachments")).toBe("2");

		context.removeAttachment("one.png#0");
		await tick();
		expect(readout(container, "bound-attachments")).toBe("1");
		expect(readout(container, "context-attachments")).toBe("1");
	});

	it("attaches nothing while disabled, and ignores an empty file list", () => {
		const onAttach = vi.fn();
		const off = mount({ disabled: true, onAttach });
		off.context.addFiles([new File(["x"], "one.png")]);
		expect(onAttach).not.toHaveBeenCalled();
		cleanup();

		const on = mount({ onAttach });
		on.context.addFiles([]);
		expect(onAttach).not.toHaveBeenCalled();
	});
});

describe("Composer.insertText", () => {
	afterEach(cleanup);

	it("replaces a trigger token sitting at the start of the draft", async () => {
		const { container, context } = mount({});
		await type(container, "/he");

		context.insertText("/help", true);
		await settle();

		expect(readout(container, "bound-value")).toBe("/help ");
		expect(textarea(container).selectionStart).toBe(6);
	});

	it("replaces a trigger token mid-draft, leaving the text around it alone", async () => {
		const { container, context } = mount({});
		await type(container, "please run /dep");

		context.insertText("/deploy", true);
		await settle();

		expect(readout(container, "bound-value")).toBe("please run /deploy ");
		expect(textarea(container).selectionStart).toBe(19);
	});

	it("replaces a trigger token before the caret without disturbing what follows", async () => {
		const { container, context } = mount({});
		await type(container, "ping @jo tomorrow");
		textarea(container).setSelectionRange(8, 8);

		context.insertText("@jordan", true);
		await settle();

		// The trailing space is already there, so the completion does not add one.
		expect(readout(container, "bound-value")).toBe("ping @jordan tomorrow");
		expect(textarea(container).selectionStart).toBe(12);
	});

	it("falls back to a plain insert at the caret when no trigger token is in reach", async () => {
		const { container, context } = mount({});
		await type(container, "hello");

		context.insertText("@jordan", true);
		await settle();

		expect(readout(container, "bound-value")).toBe("hello@jordan");
		expect(textarea(container).selectionStart).toBe(12);
	});

	it("treats a word that only contains a trigger character as ordinary text", async () => {
		const { container, context } = mount({});
		await type(container, "src/li");

		context.insertText("X", true);
		await settle();

		// `src/li` is a path fragment, not a command: nothing gets swallowed.
		expect(readout(container, "bound-value")).toBe("src/liX");
	});

	it("splices at the caret, with no trailing space, when not completing a token", async () => {
		const { container, context } = mount({});
		await type(container, "ab");
		textarea(container).setSelectionRange(1, 1);

		context.insertText("-X-");
		await settle();

		expect(readout(container, "bound-value")).toBe("a-X-b");
		expect(textarea(container).selectionStart).toBe(4);
	});

	it("replaces the selection when there is one", async () => {
		const { container, context } = mount({});
		await type(container, "keep this out");
		textarea(container).setSelectionRange(5, 9);

		context.insertText("that");
		await settle();

		expect(readout(container, "bound-value")).toBe("keep that out");
		expect(textarea(container).selectionStart).toBe(9);
	});

	it("returns focus to the input with the caret after the insertion", async () => {
		const { container, context } = mount({});
		await type(container, "/he");
		textarea(container).blur();

		context.insertText("/help", true);
		await settle();

		expect(document.activeElement).toBe(textarea(container));
		expect(textarea(container).selectionEnd).toBe(6);
	});

	it("appends at the end of the draft when no input part has registered", async () => {
		const { container, context } = mount({ initialValue: "draft" });
		// Unregister the element the way an unmounting input would, then insert.
		(
			context as unknown as { textareaRef: { current: HTMLTextAreaElement | null } }
		).textareaRef.current = null;

		expect(() => context.insertText("!")).not.toThrow();
		await settle();
		expect(readout(container, "bound-value")).toBe("draft!");
	});
});

describe("ComposerInput", () => {
	afterEach(cleanup);

	it("carries its rows, placeholder and no-resize chrome", () => {
		const { container } = render(ComposerInput, {});
		expect(textarea(container).getAttribute("rows")).toBe("1");
		expect(textarea(container).getAttribute("placeholder")).toBe("Message…");
		expect(textarea(container).className).toContain("resize-none");
	});

	it("submits on Enter and adds a newline on Shift+Enter", async () => {
		const onSubmit = vi.fn();
		const { container } = mount({ initialValue: "send me", onSubmit });

		const shifted = await fireEvent.keyDown(textarea(container), { key: "Enter", shiftKey: true });
		expect(onSubmit).not.toHaveBeenCalled();
		expect(shifted).toBe(true);

		await fireEvent.keyDown(textarea(container), { key: "Enter" });
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0].text).toBe("send me");
	});

	it("leaves Enter to the IME while a composition is open", async () => {
		const onSubmit = vi.fn();
		const { container } = mount({ initialValue: "kanji", onSubmit });

		await fireEvent.keyDown(textarea(container), { key: "Enter", isComposing: true });
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("goes read-only rather than disabled while locked, keeping it focusable", async () => {
		const off = mount({ initialValue: "x", disabled: true });
		expect(textarea(off.container).readOnly).toBe(true);
		expect(textarea(off.container).disabled).toBe(false);
		expect(textarea(off.container).getAttribute("aria-disabled")).toBe("true");
		cleanup();

		const busy = mount({ initialValue: "x", streaming: true });
		expect(textarea(busy.container).readOnly).toBe(true);
		cleanup();

		const idle = mount({ initialValue: "x" });
		expect(textarea(idle.container).readOnly).toBe(false);
		expect(idle.container.querySelector("textarea[aria-disabled]")).toBeNull();
	});

	it("sizes itself to its content, between the declared rows and the ceiling", async () => {
		const { container } = mount({ maxRows: 3 });
		const el = textarea(container);

		await type(container, "one\ntwo\nthree\nfour\nfive");
		expect(el.style.height).toMatch(/^\d+(\.\d+)?px$/);
		expect(el.style.overflowY).toBeTruthy();
	});

	it("registers itself into the context so the caret arithmetic can reach it", () => {
		const { container, context } = mount({});
		expect(context.textareaRef.current).toBe(textarea(container));
	});

	it("renders inert, without throwing, outside a composer", async () => {
		const { container } = render(ComposerInput, { props: { placeholder: "Alone" } });
		expect(() => fireEvent.keyDown(textarea(container), { key: "Enter" })).not.toThrow();
		await fireEvent.input(textarea(container), { target: { value: "typed" } });
		expect(textarea(container).value).toBe("typed");
	});
});

describe("ComposerSubmit", () => {
	afterEach(cleanup);

	it("stays disabled on an empty draft and wakes up once there is text", async () => {
		const { container } = mount({});
		expect(sendButton(container).disabled).toBe(true);

		await type(container, "hi");
		expect(sendButton(container).disabled).toBe(false);

		await type(container, "   ");
		expect(sendButton(container).disabled).toBe(true);
	});

	it("wakes up for an attachment-only draft", () => {
		const { container } = mount({ initialAttachments: [{ id: "a1", name: "notes.pdf" }] });
		expect(sendButton(container).disabled).toBe(false);
	});

	it("is disabled while the composer is", () => {
		const { container } = mount({ initialValue: "hello", disabled: true });
		expect(sendButton(container).disabled).toBe(true);
	});

	it("becomes a stop button while streaming", async () => {
		const onStop = vi.fn();
		const onSubmit = vi.fn();
		const { container } = mount({ initialValue: "hello", streaming: true, onStop, onSubmit });
		const button = sendButton(container);

		expect(button.getAttribute("type")).toBe("button");
		expect(button.getAttribute("aria-label")).toBe("Stop");
		expect(button.disabled).toBe(false);

		await fireEvent.click(button);
		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("submits the form on click while idle", async () => {
		const onSubmit = vi.fn();
		const { container } = mount({ initialValue: "hello", onSubmit });
		const button = sendButton(container);

		expect(button.getAttribute("type")).toBe("submit");
		await fireEvent.click(button);
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("takes custom labels and a custom icon", () => {
		const { container } = render(ComposerSubmit, {
			props: { label: "Ask", children: snippet("<span>Go</span>") },
		});
		expect(sendButton(container).getAttribute("aria-label")).toBe("Ask");
		expect(sendButton(container).textContent?.trim()).toBe("Go");
		expect(container.querySelector("svg")).toBeNull();
	});

	it("renders as a disabled button, without throwing, outside a composer", () => {
		const { container } = render(ComposerSubmit, {});
		expect(sendButton(container).disabled).toBe(true);
		expect(sendButton(container).getAttribute("aria-label")).toBe("Send");
	});

	it("composes inside a composer without warnings", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		const { container } = mount({ initialValue: "hello" });
		await fireEvent.submit(form(container));

		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});
});
