import { useState } from "react";
import type { ReactNode } from "react";
import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";

import type {
	AttachmentData,
	CommandItemData,
	ModelOptionData,
} from "../../internals/ai-types.js";
import { findTriggerToken, measureCaretRect } from "./caret.js";
import type { TriggerToken } from "./caret.js";
import { Composer } from "./Composer.js";
import { ComposerAttachment } from "./ComposerAttachment.js";
import { ComposerAttachments } from "./ComposerAttachments.js";
import { ComposerCommandMenu } from "./ComposerCommandMenu.js";
import type { ComposerCommandMenuProps } from "./ComposerCommandMenu.js";
import { ComposerHarness } from "./ComposerHarness.js";
import type { ComposerHarnessProps } from "./ComposerHarness.js";
import { ComposerInput } from "./ComposerInput.js";
import { ComposerModelPicker } from "./ComposerModelPicker.js";
import { ComposerSubmit } from "./ComposerSubmit.js";
import { ComposerToolbar } from "./ComposerToolbar.js";
import { IntegrationHarness, MODELS as INTEGRATION_MODELS } from "./IntegrationHarness.js";
import { COMPOSER_CONTEXT_KEY } from "./types.js";
import type { ComposerContext } from "./types.js";

// =============================================================================
// Shared helpers
// =============================================================================

/**
 * Writes a textarea's value through the PROTOTYPE setter, stepping around the
 * value tracker React installs on the instance. Without it React compares the
 * tracked value with the DOM value, finds them equal, and never dispatches the
 * change — which is the React counterpart of the Svelte suites' plain
 * `fireEvent.input(el, { target: { value } })`.
 */
const nativeTextareaValue = Object.getOwnPropertyDescriptor(
	HTMLTextAreaElement.prototype,
	"value"
)?.set as (this: HTMLTextAreaElement, value: string) => void;

function setNativeValue(el: HTMLTextAreaElement, text: string) {
	nativeTextareaValue.call(el, text);
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

function chips(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll<HTMLElement>(".ft-composer-attachment"));
}

function names(container: HTMLElement): string[] {
	return Array.from(container.querySelectorAll(".ft-composer-attachment-name")).map(
		(node) => node.textContent ?? ""
	);
}

/** Flush the commit an out-of-band command scheduled, plus the effects it woke. */
async function settle() {
	await act(async () => {});
}

/** Run a context command the way a consumer would, inside React's own batch. */
function run(fn: () => void) {
	act(() => {
		fn();
	});
}

/** The context the parts read, handed to a part mounted on its own. */
function Provide({ context, children }: { context: ComposerContext; children: ReactNode }) {
	return <COMPOSER_CONTEXT_KEY.Provider value={context}>{children}</COMPOSER_CONTEXT_KEY.Provider>;
}

// =============================================================================
// caret.ts
// =============================================================================

/** `|` marks the caret in the case names — it is not part of the value. */
const CASES: Array<[name: string, value: string, caret: number, expected: TriggerToken | null]> = [
	["opens the draft: /de|", "/de", 3, { start: 0, query: "de" }],
	["follows a space: run /de|", "run /de", 7, { start: 4, query: "de" }],
	["follows a newline: one\\n/de|", "one\n/de", 7, { start: 4, query: "de" }],
	["is still empty: /|", "/", 1, { start: 0, query: "" }],
	["stops at the caret, not at the word end: /de|ploy", "/deploy", 3, { start: 0, query: "de" }],
	["sits mid-word: src/li|", "src/li", 6, null],
	["sits inside a word: a/b|", "a/b", 3, null],
	["has the caret before it: |/de", "/de", 0, null],
	["has the caret on its trigger: run |/de", "run /de", 4, null],
	["is a plain word: hello|", "hello", 5, null],
	["is closed by a space: /de |", "/de ", 4, null],
	["is another trigger's: /help @jo|", "/help @jo", 9, null],
	["is empty: |", "", 0, null],
	["is whitespace: ␣␣|", "  ", 2, null],
];

describe("findTriggerToken", () => {
	it.each(CASES)("returns %s", (_name, value, caret, expected) => {
		expect(findTriggerToken(value, caret, "/")).toEqual(expected);
	});

	it("reads a mention trigger by the same rules", () => {
		expect(findTriggerToken("ping @jo", 8, "@")).toEqual({ start: 5, query: "jo" });
		expect(findTriggerToken("ping @jo", 8, "/")).toBeNull();
		expect(findTriggerToken("mail@example", 12, "@")).toBeNull();
	});

	it("takes a multi-character trigger whole", () => {
		expect(findTriggerToken("::sm", 4, "::")).toEqual({ start: 0, query: "sm" });
		// Only half of it typed so far: not a token yet.
		expect(findTriggerToken(":", 1, "::")).toBeNull();
	});

	it("refuses an empty trigger, which every position would match", () => {
		expect(findTriggerToken("/de", 3, "")).toBeNull();
		expect(findTriggerToken("", 0, "")).toBeNull();
	});

	it("clamps a caret that falls outside the value", () => {
		expect(findTriggerToken("/de", 99, "/")).toEqual({ start: 0, query: "de" });
		expect(findTriggerToken("/de", -5, "/")).toBeNull();
	});

	it("ignores everything after the caret, token or not", () => {
		expect(findTriggerToken("/de rest of the sentence", 3, "/")).toEqual({ start: 0, query: "de" });
	});
});

describe("measureCaretRect", () => {
	const mounted: HTMLTextAreaElement[] = [];

	afterEach(() => {
		while (mounted.length > 0) mounted.pop()?.remove();
	});

	function makeTextarea(value: string): HTMLTextAreaElement {
		const el = document.createElement("textarea");
		el.value = value;
		document.body.appendChild(el);
		mounted.push(el);
		return el;
	}

	// jsdom lays nothing out, so the offsets are zero; what is worth pinning down
	// is the shape, the line height fallback, and the fact that nothing throws.
	it("returns a zero-width rect one line tall", () => {
		const rect = measureCaretRect(makeTextarea("hello world"), 6);
		expect(Object.keys(rect).sort()).toEqual(["height", "width", "x", "y"]);
		expect(Number.isFinite(rect.x)).toBe(true);
		expect(Number.isFinite(rect.y)).toBe(true);
		expect(rect.width).toBe(0);
		expect(rect.height).toBeGreaterThan(0);
	});

	it("leaves no mirror behind in the document", () => {
		const el = makeTextarea("hello");
		const before = document.body.childElementCount;
		measureCaretRect(el, 3);
		measureCaretRect(el, 0);
		expect(document.body.childElementCount).toBe(before);
	});

	it("clamps an index outside the value instead of throwing", () => {
		const el = makeTextarea("hi");
		expect(() => measureCaretRect(el, 999)).not.toThrow();
		expect(() => measureCaretRect(el, -20)).not.toThrow();
		expect(Number.isFinite(measureCaretRect(el, 999).y)).toBe(true);
	});

	it("measures an empty textarea, where the caret has no text to sit after", () => {
		const rect = measureCaretRect(makeTextarea(""), 0);
		expect(Number.isFinite(rect.x)).toBe(true);
		expect(rect.height).toBeGreaterThan(0);
	});
});

// =============================================================================
// Composer, ComposerInput, ComposerSubmit
// =============================================================================

/** Type into the composer the way a person would, through the real input handler. */
function type(container: HTMLElement, text: string) {
	const el = textarea(container);
	setNativeValue(el, text);
	fireEvent.input(el);
	el.setSelectionRange(text.length, text.length);
}

/** Mount the rig and hand back its container plus the context its parts see. */
function mount(props: Omit<ComposerHarnessProps, "onContext"> = {}) {
	let context: ComposerContext | undefined;
	const { container } = render(
		<ComposerHarness
			{...props}
			onContext={(next) => {
				context = next;
			}}
		/>
	);
	return { container, context: context as ComposerContext };
}

describe("Composer", () => {
	afterEach(cleanup);

	it("is a form carrying the composer chrome", () => {
		const { container } = render(<Composer />);
		expect(form(container).className).toContain("ft-composer");
		expect(form(container).className).toContain("border");
	});

	it("composes an input and a send button by default", () => {
		const { container } = render(<Composer placeholder="Ask anything" />);
		expect(textarea(container).getAttribute("placeholder")).toBe("Ask anything");
		expect(sendButton(container).getAttribute("aria-label")).toBe("Send");
	});

	it("hands the composition over to children, placeholder included", () => {
		const { container } = render(
			<Composer placeholder="Ignored">
				<p>Custom</p>
			</Composer>
		);
		expect(container.querySelector("p")?.textContent).toBe("Custom");
		expect(container.querySelector("textarea")).toBeNull();
	});

	it("renders the accessory as an overlay on top of the composer", () => {
		const { container } = render(<Composer accessory={<p>Voice</p>} />);
		const overlay = container.querySelector(".ft-composer-accessory") as HTMLElement;
		expect(overlay.className).toContain("absolute");
		expect(overlay.textContent).toBe("Voice");
	});

	it("keeps the submit event to itself instead of letting the page navigate", () => {
		const { container } = mount({ initialValue: "hi" });
		const event = new Event("submit", { bubbles: true, cancelable: true });
		run(() => {
			form(container).dispatchEvent(event);
		});
		expect(event.defaultPrevented).toBe(true);
	});

	it("submits the trimmed draft and then clears it", async () => {
		const onSubmit = vi.fn();
		const { container } = mount({ initialValue: "  hello there  ", onSubmit });

		fireEvent.submit(form(container));
		await settle();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0]![0]).toEqual({ text: "hello there", attachments: [] });
		expect(readout(container, "bound-value")).toBe("");
		expect(textarea(container).value).toBe("");
	});

	it("keeps the draft when nothing is listening for a submit", async () => {
		// Clearing here would throw away text with nowhere for it to have gone.
		const { container } = mount({ initialValue: "hello there" });

		fireEvent.submit(form(container));
		await settle();

		expect(readout(container, "bound-value")).toBe("hello there");
		expect(textarea(container).value).toBe("hello there");
	});

	it("refuses an empty and a whitespace-only draft", async () => {
		const onSubmit = vi.fn();
		const { container } = mount({ onSubmit });

		fireEvent.submit(form(container));
		expect(onSubmit).not.toHaveBeenCalled();

		type(container, "   \n  ");
		fireEvent.submit(form(container));
		await settle();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("sends an attachment-only draft, and leaves the attachments to the consumer", async () => {
		const onSubmit = vi.fn();
		const attachment: AttachmentData = { id: "a1", name: "notes.pdf" };
		const { container } = mount({ initialAttachments: [attachment], onSubmit });

		fireEvent.submit(form(container));
		await settle();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		const payload = onSubmit.mock.calls[0]![0] as { text: string; attachments: AttachmentData[] };
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

		fireEvent.submit(form(container));
		const payload = onSubmit.mock.calls[0]![0] as { attachments: AttachmentData[] };
		run(() => context.removeAttachment("a1"));
		await settle();

		expect(readout(container, "bound-attachments")).toBe("0");
		expect(payload.attachments).toHaveLength(1);
	});

	it("sends nothing while disabled", async () => {
		const onSubmit = vi.fn();
		const { container, context } = mount({ initialValue: "hello", disabled: true, onSubmit });

		fireEvent.submit(form(container));
		run(() => context.submit());
		await settle();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("sends nothing while streaming — that is what stop is for", async () => {
		const onSubmit = vi.fn();
		const { container, context } = mount({ initialValue: "hello", streaming: true, onSubmit });

		fireEvent.submit(form(container));
		run(() => context.submit());
		await settle();
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("only stops while streaming", () => {
		const onStop = vi.fn();
		const idle = mount({ initialValue: "hello", onStop });
		run(() => idle.context.stop());
		expect(onStop).not.toHaveBeenCalled();
		cleanup();

		const busy = mount({ initialValue: "hello", streaming: true, onStop });
		run(() => busy.context.stop());
		expect(onStop).toHaveBeenCalledTimes(1);
	});

	it("publishes its state and commands through the context", async () => {
		const { container, context } = mount({ streaming: true, initialValue: "draft" });

		expect(context).toBeDefined();
		expect(readout(container, "context-value")).toBe("draft");
		expect(readout(container, "context-streaming")).toBe("yes");
		expect(readout(container, "context-disabled")).toBe("no");
		expect(readout(container, "context-attachments")).toBe("0");

		run(() => context.setValue("rewritten"));
		await settle();
		expect(readout(container, "context-value")).toBe("rewritten");
		expect(readout(container, "bound-value")).toBe("rewritten");
		expect(textarea(container).value).toBe("rewritten");
	});

	it("writes the draft back through the state prop as it is typed", () => {
		const { container } = mount({});
		type(container, "bound both ways");
		expect(readout(container, "bound-value")).toBe("bound both ways");
	});

	it("forwards attached files to the consumer and drops attachments by id", async () => {
		const onAttach = vi.fn();
		const files = [new File(["x"], "one.png"), new File(["y"], "two.png")];
		const { container, context } = mount({ autoAttach: true, onAttach });

		run(() => context.addFiles(files));
		await settle();
		expect(onAttach).toHaveBeenCalledTimes(1);
		expect(onAttach.mock.calls[0]![0]).toEqual(files);
		expect(readout(container, "bound-attachments")).toBe("2");

		run(() => context.removeAttachment("one.png#0"));
		await settle();
		expect(readout(container, "bound-attachments")).toBe("1");
		expect(readout(container, "context-attachments")).toBe("1");
	});

	it("attaches nothing while disabled, and ignores an empty file list", () => {
		const onAttach = vi.fn();
		const off = mount({ disabled: true, onAttach });
		run(() => off.context.addFiles([new File(["x"], "one.png")]));
		expect(onAttach).not.toHaveBeenCalled();
		cleanup();

		const on = mount({ onAttach });
		run(() => on.context.addFiles([]));
		expect(onAttach).not.toHaveBeenCalled();
	});
});

describe("Composer.insertText", () => {
	afterEach(cleanup);

	it("replaces a trigger token sitting at the start of the draft", async () => {
		const { container, context } = mount({});
		type(container, "/he");

		run(() => context.insertText("/help", true));
		await settle();

		expect(readout(container, "bound-value")).toBe("/help ");
		expect(textarea(container).selectionStart).toBe(6);
	});

	it("replaces a trigger token mid-draft, leaving the text around it alone", async () => {
		const { container, context } = mount({});
		type(container, "please run /dep");

		run(() => context.insertText("/deploy", true));
		await settle();

		expect(readout(container, "bound-value")).toBe("please run /deploy ");
		expect(textarea(container).selectionStart).toBe(19);
	});

	it("replaces a trigger token before the caret without disturbing what follows", async () => {
		const { container, context } = mount({});
		type(container, "ping @jo tomorrow");
		textarea(container).setSelectionRange(8, 8);

		run(() => context.insertText("@jordan", true));
		await settle();

		// The trailing space is already there, so the completion does not add one.
		expect(readout(container, "bound-value")).toBe("ping @jordan tomorrow");
		expect(textarea(container).selectionStart).toBe(12);
	});

	it("falls back to a plain insert at the caret when no trigger token is in reach", async () => {
		const { container, context } = mount({});
		type(container, "hello");

		run(() => context.insertText("@jordan", true));
		await settle();

		expect(readout(container, "bound-value")).toBe("hello@jordan");
		expect(textarea(container).selectionStart).toBe(12);
	});

	it("treats a word that only contains a trigger character as ordinary text", async () => {
		const { container, context } = mount({});
		type(container, "src/li");

		run(() => context.insertText("X", true));
		await settle();

		// `src/li` is a path fragment, not a command: nothing gets swallowed.
		expect(readout(container, "bound-value")).toBe("src/liX");
	});

	it("splices at the caret, with no trailing space, when not completing a token", async () => {
		const { container, context } = mount({});
		type(container, "ab");
		textarea(container).setSelectionRange(1, 1);

		run(() => context.insertText("-X-"));
		await settle();

		expect(readout(container, "bound-value")).toBe("a-X-b");
		expect(textarea(container).selectionStart).toBe(4);
	});

	it("replaces the selection when there is one", async () => {
		const { container, context } = mount({});
		type(container, "keep this out");
		textarea(container).setSelectionRange(5, 9);

		run(() => context.insertText("that"));
		await settle();

		expect(readout(container, "bound-value")).toBe("keep that out");
		expect(textarea(container).selectionStart).toBe(9);
	});

	it("returns focus to the input with the caret after the insertion", async () => {
		const { container, context } = mount({});
		type(container, "/he");
		textarea(container).blur();

		run(() => context.insertText("/help", true));
		await settle();

		expect(document.activeElement).toBe(textarea(container));
		expect(textarea(container).selectionEnd).toBe(6);
	});

	it("appends at the end of the draft when no input part has registered", async () => {
		const { container, context } = mount({ initialValue: "draft" });
		// Unregister the element the way an unmounting input would, then insert.
		run(() => {
			(
				context as unknown as { textareaRef: { current: HTMLTextAreaElement | null } }
			).textareaRef.current = null;
		});

		expect(() => run(() => context.insertText("!"))).not.toThrow();
		await settle();
		expect(readout(container, "bound-value")).toBe("draft!");
	});
});

describe("ComposerInput", () => {
	afterEach(cleanup);

	it("carries its rows, placeholder and no-resize chrome", () => {
		const { container } = render(<ComposerInput />);
		expect(textarea(container).getAttribute("rows")).toBe("1");
		expect(textarea(container).getAttribute("placeholder")).toBe("Message…");
		expect(textarea(container).className).toContain("resize-none");
	});

	it("submits on Enter and adds a newline on Shift+Enter", async () => {
		const onSubmit = vi.fn();
		const { container } = mount({ initialValue: "send me", onSubmit });

		const shifted = fireEvent.keyDown(textarea(container), { key: "Enter", shiftKey: true });
		expect(onSubmit).not.toHaveBeenCalled();
		expect(shifted).toBe(true);

		fireEvent.keyDown(textarea(container), { key: "Enter" });
		await settle();
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0]![0].text).toBe("send me");
	});

	it("leaves Enter to the IME while a composition is open", () => {
		const onSubmit = vi.fn();
		const { container } = mount({ initialValue: "kanji", onSubmit });

		fireEvent.keyDown(textarea(container), { key: "Enter", isComposing: true });
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("goes read-only rather than disabled while locked, keeping it focusable", () => {
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

	it("sizes itself to its content, between the declared rows and the ceiling", () => {
		const { container } = mount({ maxRows: 3 });
		const el = textarea(container);

		type(container, "one\ntwo\nthree\nfour\nfive");
		expect(el.style.height).toMatch(/^\d+(\.\d+)?px$/);
		expect(el.style.overflowY).toBeTruthy();
	});

	it("registers itself into the context so the caret arithmetic can reach it", () => {
		const { container, context } = mount({});
		expect(context.textareaRef.current).toBe(textarea(container));
	});

	it("renders inert, without throwing, outside a composer", () => {
		const { container } = render(<ComposerInput placeholder="Alone" />);
		expect(() => fireEvent.keyDown(textarea(container), { key: "Enter" })).not.toThrow();
		setNativeValue(textarea(container), "typed");
		fireEvent.input(textarea(container));
		expect(textarea(container).value).toBe("typed");
	});
});

describe("ComposerSubmit", () => {
	afterEach(cleanup);

	it("stays disabled on an empty draft and wakes up once there is text", () => {
		const { container } = mount({});
		expect(sendButton(container).disabled).toBe(true);

		type(container, "hi");
		expect(sendButton(container).disabled).toBe(false);

		type(container, "   ");
		expect(sendButton(container).disabled).toBe(true);
	});

	it("wakes up for an attachment-only draft", () => {
		const { container } = mount({ initialAttachments: [{ id: "a1", name: "notes.pdf" }] });
		expect(sendButton(container).disabled).toBe(false);
	});

	it("greys out the stop control when there is no onStop behind it", () => {
		// The root always publishes a callable `stop`, so the control has to ask
		// the context whether anything is actually listening.
		const { container } = mount({ initialValue: "hello", streaming: true });
		const button = sendButton(container);

		expect(button.getAttribute("aria-label")).toBe("Stop");
		expect(button.disabled).toBe(true);
	});

	it("offers the stop control once a handler exists", () => {
		const { container } = mount({ initialValue: "hello", streaming: true, onStop: () => {} });
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

		fireEvent.click(button);
		await settle();
		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onSubmit).not.toHaveBeenCalled();
	});

	it("submits the form on click while idle", async () => {
		const onSubmit = vi.fn();
		const { container } = mount({ initialValue: "hello", onSubmit });
		const button = sendButton(container);

		expect(button.getAttribute("type")).toBe("submit");
		fireEvent.click(button);
		await settle();
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("takes custom labels and a custom icon", () => {
		const { container } = render(
			<ComposerSubmit label="Ask">
				<span>Go</span>
			</ComposerSubmit>
		);
		expect(sendButton(container).getAttribute("aria-label")).toBe("Ask");
		expect(sendButton(container).textContent?.trim()).toBe("Go");
		expect(container.querySelector("svg")).toBeNull();
	});

	it("renders as a disabled button, without throwing, outside a composer", () => {
		const { container } = render(<ComposerSubmit />);
		expect(sendButton(container).disabled).toBe(true);
		expect(sendButton(container).getAttribute("aria-label")).toBe("Send");
	});

	it("composes inside a composer without warnings", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		const { container } = mount({ initialValue: "hello" });
		fireEvent.submit(form(container));
		await settle();

		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});
});

// =============================================================================
// ComposerToolbar, ComposerModelPicker
// =============================================================================

/** Generic tiers, so the fixture says nothing about anyone's product line-up. */
const MODELS: ModelOptionData[] = [
	{ id: "mini", label: "Mini", badge: "Fast", description: "Short answers, small context." },
	{ id: "pro", label: "Pro", description: "Deeper reasoning, slower." },
	{ id: "max", label: "Max", badge: "New" },
];

/**
 * A composer root standing in for the real one.
 *
 * The picker only reads `disabled` off the context, but the object has to be a
 * whole `ComposerContext` — that is the contract a part is written against, and
 * a partial stand-in would let a part start reading something this rig does not
 * provide without the test noticing.
 */
function composerContext(disabled = false): ComposerContext {
	return {
		value: { current: "" },
		attachments: { current: [] },
		disabled,
		streaming: false,
		stoppable: false,
		textareaRef: { current: null },
		submit: () => {},
		stop: () => {},
		setValue: () => {},
		insertText: () => {},
		addFiles: () => {},
		removeAttachment: () => {},
	};
}

interface PickerProps {
	models?: ModelOptionData[];
	value?: string;
	onValueChange?: (id: string) => void;
	onChange?: (id: string) => void;
	label?: string;
	className?: string;
}

function pickerTree({ models = MODELS, ...rest }: PickerProps, context?: ComposerContext) {
	const picker = <ComposerModelPicker models={models} {...rest} />;
	return context ? <Provide context={context}>{picker}</Provide> : picker;
}

function renderPicker(props: PickerProps = {}, context?: ComposerContext) {
	return render(pickerTree(props, context));
}

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button.ft-composer-model") as HTMLButtonElement;
}

function pickerMenu(container: HTMLElement): HTMLElement | null {
	return container.querySelector('[role="listbox"]');
}

function options(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll('[role="option"]'));
}

function openPicker(container: HTMLElement) {
	fireEvent.click(trigger(container));
	return pickerMenu(container) as HTMLElement;
}

describe("ComposerToolbar", () => {
	afterEach(cleanup);

	it("lays its children out on a single row", () => {
		const { container } = render(
			<ComposerToolbar>
				<span>
					<button>Attach</button>
					<button>Send</button>
				</span>
			</ComposerToolbar>
		);
		const row = container.querySelector("div") as HTMLElement;

		expect(row.className).toContain("ft-composer-toolbar");
		expect(row.className).toContain("flex");
		expect(row.className).toContain("items-center");
		expect(row.className).toContain("gap-1");
		expect(row.querySelectorAll("button")).toHaveLength(2);
	});

	it("takes extra classes without dropping its own layout", () => {
		const { container } = render(<ComposerToolbar className="mt-2" />);
		const row = container.querySelector("div") as HTMLElement;

		expect(row.className).toContain("mt-2");
		expect(row.className).toContain("items-center");
	});

	it("renders an empty rail rather than throwing when it has nothing on it", () => {
		const { container } = render(<ComposerToolbar />);
		const row = container.querySelector("div") as HTMLElement;

		expect(row).not.toBeNull();
		expect(row.textContent?.trim()).toBe("");
	});
});

describe("ComposerModelPicker", () => {
	afterEach(cleanup);

	it("falls back to the first model, badge included", () => {
		const { container } = renderPicker();

		expect(trigger(container).textContent).toContain("Mini");
		expect(trigger(container).textContent).toContain("Fast");
		expect(trigger(container).getAttribute("aria-label")).toBe("Model: Mini");
	});

	it("shows the model named by `value`, and follows it when it changes", () => {
		const { container, rerender } = renderPicker({ value: "pro" });
		expect(trigger(container).textContent).toContain("Pro");

		rerender(pickerTree({ value: "max" }));
		expect(trigger(container).textContent).toContain("Max");
	});

	it("keeps the menu out of the DOM until it is opened, and takes it back out", () => {
		const { container } = renderPicker();
		expect(pickerMenu(container)).toBeNull();
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");

		const list = openPicker(container);
		expect(list).not.toBeNull();
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
		expect(trigger(container).getAttribute("aria-controls")).toBe(list.id);

		fireEvent.click(trigger(container));
		expect(pickerMenu(container)).toBeNull();
		expect(trigger(container).getAttribute("aria-controls")).toBeNull();
	});

	it("lists every model with its badge and its description", () => {
		const { container } = renderPicker();
		openPicker(container);
		const rows = options(container);

		expect(rows).toHaveLength(3);
		expect(rows[0]!.textContent).toContain("Mini");
		expect(rows[0]!.textContent).toContain("Fast");
		expect(rows[0]!.textContent).toContain("Short answers, small context.");
		expect(rows[2]!.textContent).toContain("New");
	});

	it("opens on the selected model, and points activedescendant at it", () => {
		const { container } = renderPicker({ value: "pro" });
		const list = openPicker(container);
		const rows = options(container);

		expect(list.getAttribute("role")).toBe("listbox");
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[1]!.id);
		expect(rows[1]!.getAttribute("aria-selected")).toBe("true");
		expect(rows[0]!.getAttribute("aria-selected")).toBe("false");
		expect(document.activeElement).toBe(list);
	});

	it("moves the active option with the arrows, wrapping at both ends", () => {
		const { container } = renderPicker();
		const list = openPicker(container);
		const rows = options(container);

		fireEvent.keyDown(list, { key: "ArrowDown" });
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[1]!.id);

		fireEvent.keyDown(list, { key: "ArrowUp" });
		fireEvent.keyDown(list, { key: "ArrowUp" });
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[2]!.id);

		fireEvent.keyDown(list, { key: "ArrowDown" });
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[0]!.id);
	});

	it("opens from the trigger's own arrow keys", () => {
		const { container } = renderPicker();

		fireEvent.keyDown(trigger(container), { key: "ArrowUp" });
		expect(pickerMenu(container)).not.toBeNull();
	});

	it("selects the active option on Enter, reporting the change and closing", () => {
		const onChange = vi.fn();
		const { container } = renderPicker({ onChange });
		const list = openPicker(container);

		fireEvent.keyDown(list, { key: "ArrowDown" });
		fireEvent.keyDown(list, { key: "Enter" });

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith("pro");
		expect(pickerMenu(container)).toBeNull();
		expect(trigger(container).textContent).toContain("Pro");
		expect(document.activeElement).toBe(trigger(container));
	});

	it("writes the pick back through the value channel", () => {
		// `onValueChange` is what `bind:value` compiles down to here: the component
		// sees a settable prop and pushes the pick through it.
		let bound = "mini";
		function Bound() {
			const [value, setValue] = useState("mini");
			return (
				<ComposerModelPicker
					models={MODELS}
					value={value}
					onValueChange={(next) => {
						bound = next;
						setValue(next);
					}}
				/>
			);
		}
		const { container } = render(<Bound />);

		openPicker(container);
		fireEvent.click(options(container)[2]!);

		expect(bound).toBe("max");
	});

	it("selects on click, and stays silent when the pick changes nothing", () => {
		const onChange = vi.fn();
		const { container } = renderPicker({ value: "pro", onChange });

		openPicker(container);
		fireEvent.click(options(container)[1]!);

		expect(pickerMenu(container)).toBeNull();
		expect(onChange).not.toHaveBeenCalled();
		expect(trigger(container).textContent).toContain("Pro");
	});

	it("closes on Escape and hands focus back to the trigger", () => {
		const { container } = renderPicker();
		const list = openPicker(container);

		fireEvent.keyDown(list, { key: "Escape" });

		expect(pickerMenu(container)).toBeNull();
		expect(document.activeElement).toBe(trigger(container));
	});

	it("steps aside on Tab, leaving focus where the browser can carry it on", () => {
		const { container } = renderPicker();
		const list = openPicker(container);

		fireEvent.keyDown(list, { key: "Tab" });

		expect(pickerMenu(container)).toBeNull();
		expect(document.activeElement).toBe(trigger(container));
	});

	it("closes on a press outside, and survives a press inside the menu", () => {
		const { container } = renderPicker();
		const list = openPicker(container);

		fireEvent.mouseDown(options(container)[1]!);
		expect(pickerMenu(container)).not.toBeNull();

		fireEvent.mouseDown(document.body);
		expect(pickerMenu(container)).toBeNull();
		// The press is already moving focus elsewhere; the picker does not fight it.
		expect(document.activeElement).not.toBe(trigger(container));
		expect(list.isConnected).toBe(false);
	});

	it("goes inert while the composer is disabled", () => {
		const { container } = renderPicker({}, composerContext(true));

		expect(trigger(container).disabled).toBe(true);
		fireEvent.keyDown(trigger(container), { key: "ArrowDown" });
		expect(pickerMenu(container)).toBeNull();
	});

	it("closes itself when the composer switches off mid-menu", () => {
		const { container, rerender } = renderPicker({}, composerContext(false));
		openPicker(container);

		rerender(pickerTree({}, composerContext(true)));

		expect(trigger(container).disabled).toBe(true);
		expect(pickerMenu(container)).toBeNull();
	});

	it("has nothing to offer, and says so, on an empty model list", () => {
		const { container } = renderPicker({ models: [], label: "Engine" });

		expect(trigger(container).disabled).toBe(true);
		expect(trigger(container).textContent).toContain("Engine");
		expect(trigger(container).getAttribute("aria-label")).toBe("Engine");
	});

	it("works on its own, outside a composer", () => {
		const { container } = renderPicker();

		expect(trigger(container).disabled).toBe(false);
		openPicker(container);
		expect(options(container)).toHaveLength(3);
	});

	it("adds one document listener while open and takes it back on close", () => {
		const add = vi.spyOn(document, "addEventListener");
		const remove = vi.spyOn(document, "removeEventListener");
		const { container } = renderPicker();

		const list = openPicker(container);
		const added = add.mock.calls.filter(([type]) => type === "mousedown");
		expect(added).toHaveLength(1);
		expect(remove.mock.calls.filter(([type]) => type === "mousedown")).toHaveLength(0);

		fireEvent.keyDown(list, { key: "Escape" });
		expect(remove.mock.calls.filter(([type]) => type === "mousedown")).toHaveLength(1);

		add.mockRestore();
		remove.mockRestore();
	});

	it("leaves no document listener behind when it is destroyed while open", () => {
		const add = vi.spyOn(document, "addEventListener");
		const remove = vi.spyOn(document, "removeEventListener");
		const { container, unmount } = renderPicker();

		openPicker(container);
		expect(add.mock.calls.filter(([type]) => type === "mousedown")).toHaveLength(1);

		unmount();

		expect(remove.mock.calls.filter(([type]) => type === "mousedown")).toHaveLength(1);
		add.mockRestore();
		remove.mockRestore();
	});

	it("mounts and opens without warnings", () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		const { container } = renderPicker({ className: "self-center" });
		const list = openPicker(container);
		fireEvent.keyDown(list, { key: "ArrowDown" });
		fireEvent.keyDown(list, { key: "Enter" });

		expect(trigger(container).className).toContain("self-center");
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});
});

// =============================================================================
// ComposerAttachments, ComposerAttachment
// =============================================================================

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
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachments />
			</Provide>
		);

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

		const { container } = render(
			<Provide context={context}>
				<ComposerAttachments />
			</Provide>
		);

		expect(names(container)).toEqual(["first.png", "second.png"]);
		expect(error).not.toHaveBeenCalled();
		error.mockRestore();
	});

	it("keeps its line inside a composer with nothing attached yet", () => {
		const { context } = fakeComposer();
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachments />
			</Provide>
		);

		expect(chips(container)).toHaveLength(0);
		expect(addButton(container)).not.toBeNull();
	});

	it("renders nothing at all outside a composer", () => {
		const { container } = render(<ComposerAttachments />);

		expect(container.querySelector(".ft-composer-attachments")).toBeNull();
		expect(container.textContent).toBe("");
	});

	it("names the add button, by default and on request", () => {
		const { context } = fakeComposer();
		const { container, rerender } = render(
			<Provide context={context}>
				<ComposerAttachments />
			</Provide>
		);

		expect(addButton(container).getAttribute("aria-label")).toBe("Attach files");
		expect(addButton(container).getAttribute("title")).toBe("Attach files");
		// Inside a form, so it must say it is not the submit button.
		expect(addButton(container).getAttribute("type")).toBe("button");

		rerender(
			<Provide context={context}>
				<ComposerAttachments addLabel="Add a file" />
			</Provide>
		);
		expect(addButton(container).getAttribute("aria-label")).toBe("Add a file");
	});

	it("carries accept and multiple through to the hidden picker", () => {
		const { context } = fakeComposer();
		const { container, rerender } = render(
			<Provide context={context}>
				<ComposerAttachments />
			</Provide>
		);

		// Out of the tab order and out of the accessibility tree: the button names it.
		expect(fileInput(container).getAttribute("tabindex")).toBe("-1");
		expect(fileInput(container).getAttribute("aria-hidden")).toBe("true");
		expect(fileInput(container).multiple).toBe(true);
		expect(fileInput(container).hasAttribute("accept")).toBe(false);

		rerender(
			<Provide context={context}>
				<ComposerAttachments accept="image/*" multiple={false} />
			</Provide>
		);
		expect(fileInput(container).getAttribute("accept")).toBe("image/*");
		expect(fileInput(container).multiple).toBe(false);
	});

	it("opens the picker from the add button", () => {
		const { context } = fakeComposer();
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachments />
			</Provide>
		);
		const opened = vi.spyOn(fileInput(container), "click").mockImplementation(() => {});

		fireEvent.click(addButton(container));

		expect(opened).toHaveBeenCalledTimes(1);
	});

	it("hands the picked files to the composer and clears the input", () => {
		const { context, addFiles } = fakeComposer();
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachments />
			</Provide>
		);
		const input = fileInput(container);
		const written = watchValue(input);
		const files = [new File(["a"], "one.png"), new File(["b"], "two.png")];

		fireEvent.change(input, { target: { files } });

		expect(addFiles).toHaveBeenCalledTimes(1);
		expect(addFiles.mock.calls[0]![0]).toEqual(files);
		// Cleared, or re-picking the same file would fire no second change event.
		expect(written).toEqual([""]);
	});

	it("stays quiet when a pick is cancelled, and still clears the input", () => {
		const { context, addFiles } = fakeComposer();
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachments />
			</Provide>
		);
		const input = fileInput(container);
		const written = watchValue(input);

		fireEvent.change(input, { target: { files: [] } });

		expect(addFiles).not.toHaveBeenCalled();
		expect(written).toEqual([""]);
	});

	it("goes flat while the composer is disabled", () => {
		const { context } = fakeComposer({ disabled: true });
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachments />
			</Provide>
		);

		expect(addButton(container).disabled).toBe(true);
		expect(fileInput(container).disabled).toBe(true);
	});

	it("lets children replace the chips while keeping the picker wiring", () => {
		const { context } = fakeComposer({ attachments: [{ id: "a1", name: "notes.pdf" }] });
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachments>
					<span data-testid="own">own chips</span>
				</ComposerAttachments>
			</Provide>
		);

		expect(chips(container)).toHaveLength(0);
		expect(container.querySelector("[data-testid='own']")?.textContent).toBe("own chips");
		expect(addButton(container)).not.toBeNull();
		expect(fileInput(container)).not.toBeNull();
	});

	it("merges custom classes onto the row", () => {
		const { context } = fakeComposer();
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachments className="mb-2" />
			</Provide>
		);
		const row = container.querySelector(".ft-composer-attachments") as HTMLElement;

		expect(row.className).toContain("mb-2");
		expect(row.className).toContain("flex-wrap");
	});
});

describe("ComposerAttachment", () => {
	afterEach(cleanup);

	it("names, sizes and file-icons a plain chip", () => {
		const { container } = render(
			<ComposerAttachment attachment={{ id: "a1", name: "notes.pdf", size: 1536 }} />
		);

		expect(names(container)).toEqual(["notes.pdf"]);
		expect(container.querySelector(".ft-composer-attachment-name")?.getAttribute("title")).toBe(
			"notes.pdf"
		);
		expect(sizeText(container)).toBe("1.5 KB");
		expect(container.querySelector("img")).toBeNull();
	});

	it("shows the thumbnail instead of the icon once a preview exists", () => {
		const { container } = render(
			<ComposerAttachment attachment={{ id: "a1", name: "shot.png", previewUrl: "blob:preview" }} />
		);
		const thumb = container.querySelector("img") as HTMLImageElement;

		expect(thumb.getAttribute("src")).toBe("blob:preview");
		// Decorative: the file name beside it already says which file this is.
		expect(thumb.getAttribute("alt")).toBe("");
		// Only the remove button's cross is left.
		expect(container.querySelectorAll("svg")).toHaveLength(1);
	});

	it("reports an upload in progress, in words and as a bar", () => {
		const { container } = render(
			<ComposerAttachment
				attachment={{ id: "a1", name: "clip.mov", status: "uploading", progress: 0.6 }}
			/>
		);
		const chip = chips(container)[0]!;
		const meter = container.querySelector('[role="progressbar"]') as HTMLElement;

		expect(chip.getAttribute("aria-busy")).toBe("true");
		expect(chip.getAttribute("data-status")).toBe("uploading");
		expect(meter.getAttribute("aria-valuenow")).toBe("60");
		expect(meter.getAttribute("aria-label")).toBe("Uploading clip.mov");
		expect(bar(container)?.style.width).toBe("60%");
	});

	it("pins the bar inside its track whatever the progress claims", () => {
		const { container, rerender } = render(
			<ComposerAttachment
				attachment={{ id: "a1", name: "clip.mov", status: "uploading", progress: 1.8 }}
			/>
		);
		expect(bar(container)?.style.width).toBe("100%");

		rerender(
			<ComposerAttachment
				attachment={{ id: "a1", name: "clip.mov", status: "uploading", progress: -2 }}
			/>
		);
		expect(bar(container)?.style.width).toBe("0%");

		rerender(
			<ComposerAttachment attachment={{ id: "a1", name: "clip.mov", status: "uploading" }} />
		);
		expect(bar(container)?.style.width).toBe("0%");
	});

	it("tints a failed upload and says so out loud", () => {
		const { container } = render(
			<ComposerAttachment attachment={{ id: "a1", name: "notes.pdf", status: "error" }} />
		);
		const chip = chips(container)[0]!;

		expect(chip.className).toContain("ft-failed");
		expect(chip.getAttribute("data-status")).toBe("error");
		expect(container.querySelector(".sr-only")?.textContent).toBe("Upload failed");
		expect(chip.hasAttribute("aria-busy")).toBe(false);
		expect(container.querySelector('[role="progressbar"]')).toBeNull();
	});

	it("drops the bar and the busy flag once the upload is done", () => {
		const { container } = render(
			<ComposerAttachment
				attachment={{ id: "a1", name: "notes.pdf", status: "done", progress: 1 }}
			/>
		);
		const chip = chips(container)[0]!;

		expect(chip.hasAttribute("aria-busy")).toBe(false);
		expect(chip.className).not.toContain("ft-failed");
		expect(container.querySelector('[role="progressbar"]')).toBeNull();
	});

	it("removes itself through the composer, by id", () => {
		const { context, removeAttachment } = fakeComposer();
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachment attachment={{ id: "a1", name: "notes.pdf" }} />
			</Provide>
		);

		expect(removeButton(container).getAttribute("aria-label")).toBe("Remove notes.pdf");
		expect(removeButton(container).getAttribute("type")).toBe("button");

		fireEvent.click(removeButton(container));
		expect(removeAttachment).toHaveBeenCalledTimes(1);
		expect(removeAttachment).toHaveBeenCalledWith("a1");
	});

	it("hands removal to onRemove instead, when there is one", () => {
		const onRemove = vi.fn();
		const { context, removeAttachment } = fakeComposer();
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachment attachment={{ id: "a1", name: "notes.pdf" }} onRemove={onRemove} />
			</Provide>
		);

		fireEvent.click(removeButton(container));

		expect(onRemove).toHaveBeenCalledWith("a1");
		expect(removeAttachment).not.toHaveBeenCalled();
	});

	it("cannot be removed while the composer is disabled", () => {
		const { context } = fakeComposer({ disabled: true });
		const { container } = render(
			<Provide context={context}>
				<ComposerAttachment attachment={{ id: "a1", name: "notes.pdf" }} />
			</Provide>
		);

		expect(removeButton(container).disabled).toBe(true);
	});

	it("renders standalone, with the cross inert until something can answer it", () => {
		const alone = render(<ComposerAttachment attachment={{ id: "a1", name: "notes.pdf", size: 10 }} />);

		expect(names(alone.container)).toEqual(["notes.pdf"]);
		expect(sizeText(alone.container)).toBe("10 B");
		expect(removeButton(alone.container).disabled).toBe(true);
		expect(() => fireEvent.click(removeButton(alone.container))).not.toThrow();
		cleanup();

		const onRemove = vi.fn();
		const handled = render(
			<ComposerAttachment attachment={{ id: "a1", name: "notes.pdf" }} onRemove={onRemove} />
		);
		expect(removeButton(handled.container).disabled).toBe(false);
		fireEvent.click(removeButton(handled.container));
		expect(onRemove).toHaveBeenCalledWith("a1");
	});

	it("merges custom classes onto the chip", () => {
		const { container } = render(
			<ComposerAttachment
				attachment={{ id: "a1", name: "notes.pdf" }}
				className="border-dashed"
			/>
		);

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
			const { container } = render(
				<ComposerAttachment attachment={{ id: "a1", name: "notes.pdf", size }} />
			);
			expect(sizeText(container), `${size} bytes`).toBe(expected);
			cleanup();
		}
	});
});

describe("ComposerAttachments inside a real Composer", () => {
	afterEach(cleanup);

	/**
	 * The Svelte suite handed a live context object to a separately mounted row.
	 * React context does not travel outside the provider's tree, so the row is
	 * mounted inside the real root instead — which is the same claim, made the
	 * only way this framework makes it.
	 */
	function AttachmentsInComposer({ seed }: { seed: AttachmentData[] }) {
		const [attachments, setAttachments] = useState(seed);
		return (
			<>
				<Composer attachments={attachments} onAttachmentsChange={setAttachments}>
					<ComposerAttachments />
				</Composer>
				<output data-testid="bound-attachments">{attachments.length}</output>
			</>
		);
	}

	it("lists the root's attachments and drops the one it removes", async () => {
		const { container } = render(
			<AttachmentsInComposer
				seed={[
					{ id: "a1", name: "notes.pdf", size: 2048 },
					{ id: "a2", name: "shot.png" },
				]}
			/>
		);

		expect(names(container)).toEqual(["notes.pdf", "shot.png"]);

		fireEvent.click(removeButton(container));
		await settle();

		// The root owns the list: the chip goes because the attachment did.
		expect(names(container)).toEqual(["shot.png"]);
		expect(readout(container, "bound-attachments")).toBe("1");
	});
});

// =============================================================================
// ComposerCommandMenu
// =============================================================================

const ITEMS: CommandItemData[] = [
	{ id: "deploy", label: "/deploy", description: "Ship the current branch", hint: "⌘⏎" },
	{ id: "describe", label: "/describe", description: "Summarise the diff" },
	{ id: "docs", label: "/docs", description: "Open the handbook" },
	{ id: "reset", label: "/reset", description: "Clear the conversation" },
];

const PEOPLE: CommandItemData[] = [
	{ id: "jordan", label: "@jordan", description: "Reviewer" },
	{ id: "sam", label: "@sam", description: "On call" },
];

/**
 * A stand-in for the composer root.
 *
 * The parts are not composed here, so the rig publishes the same contract by
 * hand around a real textarea — including the token arithmetic `insertText`
 * performs, so the assertions can read the draft a person would actually end
 * up with.
 */
interface Rig {
	el: HTMLTextAreaElement;
	context: ComposerContext;
	inserts: Array<{ text: string; replaceTriggerToken?: boolean }>;
}

const mountedTextareas: HTMLTextAreaElement[] = [];

function rig(triggerChar = "/", registerTextarea = true): Rig {
	const el = document.createElement("textarea");
	document.body.appendChild(el);
	mountedTextareas.push(el);

	const inserts: Rig["inserts"] = [];
	let value = "";

	const context: ComposerContext = {
		value: {
			get current() {
				return value;
			},
		},
		attachments: {
			get current() {
				return [] as AttachmentData[];
			},
		},
		disabled: false,
		streaming: false,
		stoppable: false,
		textareaRef: {
			get current() {
				return registerTextarea ? el : null;
			},
		},
		submit() {},
		stop() {},
		setValue(next: string) {
			value = next;
			el.value = next;
		},
		insertText(text: string, replaceTriggerToken?: boolean) {
			inserts.push({ text, replaceTriggerToken });
			const end = el.selectionEnd ?? el.value.length;
			const token = replaceTriggerToken ? findTriggerToken(el.value, end, triggerChar) : null;
			const start = token ? token.start : end;
			value = `${el.value.slice(0, start)}${text}${el.value.slice(end)}`;
			el.value = value;
			const caret = start + text.length;
			el.setSelectionRange(caret, caret);
		},
		addFiles() {},
		removeAttachment() {},
	};

	return { el, context, inserts };
}

function mountMenu(
	context: ComposerContext | undefined,
	props: Partial<ComposerCommandMenuProps> = {}
) {
	const merged = { trigger: "/", items: ITEMS, ...props };
	const tree = <ComposerCommandMenu {...merged} />;
	return render(context ? <Provide context={context}>{tree}</Provide> : tree);
}

/** Type into the rig's textarea and let the menu react to it. */
function typeInto({ el, context }: Rig, text: string, caret = text.length) {
	context.setValue(text);
	el.setSelectionRange(caret, caret);
	fireEvent.input(el);
}

function commandList(container: HTMLElement): HTMLElement | null {
	return container.querySelector('[role="listbox"]');
}

function rows(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll('[role="option"]'));
}

function labels(container: HTMLElement): string[] {
	return rows(container).map(
		(row) => row.querySelector(".ft-composer-command-label")?.textContent ?? ""
	);
}

function activeLabel(container: HTMLElement): string {
	const row = container.querySelector('[role="option"][aria-selected="true"]');
	return row?.querySelector(".ft-composer-command-label")?.textContent ?? "";
}

function live(container: HTMLElement): string {
	return container.querySelector('[role="status"]')?.textContent ?? "";
}

describe("ComposerCommandMenu", () => {
	afterEach(() => {
		cleanup();
		while (mountedTextareas.length > 0) mountedTextareas.pop()?.remove();
	});

	it("renders nothing at all outside a composer", () => {
		const { container } = mountMenu(undefined);
		expect(commandList(container)).toBeNull();
		expect(container.textContent).toBe("");
	});

	it("renders nothing until an input has registered a textarea", () => {
		const { container } = mountMenu(rig("/", false).context);
		expect(commandList(container)).toBeNull();
		expect(container.querySelector('[role="status"]')).toBeNull();
	});

	it("opens on a trigger token and filters as the query grows", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		expect(commandList(container)).toBeNull();

		typeInto(composer, "/");
		expect(commandList(container)).not.toBeNull();
		expect(labels(container)).toEqual(["/deploy", "/describe", "/docs", "/reset"]);

		typeInto(composer, "/de");
		expect(labels(container)).toEqual(["/deploy", "/describe"]);
		// The list restarts from the top: the row that was active may be gone.
		expect(activeLabel(container)).toBe("/deploy");
	});

	it("stays shut for text that is not a trigger token", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);

		typeInto(composer, "hello");
		expect(commandList(container)).toBeNull();

		// A path fragment, not a command: the slash is mid-word.
		typeInto(composer, "open src/li");
		expect(commandList(container)).toBeNull();

		// The caret has moved past the token, onto the next word.
		typeInto(composer, "/deploy now");
		expect(commandList(container)).toBeNull();
	});

	it("moves the active row with the arrows, wrapping at both ends", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		typeInto(composer, "/de");
		expect(activeLabel(container)).toBe("/deploy");

		const consumed = fireEvent.keyDown(composer.el, { key: "ArrowDown" });
		expect(consumed).toBe(false);
		expect(activeLabel(container)).toBe("/describe");

		fireEvent.keyDown(composer.el, { key: "ArrowDown" });
		expect(activeLabel(container)).toBe("/deploy");

		fireEvent.keyDown(composer.el, { key: "ArrowUp" });
		expect(activeLabel(container)).toBe("/describe");
	});

	it("completes the token on Enter and keeps the key away from the composer", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		typeInto(composer, "/de");

		const consumed = fireEvent.keyDown(composer.el, { key: "Enter" });

		expect(consumed).toBe(false);
		expect(composer.inserts).toEqual([{ text: "/deploy ", replaceTriggerToken: true }]);
		expect(composer.el.value).toBe("/deploy ");
		expect(composer.context.value.current).toBe("/deploy ");
		expect(commandList(container)).toBeNull();
	});

	it("completes on Tab as well", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		typeInto(composer, "run /desc", 9);

		const consumed = fireEvent.keyDown(composer.el, { key: "Tab" });

		expect(consumed).toBe(false);
		expect(composer.el.value).toBe("run /describe ");
		expect(commandList(container)).toBeNull();
	});

	it("hands a custom onSelect the item, the query, and an insertText", () => {
		const onSelect = vi.fn(
			(
				item: CommandItemData,
				ctx: { insertText: (text: string, replaceTriggerToken?: boolean) => void; query: string }
			) => ctx.insertText(`::${item.id}:${ctx.query}`, true)
		);
		const composer = rig();
		const { container } = mountMenu(composer.context, { onSelect });
		typeInto(composer, "/de");
		fireEvent.keyDown(composer.el, { key: "ArrowDown" });
		fireEvent.keyDown(composer.el, { key: "Enter" });

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect.mock.calls[0]![0].id).toBe("describe");
		expect(onSelect.mock.calls[0]![1].query).toBe("de");
		// The default completion is replaced outright, not run alongside.
		expect(composer.inserts).toEqual([{ text: "::describe:de", replaceTriggerToken: true }]);
		expect(composer.el.value).toBe("::describe:de");
		expect(commandList(container)).toBeNull();
	});

	it("selects the row that is clicked, without taking focus off the draft", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		typeInto(composer, "/de");

		const row = rows(container)[1]!;
		const focusKept = fireEvent.mouseDown(row);
		fireEvent.click(row);

		// The default mousedown is what would blur the textarea mid-completion.
		expect(focusKept).toBe(false);
		expect(composer.el.value).toBe("/describe ");
		expect(commandList(container)).toBeNull();
	});

	it("closes on Escape, stays closed for that token, and comes back on a new one", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		typeInto(composer, "/de");

		const consumed = fireEvent.keyDown(composer.el, { key: "Escape" });
		expect(consumed).toBe(false);
		expect(commandList(container)).toBeNull();

		// Still the same token, however much of it gets typed.
		typeInto(composer, "/dep");
		expect(commandList(container)).toBeNull();

		// A token further along the draft is a new question, so it answers again.
		typeInto(composer, "/dep and /doc");
		expect(commandList(container)).not.toBeNull();
		expect(labels(container)).toEqual(["/docs"]);
	});

	it("takes a filter override in place of the label match", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context, {
			filter: (item) => item.id === "docs",
		});
		typeInto(composer, "/de");
		expect(labels(container)).toEqual(["/docs"]);
	});

	it("shows no more rows than maxItems", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context, { maxItems: 2 });
		typeInto(composer, "/");
		expect(labels(container)).toEqual(["/deploy", "/describe"]);
		expect(live(container)).toContain("2 commands available");
	});

	it("renders the empty node when nothing matches, and a default line otherwise", () => {
		const composer = rig();
		const custom = mountMenu(composer.context, {
			empty: <p data-testid="empty">Nothing like that</p>,
		});
		typeInto(composer, "/zzz");
		expect(rows(custom.container)).toHaveLength(0);
		expect(custom.container.querySelector('[data-testid="empty"]')?.textContent).toBe(
			"Nothing like that"
		);
		cleanup();

		const second = rig();
		const plain = mountMenu(second.context);
		second.el.value = "/zzz";
		second.el.setSelectionRange(4, 4);
		fireEvent.input(second.el);
		expect(plain.container.querySelector('[role="listbox"]')?.textContent?.trim()).toBe(
			"No matches."
		);
	});

	it("leaves Enter to the composer when there is nothing to complete", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		typeInto(composer, "/zzz");
		expect(commandList(container)).not.toBeNull();

		const consumed = fireEvent.keyDown(composer.el, { key: "Enter" });
		expect(consumed).toBe(true);
		expect(composer.inserts).toEqual([]);
	});

	it("announces the match count while it is open, and nothing while it is not", () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		expect(live(container)).toBe("");

		typeInto(composer, "/de");
		expect(live(container)).toBe("2 commands available, use the arrow keys");

		typeInto(composer, "/deplo");
		expect(live(container)).toBe("1 command available, use the arrow keys");

		typeInto(composer, "hello");
		expect(live(container)).toBe("");
	});

	it("is the same primitive for mentions, on whatever trigger it is given", () => {
		const composer = rig("@");
		const { container } = mountMenu(composer.context, { trigger: "@", items: PEOPLE });

		typeInto(composer, "ping /jo");
		expect(commandList(container)).toBeNull();

		typeInto(composer, "ping @jo");
		expect(labels(container)).toEqual(["@jordan"]);

		fireEvent.keyDown(composer.el, { key: "Enter" });
		expect(composer.el.value).toBe("ping @jordan ");
	});

	it("lets go of every listener it took when it unmounts", () => {
		// React installs one `selectionchange` listener of its own the first time it
		// renders into a document, behind a marker it never clears. Priming that
		// before the spies go on keeps the count below about this component's own
		// registration, whichever order the file's tests run in.
		render(<div />);
		cleanup();

		const composer = rig();
		const added = vi.spyOn(composer.el, "addEventListener");
		const removed = vi.spyOn(composer.el, "removeEventListener");
		const docAdded = vi.spyOn(document, "addEventListener");
		const docRemoved = vi.spyOn(document, "removeEventListener");

		const { container, unmount } = mountMenu(composer.context);
		typeInto(composer, "/de");
		expect(commandList(container)).not.toBeNull();

		const listenerNames = (spy: typeof added) => spy.mock.calls.map(([name]) => name).sort();
		const selectionChanges = (spy: typeof docAdded) =>
			spy.mock.calls.filter(([name]) => name === "selectionchange").length;

		expect(listenerNames(added)).toEqual(["blur", "input", "keydown"]);
		expect(selectionChanges(docAdded)).toBe(1);
		expect(listenerNames(removed)).toEqual([]);

		unmount();

		expect(listenerNames(removed)).toEqual(["blur", "input", "keydown"]);
		expect(selectionChanges(docRemoved)).toBe(1);

		// Nothing left listening: typing on cannot resurrect the menu.
		fireEvent.input(composer.el);
		expect(commandList(container)).toBeNull();

		added.mockRestore();
		removed.mockRestore();
		docAdded.mockRestore();
		docRemoved.mockRestore();
	});
});

// =============================================================================
// Integration
// =============================================================================

/** A file already riding along with the draft when the rig mounts. */
const SEED: AttachmentData[] = [{ id: "spec-1", name: "spec.pdf", size: 2048 }];

function integrationForm(container: HTMLElement): HTMLFormElement {
	return container.querySelector("form.ft-composer") as HTMLFormElement;
}

function attachButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button.ft-composer-attach") as HTMLButtonElement;
}

function integrationFileInput(container: HTMLElement): HTMLInputElement {
	return container.querySelector("input.ft-composer-file-input") as HTMLInputElement;
}

function modelTrigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button.ft-composer-model") as HTMLButtonElement;
}

function modelMenu(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-composer-model-menu");
}

/** The two trigger menus are told apart by the classes the rig gives them. */
function commandMenu(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-menu-commands");
}

function mentionMenu(container: HTMLElement): HTMLElement | null {
	return container.querySelector(".ft-menu-mentions");
}

function chipNames(container: HTMLElement): string[] {
	return chips(container).map(
		(chip) => chip.querySelector(".ft-composer-attachment-name")?.textContent ?? ""
	);
}

function namedRemoveButton(container: HTMLElement, name: string): HTMLButtonElement {
	return container.querySelector(`button[aria-label="Remove ${name}"]`) as HTMLButtonElement;
}

function menuLabels(menu: HTMLElement): string[] {
	return Array.from(menu.querySelectorAll('[role="option"]')).map(
		(row) => row.querySelector(".ft-composer-command-label")?.textContent ?? ""
	);
}

/**
 * Type into the composer the way a person would.
 *
 * The caret is placed before the event rather than after it, because everything
 * downstream — the token search, the menu's anchor — reads `selectionEnd` while
 * the input event is being handled.
 */
function typeDraft(container: HTMLElement, text: string, caret = text.length) {
	const el = textarea(container);
	setNativeValue(el, text);
	el.setSelectionRange(caret, caret);
	fireEvent.input(el);
	return el;
}

describe("Composer integration", () => {
	afterEach(cleanup);

	it("mounts every part of the flagship composition inside one form", () => {
		const { container } = render(<IntegrationHarness />);

		expect(integrationForm(container)).not.toBeNull();
		expect(textarea(container).getAttribute("placeholder")).toBe("Ask anything");
		expect(sendButton(container).getAttribute("aria-label")).toBe("Send");
		expect(attachButton(container).getAttribute("aria-label")).toBe("Attach files");
		expect(modelTrigger(container).textContent).toContain(INTEGRATION_MODELS[0]!.label);

		// Nothing floats until something asks it to: no menu, no chips, no overlay.
		expect(container.querySelector('[role="listbox"]')).toBeNull();
		expect(chips(container)).toHaveLength(0);
		expect(container.querySelector(".ft-composer-accessory")).toBeNull();
	});

	it("sends the trimmed draft and a snapshot of the attachments on Enter", async () => {
		const onSubmit = vi.fn();
		const { container } = render(<IntegrationHarness initialAttachments={SEED} onSubmit={onSubmit} />);

		typeDraft(container, "  Ship it  ");
		fireEvent.keyDown(textarea(container), { key: "Enter" });
		await settle();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0]![0]).toEqual({ text: "Ship it", attachments: SEED });
		// The text is the composer's to clear; the files belong to the consumer,
		// who alone knows whether an upload is still in flight.
		expect(readout(container, "draft")).toBe("");
		expect(readout(container, "attachment-count")).toBe("1");
	});

	it("leaves Shift+Enter to the textarea", async () => {
		const onSubmit = vi.fn();
		const { container } = render(<IntegrationHarness onSubmit={onSubmit} />);

		typeDraft(container, "line one");
		fireEvent.keyDown(textarea(container), { key: "Enter", shiftKey: true });
		await settle();

		expect(onSubmit).not.toHaveBeenCalled();
		expect(readout(container, "draft")).toBe("line one");
	});

	it("sends on a form submit, and refuses an empty draft", async () => {
		const onSubmit = vi.fn();
		const { container } = render(<IntegrationHarness onSubmit={onSubmit} />);

		fireEvent.submit(integrationForm(container));
		await settle();
		expect(onSubmit).not.toHaveBeenCalled();

		typeDraft(container, "hello");
		fireEvent.submit(integrationForm(container));
		await settle();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0]![0].text).toBe("hello");
	});

	it("opens the command menu on a slash token and completes it through the core", async () => {
		const onSubmit = vi.fn();
		const { container } = render(<IntegrationHarness onSubmit={onSubmit} />);

		const el = typeDraft(container, "/de");
		const menu = commandMenu(container);
		expect(menu).not.toBeNull();
		expect(menuLabels(menu as HTMLElement)).toEqual(["/deploy", "/describe"]);
		// One trigger, one menu: the mention list has no business in a slash token.
		expect(mentionMenu(container)).toBeNull();

		fireEvent.keyDown(el, { key: "Enter" });
		await settle();

		// The completion ran through the root's own caret arithmetic, so the draft
		// the consumer is bound to and the element agree on the result.
		expect(readout(container, "draft")).toBe("/deploy ");
		expect(el.value).toBe("/deploy ");
		// And the key never reached the input's Enter-to-send.
		expect(onSubmit).not.toHaveBeenCalled();
		expect(commandMenu(container)).toBeNull();
	});

	it("answers the second trigger with the mention menu alone", async () => {
		const { container } = render(<IntegrationHarness />);

		const el = typeDraft(container, "ping @jo");
		expect(commandMenu(container)).toBeNull();
		expect(menuLabels(mentionMenu(container) as HTMLElement)).toEqual(["@jordan"]);

		fireEvent.keyDown(el, { key: "Enter" });
		await settle();

		// Spliced mid-draft, with the words either side left alone.
		expect(readout(container, "draft")).toBe("ping @jordan ");
	});

	it("routes a custom onSelect through the same insertText", async () => {
		const mentionSelect = vi.fn(
			(
				item: CommandItemData,
				ctx: { insertText: (text: string, replaceTriggerToken?: boolean) => void; query: string }
			) => ctx.insertText(`<@${item.id}>`, true)
		);
		const { container } = render(<IntegrationHarness mentionSelect={mentionSelect} />);

		const el = typeDraft(container, "cc @sa");
		fireEvent.keyDown(el, { key: "Enter" });
		await settle();

		expect(mentionSelect).toHaveBeenCalledTimes(1);
		expect(mentionSelect.mock.calls[0]![0].id).toBe("sam");
		expect(mentionSelect.mock.calls[0]![1].query).toBe("sa");
		// The core closes the completed token with the space the handler omitted.
		expect(readout(container, "draft")).toBe("cc <@sam> ");
	});

	it("keeps a mid-word slash out of the menu, so Enter still sends", async () => {
		const onSubmit = vi.fn();
		const { container } = render(<IntegrationHarness onSubmit={onSubmit} />);

		const el = typeDraft(container, "open src/li");
		expect(commandMenu(container)).toBeNull();

		fireEvent.keyDown(el, { key: "Enter" });
		await settle();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0]![0].text).toBe("open src/li");
	});

	it("switches model through the picker and writes the choice out", async () => {
		const onModelChange = vi.fn();
		const { container } = render(<IntegrationHarness onModelChange={onModelChange} />);
		// Unset means "whichever model comes first": the state is still empty.
		expect(readout(container, "model")).toBe("");

		fireEvent.click(modelTrigger(container));
		await settle();
		const menu = modelMenu(container);
		expect(menu).not.toBeNull();
		expect(Array.from((menu as HTMLElement).querySelectorAll('[role="option"]'))).toHaveLength(
			INTEGRATION_MODELS.length
		);

		fireEvent.click((menu as HTMLElement).querySelectorAll('[role="option"]')[1]!);
		await settle();

		expect(readout(container, "model")).toBe(INTEGRATION_MODELS[1]!.id);
		expect(onModelChange).toHaveBeenCalledExactlyOnceWith(INTEGRATION_MODELS[1]!.id);
		expect(modelMenu(container)).toBeNull();
		expect(modelTrigger(container).textContent).toContain(INTEGRATION_MODELS[1]!.label);
	});

	it("adds files through the chip row's picker and lists them", async () => {
		const onAttach = vi.fn();
		const { container } = render(<IntegrationHarness onAttach={onAttach} />);

		const files = [new File(["a"], "diagram.png"), new File(["b"], "notes.md")];
		fireEvent.change(integrationFileInput(container), { target: { files } });
		await settle();

		expect(onAttach).toHaveBeenCalledTimes(1);
		expect(onAttach.mock.calls[0]![0]).toEqual(files);
		expect(readout(container, "attachment-count")).toBe("2");
		expect(chipNames(container)).toEqual(["diagram.png", "notes.md"]);
		// Files alone are a sendable draft, with no text at all.
		expect(sendButton(container).disabled).toBe(false);
	});

	it("drops an attachment from its own chip", async () => {
		const { container } = render(
			<IntegrationHarness
				initialAttachments={[
					{ id: "a", name: "one.png" },
					{ id: "b", name: "two.png" },
				]}
			/>
		);
		expect(chips(container)).toHaveLength(2);

		fireEvent.click(namedRemoveButton(container, "one.png"));
		await settle();

		// The removal reached the consumer's own list, not just the row.
		expect(readout(container, "attachment-ids")).toBe("b");
		expect(chipNames(container)).toEqual(["two.png"]);
	});

	it("turns the send button into a stop button while streaming", async () => {
		const onStop = vi.fn();
		const onSubmit = vi.fn();
		const { container } = render(
			<IntegrationHarness
				initialValue="half an answer"
				streaming
				onStop={onStop}
				onSubmit={onSubmit}
			/>
		);

		const button = sendButton(container);
		expect(button.getAttribute("aria-label")).toBe("Stop");
		// A submit button inside a form would send the draft it is meant to halt.
		expect(button.getAttribute("type")).toBe("button");
		expect(button.disabled).toBe(false);

		fireEvent.click(button);
		await settle();

		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onSubmit).not.toHaveBeenCalled();
		// The draft survives the interruption.
		expect(readout(container, "draft")).toBe("half an answer");
	});

	it("refuses to send while a response is still arriving", async () => {
		const onSubmit = vi.fn();
		const { container } = render(
			<IntegrationHarness initialValue="queued" streaming onSubmit={onSubmit} />
		);

		fireEvent.keyDown(textarea(container), { key: "Enter" });
		fireEvent.submit(integrationForm(container));
		await settle();

		expect(onSubmit).not.toHaveBeenCalled();
		// Readonly rather than disabled: the draft stays selectable and copyable.
		expect(textarea(container).readOnly).toBe(true);
		expect(integrationForm(container).getAttribute("data-streaming")).toBe("");
	});

	it("goes inert everywhere from the root's single disabled flag", () => {
		const { container } = render(
			<IntegrationHarness initialValue="hold on" initialAttachments={SEED} disabled />
		);

		expect(textarea(container).readOnly).toBe(true);
		expect(sendButton(container).disabled).toBe(true);
		expect(attachButton(container).disabled).toBe(true);
		expect(integrationFileInput(container).disabled).toBe(true);
		expect(modelTrigger(container).disabled).toBe(true);
		expect(namedRemoveButton(container, "spec.pdf").disabled).toBe(true);
		expect(integrationForm(container).className).toContain("ft-composer-disabled");
	});

	it("lays the accessory over the composition without replacing it", () => {
		const { container } = render(<IntegrationHarness accessory />);

		const overlay = container.querySelector(".ft-composer-accessory");
		expect(overlay).not.toBeNull();
		expect(overlay?.querySelector('[data-testid="accessory"]')).not.toBeNull();
		// The composition is still underneath, waiting for the overlay to lift.
		expect(textarea(container)).not.toBeNull();
		expect(sendButton(container)).not.toBeNull();
	});
});
