/**
 * End-to-end tests for the composer compound.
 *
 * Every other suite in this folder tests one part against a hand-written stand-in
 * for the root's context. This one mocks nothing: `IntegrationHarness` mounts the
 * real `Composer` around the real parts, so what is under test here is the wiring
 * between them — the input registering its element, the menus reading it back off
 * the context, the root's own caret arithmetic completing a token, and the
 * bindings carrying the result out to the consumer.
 *
 * Nothing is reached through an internal: the harness composes the public API,
 * and the assertions go through the DOM a person actually operates.
 */

import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Harness, { MODELS } from "./IntegrationHarness.test.svelte";
import type { AttachmentData, CommandItemData } from "../_internals/ai-types.js";

/** A file already riding along with the draft when the rig mounts. */
const SEED: AttachmentData[] = [{ id: "spec-1", name: "spec.pdf", size: 2048 }];

function form(container: HTMLElement): HTMLFormElement {
	return container.querySelector("form.ft-composer") as HTMLFormElement;
}

function textarea(container: HTMLElement): HTMLTextAreaElement {
	return container.querySelector("textarea") as HTMLTextAreaElement;
}

function sendButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button.ft-composer-submit") as HTMLButtonElement;
}

function attachButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button.ft-composer-attach") as HTMLButtonElement;
}

function fileInput(container: HTMLElement): HTMLInputElement {
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

function chips(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll(".ft-composer-attachment"));
}

function chipNames(container: HTMLElement): string[] {
	return chips(container).map(
		(chip) => chip.querySelector(".ft-composer-attachment-name")?.textContent ?? ""
	);
}

function removeButton(container: HTMLElement, name: string): HTMLButtonElement {
	return container.querySelector(`button[aria-label="Remove ${name}"]`) as HTMLButtonElement;
}

function options(root: HTMLElement): HTMLElement[] {
	return Array.from(root.querySelectorAll('[role="option"]'));
}

function labels(menu: HTMLElement): string[] {
	return options(menu).map(
		(row) => row.querySelector(".ft-composer-command-label")?.textContent ?? ""
	);
}

function readout(container: HTMLElement, id: string): string {
	return (container.querySelector(`[data-testid="${id}"]`) as HTMLElement).textContent ?? "";
}

/** Two ticks: one for the state to reach the DOM, one for the caret restore that waits on it. */
async function settle() {
	await tick();
	await tick();
}

/**
 * Type into the composer the way a person would.
 *
 * The caret is placed before the event rather than after it, because everything
 * downstream — the token search, the menu's anchor — reads `selectionEnd` while
 * the input event is being handled.
 */
async function type(container: HTMLElement, text: string, caret = text.length) {
	const el = textarea(container);
	el.value = text;
	el.setSelectionRange(caret, caret);
	await fireEvent.input(el);
	await settle();
	return el;
}

describe("Composer integration", () => {
	afterEach(cleanup);

	it("mounts every part of the flagship composition inside one form", () => {
		const { container } = render(Harness, {});

		expect(form(container)).not.toBeNull();
		expect(textarea(container).getAttribute("placeholder")).toBe("Ask anything");
		expect(sendButton(container).getAttribute("aria-label")).toBe("Send");
		expect(attachButton(container).getAttribute("aria-label")).toBe("Attach files");
		expect(modelTrigger(container).textContent).toContain(MODELS[0].label);

		// Nothing floats until something asks it to: no menu, no chips, no overlay.
		expect(container.querySelector('[role="listbox"]')).toBeNull();
		expect(chips(container)).toHaveLength(0);
		expect(container.querySelector(".ft-composer-accessory")).toBeNull();
	});

	it("sends the trimmed draft and a snapshot of the attachments on Enter", async () => {
		const onSubmit = vi.fn();
		const { container } = render(Harness, { props: { initialAttachments: SEED, onSubmit } });

		await type(container, "  Ship it  ");
		await fireEvent.keyDown(textarea(container), { key: "Enter" });
		await settle();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0]).toEqual({ text: "Ship it", attachments: SEED });
		// The text is the composer's to clear; the files belong to the consumer,
		// who alone knows whether an upload is still in flight.
		expect(readout(container, "draft")).toBe("");
		expect(readout(container, "attachment-count")).toBe("1");
	});

	it("leaves Shift+Enter to the textarea", async () => {
		const onSubmit = vi.fn();
		const { container } = render(Harness, { props: { onSubmit } });

		await type(container, "line one");
		await fireEvent.keyDown(textarea(container), { key: "Enter", shiftKey: true });
		await settle();

		expect(onSubmit).not.toHaveBeenCalled();
		expect(readout(container, "draft")).toBe("line one");
	});

	it("sends on a form submit, and refuses an empty draft", async () => {
		const onSubmit = vi.fn();
		const { container } = render(Harness, { props: { onSubmit } });

		await fireEvent.submit(form(container));
		await settle();
		expect(onSubmit).not.toHaveBeenCalled();

		await type(container, "hello");
		await fireEvent.submit(form(container));
		await settle();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0].text).toBe("hello");
	});

	it("opens the command menu on a slash token and completes it through the core", async () => {
		const onSubmit = vi.fn();
		const { container } = render(Harness, { props: { onSubmit } });

		const el = await type(container, "/de");
		const menu = commandMenu(container);
		expect(menu).not.toBeNull();
		expect(labels(menu as HTMLElement)).toEqual(["/deploy", "/describe"]);
		// One trigger, one menu: the mention list has no business in a slash token.
		expect(mentionMenu(container)).toBeNull();

		await fireEvent.keyDown(el, { key: "Enter" });
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
		const { container } = render(Harness, {});

		const el = await type(container, "ping @jo");
		expect(commandMenu(container)).toBeNull();
		expect(labels(mentionMenu(container) as HTMLElement)).toEqual(["@jordan"]);

		await fireEvent.keyDown(el, { key: "Enter" });
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
		const { container } = render(Harness, { props: { mentionSelect } });

		const el = await type(container, "cc @sa");
		await fireEvent.keyDown(el, { key: "Enter" });
		await settle();

		expect(mentionSelect).toHaveBeenCalledTimes(1);
		expect(mentionSelect.mock.calls[0][0].id).toBe("sam");
		expect(mentionSelect.mock.calls[0][1].query).toBe("sa");
		// The core closes the completed token with the space the handler omitted.
		expect(readout(container, "draft")).toBe("cc <@sam> ");
	});

	it("keeps a mid-word slash out of the menu, so Enter still sends", async () => {
		const onSubmit = vi.fn();
		const { container } = render(Harness, { props: { onSubmit } });

		const el = await type(container, "open src/li");
		expect(commandMenu(container)).toBeNull();

		await fireEvent.keyDown(el, { key: "Enter" });
		await settle();

		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onSubmit.mock.calls[0][0].text).toBe("open src/li");
	});

	it("switches model through the picker and writes the choice out", async () => {
		const onModelChange = vi.fn();
		const { container } = render(Harness, { props: { onModelChange } });
		// Unset means "whichever model comes first": the binding is still empty.
		expect(readout(container, "model")).toBe("");

		await fireEvent.click(modelTrigger(container));
		await settle();
		const menu = modelMenu(container);
		expect(menu).not.toBeNull();
		expect(options(menu as HTMLElement)).toHaveLength(MODELS.length);

		await fireEvent.click(options(menu as HTMLElement)[1]);
		await settle();

		expect(readout(container, "model")).toBe(MODELS[1].id);
		expect(onModelChange).toHaveBeenCalledExactlyOnceWith(MODELS[1].id);
		expect(modelMenu(container)).toBeNull();
		expect(modelTrigger(container).textContent).toContain(MODELS[1].label);
	});

	it("adds files through the chip row's picker and lists them", async () => {
		const onAttach = vi.fn();
		const { container } = render(Harness, { props: { onAttach } });

		const files = [new File(["a"], "diagram.png"), new File(["b"], "notes.md")];
		await fireEvent.change(fileInput(container), { target: { files } });
		await settle();

		expect(onAttach).toHaveBeenCalledTimes(1);
		expect(onAttach.mock.calls[0][0]).toEqual(files);
		expect(readout(container, "attachment-count")).toBe("2");
		expect(chipNames(container)).toEqual(["diagram.png", "notes.md"]);
		// Files alone are a sendable draft, with no text at all.
		expect(sendButton(container).disabled).toBe(false);
	});

	it("drops an attachment from its own chip", async () => {
		const { container } = render(Harness, {
			props: {
				initialAttachments: [
					{ id: "a", name: "one.png" },
					{ id: "b", name: "two.png" },
				],
			},
		});
		expect(chips(container)).toHaveLength(2);

		await fireEvent.click(removeButton(container, "one.png"));
		await settle();

		// The removal reached the consumer's own list, not just the row.
		expect(readout(container, "attachment-ids")).toBe("b");
		expect(chipNames(container)).toEqual(["two.png"]);
	});

	it("turns the send button into a stop button while streaming", async () => {
		const onStop = vi.fn();
		const onSubmit = vi.fn();
		const { container } = render(Harness, {
			props: { initialValue: "half an answer", streaming: true, onStop, onSubmit },
		});

		const button = sendButton(container);
		expect(button.getAttribute("aria-label")).toBe("Stop");
		// A submit button inside a form would send the draft it is meant to halt.
		expect(button.getAttribute("type")).toBe("button");
		expect(button.disabled).toBe(false);

		await fireEvent.click(button);
		await settle();

		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onSubmit).not.toHaveBeenCalled();
		// The draft survives the interruption.
		expect(readout(container, "draft")).toBe("half an answer");
	});

	it("refuses to send while a response is still arriving", async () => {
		const onSubmit = vi.fn();
		const { container } = render(Harness, {
			props: { initialValue: "queued", streaming: true, onSubmit },
		});

		await fireEvent.keyDown(textarea(container), { key: "Enter" });
		await fireEvent.submit(form(container));
		await settle();

		expect(onSubmit).not.toHaveBeenCalled();
		// Readonly rather than disabled: the draft stays selectable and copyable.
		expect(textarea(container).readOnly).toBe(true);
		expect(form(container).getAttribute("data-streaming")).toBe("");
	});

	it("goes inert everywhere from the root's single disabled flag", () => {
		const { container } = render(Harness, {
			props: { initialValue: "hold on", initialAttachments: SEED, disabled: true },
		});

		expect(textarea(container).readOnly).toBe(true);
		expect(sendButton(container).disabled).toBe(true);
		expect(attachButton(container).disabled).toBe(true);
		expect(fileInput(container).disabled).toBe(true);
		expect(modelTrigger(container).disabled).toBe(true);
		expect(removeButton(container, "spec.pdf").disabled).toBe(true);
		expect(form(container).className).toContain("ft-composer-disabled");
	});

	it("lays the accessory over the composition without replacing it", () => {
		const { container } = render(Harness, { props: { accessory: true } });

		const overlay = container.querySelector(".ft-composer-accessory");
		expect(overlay).not.toBeNull();
		expect(overlay?.querySelector('[data-testid="accessory"]')).not.toBeNull();
		// The composition is still underneath, waiting for the overlay to lift.
		expect(textarea(container)).not.toBeNull();
		expect(sendButton(container)).not.toBeNull();
	});
});
