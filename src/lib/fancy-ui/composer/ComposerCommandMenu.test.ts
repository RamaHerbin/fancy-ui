import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ComposerCommandMenu from "./ComposerCommandMenu.svelte";
import type { ComposerCommandMenuProps } from "./ComposerCommandMenu.svelte";
import { findTriggerToken } from "./caret.js";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";
import type { AttachmentData, CommandItemData } from "../_internals/ai-types.js";

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
 * The parts cannot be composed from a `.ts` file, so the rig publishes the same
 * contract by hand around a real textarea — including the token arithmetic
 * `insertText` performs, so the assertions can read the draft a person would
 * actually end up with.
 */
interface Rig {
	el: HTMLTextAreaElement;
	context: ComposerContext;
	inserts: Array<{ text: string; replaceTriggerToken?: boolean }>;
}

const mounted: HTMLTextAreaElement[] = [];

function rig(trigger = "/", registerTextarea = true): Rig {
	const el = document.createElement("textarea");
	document.body.appendChild(el);
	mounted.push(el);

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
			const token = replaceTriggerToken ? findTriggerToken(el.value, end, trigger) : null;
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
	const componentProps = { trigger: "/", items: ITEMS, ...props };
	return context
		? render(ComposerCommandMenu, {
				props: componentProps,
				context: new Map<unknown, unknown>([[COMPOSER_CONTEXT_KEY, context]]),
			})
		: render(ComposerCommandMenu, { props: componentProps });
}

/** Type into the rig's textarea and let the menu react to it. */
async function type({ el, context }: Rig, text: string, caret = text.length) {
	context.setValue(text);
	el.setSelectionRange(caret, caret);
	await fireEvent.input(el);
	await tick();
}

function menu(container: HTMLElement): HTMLElement | null {
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

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

describe("ComposerCommandMenu", () => {
	afterEach(() => {
		cleanup();
		while (mounted.length > 0) mounted.pop()?.remove();
	});

	it("renders nothing at all outside a composer", () => {
		const { container } = mountMenu(undefined);
		expect(menu(container)).toBeNull();
		expect(container.textContent).toBe("");
	});

	it("renders nothing until an input has registered a textarea", () => {
		const { container } = mountMenu(rig("/", false).context);
		expect(menu(container)).toBeNull();
		expect(container.querySelector('[role="status"]')).toBeNull();
	});

	it("opens on a trigger token and filters as the query grows", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		expect(menu(container)).toBeNull();

		await type(composer, "/");
		expect(menu(container)).not.toBeNull();
		expect(labels(container)).toEqual(["/deploy", "/describe", "/docs", "/reset"]);

		await type(composer, "/de");
		expect(labels(container)).toEqual(["/deploy", "/describe"]);
		// The list restarts from the top: the row that was active may be gone.
		expect(activeLabel(container)).toBe("/deploy");
	});

	it("stays shut for text that is not a trigger token", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);

		await type(composer, "hello");
		expect(menu(container)).toBeNull();

		// A path fragment, not a command: the slash is mid-word.
		await type(composer, "open src/li");
		expect(menu(container)).toBeNull();

		// The caret has moved past the token, onto the next word.
		await type(composer, "/deploy now");
		expect(menu(container)).toBeNull();
	});

	it("moves the active row with the arrows, wrapping at both ends", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "/de");
		expect(activeLabel(container)).toBe("/deploy");

		const consumed = await fireEvent.keyDown(composer.el, { key: "ArrowDown" });
		expect(consumed).toBe(false);
		await tick();
		expect(activeLabel(container)).toBe("/describe");

		await fireEvent.keyDown(composer.el, { key: "ArrowDown" });
		await tick();
		expect(activeLabel(container)).toBe("/deploy");

		await fireEvent.keyDown(composer.el, { key: "ArrowUp" });
		await tick();
		expect(activeLabel(container)).toBe("/describe");
	});

	it("completes the token on Enter and keeps the key away from the composer", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "/de");

		const consumed = await fireEvent.keyDown(composer.el, { key: "Enter" });
		await tick();

		expect(consumed).toBe(false);
		expect(composer.inserts).toEqual([{ text: "/deploy ", replaceTriggerToken: true }]);
		expect(composer.el.value).toBe("/deploy ");
		expect(composer.context.value.current).toBe("/deploy ");
		expect(menu(container)).toBeNull();
	});

	it("completes on Tab as well", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "run /desc", 9);

		const consumed = await fireEvent.keyDown(composer.el, { key: "Tab" });
		await tick();

		expect(consumed).toBe(false);
		expect(composer.el.value).toBe("run /describe ");
		expect(menu(container)).toBeNull();
	});

	it("hands a custom onSelect the item, the query, and an insertText", async () => {
		const onSelect = vi.fn(
			(
				item: CommandItemData,
				ctx: { insertText: (text: string, replaceTriggerToken?: boolean) => void; query: string }
			) => ctx.insertText(`::${item.id}:${ctx.query}`, true)
		);
		const composer = rig();
		const { container } = mountMenu(composer.context, { onSelect });
		await type(composer, "/de");
		await fireEvent.keyDown(composer.el, { key: "ArrowDown" });
		await fireEvent.keyDown(composer.el, { key: "Enter" });
		await tick();

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect.mock.calls[0][0].id).toBe("describe");
		expect(onSelect.mock.calls[0][1].query).toBe("de");
		// The default completion is replaced outright, not run alongside.
		expect(composer.inserts).toEqual([{ text: "::describe:de", replaceTriggerToken: true }]);
		expect(composer.el.value).toBe("::describe:de");
		expect(menu(container)).toBeNull();
	});

	it("selects the row that is clicked, without taking focus off the draft", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "/de");

		const row = rows(container)[1];
		const focusKept = await fireEvent.mouseDown(row);
		await fireEvent.click(row);
		await tick();

		// The default mousedown is what would blur the textarea mid-completion.
		expect(focusKept).toBe(false);
		expect(composer.el.value).toBe("/describe ");
		expect(menu(container)).toBeNull();
	});

	it("closes on Escape, stays closed for that token, and comes back on a new one", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "/de");

		const consumed = await fireEvent.keyDown(composer.el, { key: "Escape" });
		await tick();
		expect(consumed).toBe(false);
		expect(menu(container)).toBeNull();

		// Still the same token, however much of it gets typed.
		await type(composer, "/dep");
		expect(menu(container)).toBeNull();

		// A token further along the draft is a new question, so it answers again.
		await type(composer, "/dep and /doc");
		expect(menu(container)).not.toBeNull();
		expect(labels(container)).toEqual(["/docs"]);
	});

	it("takes a filter override in place of the label match", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context, {
			filter: (item) => item.id === "docs",
		});
		await type(composer, "/de");
		expect(labels(container)).toEqual(["/docs"]);
	});

	it("shows no more rows than maxItems", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context, { maxItems: 2 });
		await type(composer, "/");
		expect(labels(container)).toEqual(["/deploy", "/describe"]);
		expect(live(container)).toContain("2 commands available");
	});

	it("renders the empty snippet when nothing matches, and a default line otherwise", async () => {
		const composer = rig();
		const custom = mountMenu(composer.context, {
			empty: snippet('<p data-testid="empty">Nothing like that</p>'),
		});
		await type(composer, "/zzz");
		expect(rows(custom.container)).toHaveLength(0);
		expect(custom.container.querySelector('[data-testid="empty"]')?.textContent).toBe(
			"Nothing like that"
		);
		cleanup();

		const plain = mountMenu(rig().context);
		const other = mounted[mounted.length - 1];
		other.value = "/zzz";
		other.setSelectionRange(4, 4);
		await fireEvent.input(other);
		await tick();
		expect(plain.container.querySelector('[role="listbox"]')?.textContent?.trim()).toBe(
			"No matches."
		);
	});

	it("leaves Enter to the composer when there is nothing to complete", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "/zzz");
		expect(menu(container)).not.toBeNull();

		const consumed = await fireEvent.keyDown(composer.el, { key: "Enter" });
		expect(consumed).toBe(true);
		expect(composer.inserts).toEqual([]);
	});

	it("announces the match count while it is open, and nothing while it is not", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		expect(live(container)).toBe("");

		await type(composer, "/de");
		expect(live(container)).toBe("2 commands available, use the arrow keys");

		await type(composer, "/deplo");
		expect(live(container)).toBe("1 command available, use the arrow keys");

		await type(composer, "hello");
		expect(live(container)).toBe("");
	});

	it("is the same primitive for mentions, on whatever trigger it is given", async () => {
		const composer = rig("@");
		const { container } = mountMenu(composer.context, { trigger: "@", items: PEOPLE });

		await type(composer, "ping /jo");
		expect(menu(container)).toBeNull();

		await type(composer, "ping @jo");
		expect(labels(container)).toEqual(["@jordan"]);

		await fireEvent.keyDown(composer.el, { key: "Enter" });
		await tick();
		expect(composer.el.value).toBe("ping @jordan ");
	});

	it("lets go of every listener it took when it unmounts", async () => {
		const composer = rig();
		const added = vi.spyOn(composer.el, "addEventListener");
		const removed = vi.spyOn(composer.el, "removeEventListener");
		const docAdded = vi.spyOn(document, "addEventListener");
		const docRemoved = vi.spyOn(document, "removeEventListener");

		const { container, unmount } = mountMenu(composer.context);
		await type(composer, "/de");
		expect(menu(container)).not.toBeNull();

		const names = (spy: typeof added) => spy.mock.calls.map(([name]) => name).sort();
		const selectionChanges = (spy: typeof docAdded) =>
			spy.mock.calls.filter(([name]) => name === "selectionchange").length;

		expect(names(added)).toEqual(["blur", "input", "keydown"]);
		expect(selectionChanges(docAdded)).toBe(1);
		expect(names(removed)).toEqual([]);

		unmount();
		await tick();

		expect(names(removed)).toEqual(["blur", "input", "keydown"]);
		expect(selectionChanges(docRemoved)).toBe(1);

		// Nothing left listening: typing on cannot resurrect the menu.
		await fireEvent.input(composer.el);
		expect(menu(container)).toBeNull();

		added.mockRestore();
		removed.mockRestore();
		docAdded.mockRestore();
		docRemoved.mockRestore();
	});
});
