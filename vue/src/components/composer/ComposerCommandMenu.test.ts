import { render, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import ComposerCommandMenu from "./ComposerCommandMenu.vue";
import type { ComposerCommandMenuProps } from "./ComposerCommandMenu.vue";
import { findTriggerToken } from "./caret.js";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";
import type { AttachmentData, CommandItemData } from "../../internals/ai-types.js";
import { sound } from "../../sound/sound.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Two
 * shapes changed and nothing else did: the `empty` snippet becomes a slot
 * passed as a template string, and the context map handed to Svelte's `render`
 * becomes `global: { provide: { [COMPOSER_CONTEXT_KEY]: … } }`.
 */

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

function rig(trigger = "/", registerTextarea = true, withSound = false): Rig {
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
		sound: withSound,
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
	props: Partial<ComposerCommandMenuProps> = {},
	slots?: Record<string, string>
) {
	const componentProps = { trigger: "/", items: ITEMS, ...props };
	return render(ComposerCommandMenu, {
		props: componentProps,
		...(slots ? { slots } : {}),
		...(context ? { global: { provide: { [COMPOSER_CONTEXT_KEY as symbol]: context } } } : {}),
	});
}

/**
 * This framework's `fireEvent` does not return `dispatchEvent`'s boolean, so
 * the cases that assert on it dispatch the event themselves and hand back the
 * same value — false once a handler has called `preventDefault`.
 */
async function keyDown(el: HTMLElement, init: KeyboardEventInit): Promise<boolean> {
	const event = new KeyboardEvent("keydown", { bubbles: true, cancelable: true, ...init });
	const result = el.dispatchEvent(event);
	await nextTick();
	return result;
}

async function mouseDown(el: HTMLElement): Promise<boolean> {
	const event = new MouseEvent("mousedown", { bubbles: true, cancelable: true });
	const result = el.dispatchEvent(event);
	await nextTick();
	return result;
}

/** Type into the rig's textarea and let the menu react to it. */
async function type({ el, context }: Rig, text: string, caret = text.length) {
	context.setValue(text);
	el.setSelectionRange(caret, caret);
	await fireEvent.input(el);
	await nextTick();
}

function menu(container: Element): HTMLElement | null {
	return container.querySelector('[role="listbox"]');
}

function rows(container: Element): HTMLElement[] {
	return Array.from(container.querySelectorAll('[role="option"]'));
}

function labels(container: Element): string[] {
	return rows(container).map(
		(row) => row.querySelector(".ft-composer-command-label")?.textContent ?? ""
	);
}

function activeLabel(container: Element): string {
	const row = container.querySelector('[role="option"][aria-selected="true"]');
	return row?.querySelector(".ft-composer-command-label")?.textContent ?? "";
}

function live(container: Element): string {
	return container.querySelector('[role="status"]')?.textContent ?? "";
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

		const consumed = await keyDown(composer.el, { key: "ArrowDown" });
		expect(consumed).toBe(false);
		await nextTick();
		expect(activeLabel(container)).toBe("/describe");

		await fireEvent.keyDown(composer.el, { key: "ArrowDown" });
		await nextTick();
		expect(activeLabel(container)).toBe("/deploy");

		await fireEvent.keyDown(composer.el, { key: "ArrowUp" });
		await nextTick();
		expect(activeLabel(container)).toBe("/describe");
	});

	it("completes the token on Enter and keeps the key away from the composer", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "/de");

		const consumed = await keyDown(composer.el, { key: "Enter" });
		await nextTick();

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

		const consumed = await keyDown(composer.el, { key: "Tab" });
		await nextTick();

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
		await nextTick();

		expect(onSelect).toHaveBeenCalledTimes(1);
		expect(onSelect.mock.calls[0]![0].id).toBe("describe");
		expect(onSelect.mock.calls[0]![1].query).toBe("de");
		// The default completion is replaced outright, not run alongside.
		expect(composer.inserts).toEqual([{ text: "::describe:de", replaceTriggerToken: true }]);
		expect(composer.el.value).toBe("::describe:de");
		expect(menu(container)).toBeNull();
	});

	it("selects the row that is clicked, without taking focus off the draft", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "/de");

		const row = rows(container)[1]!;
		const focusKept = await mouseDown(row);
		await fireEvent.click(row);
		await nextTick();

		// The default mousedown is what would blur the textarea mid-completion.
		expect(focusKept).toBe(false);
		expect(composer.el.value).toBe("/describe ");
		expect(menu(container)).toBeNull();
	});

	it("closes on Escape, stays closed for that token, and comes back on a new one", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "/de");

		const consumed = await keyDown(composer.el, { key: "Escape" });
		await nextTick();
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

	it("renders the empty slot when nothing matches, and a default line otherwise", async () => {
		const composer = rig();
		const custom = mountMenu(
			composer.context,
			{},
			{ empty: '<p data-testid="empty">Nothing like that</p>' }
		);
		await type(composer, "/zzz");
		expect(rows(custom.container)).toHaveLength(0);
		expect(custom.container.querySelector('[data-testid="empty"]')?.textContent).toBe(
			"Nothing like that"
		);
		cleanup();

		const plain = mountMenu(rig().context);
		const other = mounted[mounted.length - 1]!;
		other.value = "/zzz";
		other.setSelectionRange(4, 4);
		await fireEvent.input(other);
		await nextTick();
		expect(plain.container.querySelector('[role="listbox"]')?.textContent?.trim()).toBe(
			"No matches."
		);
	});

	it("leaves Enter to the composer when there is nothing to complete", async () => {
		const composer = rig();
		const { container } = mountMenu(composer.context);
		await type(composer, "/zzz");
		expect(menu(container)).not.toBeNull();

		const consumed = await keyDown(composer.el, { key: "Enter" });
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
		await nextTick();
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
		await nextTick();

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

		it("plays select exactly once when a row is clicked, with sound enabled", async () => {
			const composer = rig("/", true, true);
			const { container } = mountMenu(composer.context);
			await type(composer, "/de");

			await fireEvent.click(rows(container)[1]!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays select exactly once when a row is completed on Enter", async () => {
			const composer = rig("/", true, true);
			const { container } = mountMenu(composer.context);
			await type(composer, "/de");

			await fireEvent.keyDown(composer.el, { key: "Enter" });
			await nextTick();

			expect(menu(container)).toBeNull();
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays nothing by default (sound off on the composer context)", async () => {
			const composer = rig();
			const { container } = mountMenu(composer.context);
			await type(composer, "/de");

			await fireEvent.click(rows(container)[0]!);

			expect(play).not.toHaveBeenCalled();
		});

		it("opening and closing the menu itself stays silent — only a pick plays a cue", async () => {
			const composer = rig("/", true, true);
			const { container } = mountMenu(composer.context);

			await type(composer, "/");
			expect(menu(container)).not.toBeNull();
			expect(play).not.toHaveBeenCalled();

			await fireEvent.keyDown(composer.el, { key: "Escape" });
			expect(menu(container)).toBeNull();
			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when Enter has nothing to complete — the !item guard holds", async () => {
			const composer = rig("/", true, true);
			mountMenu(composer.context);
			await type(composer, "/zzz");

			const consumed = await keyDown(composer.el, { key: "Enter" });

			// Nothing to complete: Enter goes back to meaning send, and plays nothing.
			expect(consumed).toBe(true);
			expect(play).not.toHaveBeenCalled();
		});
	});
});
