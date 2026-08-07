import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import ComposerToolbar from "./ComposerToolbar.svelte";
import ComposerModelPicker from "./ComposerModelPicker.svelte";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";
import type { ModelOptionData } from "../_internals/ai-types.js";

/** Generic tiers, so the fixture says nothing about anyone's product line-up. */
const MODELS: ModelOptionData[] = [
	{ id: "mini", label: "Mini", badge: "Fast", description: "Short answers, small context." },
	{ id: "pro", label: "Pro", description: "Deeper reasoning, slower." },
	{ id: "max", label: "Max", badge: "New" },
];

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

/**
 * A composer root standing in for the real one.
 *
 * The picker only reads `disabled` off the context, but the object has to be a
 * whole `ComposerContext` — that is the contract a part is written against, and
 * a partial stand-in would let a part start reading something this rig does not
 * provide without the test noticing. `disabled` arrives as a getter so a test
 * can flip it mid-life, the way a real root's own state does.
 */
function composerContext(disabled: () => boolean = () => false): Map<symbol, ComposerContext> {
	const context: ComposerContext = {
		value: { current: "" },
		attachments: { current: [] },
		get disabled() {
			return disabled();
		},
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
	return new Map<symbol, ComposerContext>([[COMPOSER_CONTEXT_KEY, context]]);
}

interface PickerProps {
	models?: ModelOptionData[];
	value?: string;
	onChange?: (id: string) => void;
	label?: string;
	class?: string;
}

function renderPicker(props: PickerProps = {}, context?: Map<symbol, ComposerContext>) {
	const { models = MODELS, ...rest } = props;
	return render(ComposerModelPicker, { props: { models, ...rest }, context });
}

function trigger(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button.ft-composer-model") as HTMLButtonElement;
}

function menu(container: HTMLElement): HTMLElement | null {
	return container.querySelector('[role="listbox"]');
}

function options(container: HTMLElement): HTMLElement[] {
	return Array.from(container.querySelectorAll('[role="option"]'));
}

async function openMenu(container: HTMLElement) {
	await fireEvent.click(trigger(container));
	return menu(container) as HTMLElement;
}

describe("ComposerToolbar", () => {
	afterEach(cleanup);

	it("lays its children out on a single row", () => {
		const { container } = render(ComposerToolbar, {
			props: { children: snippet("<span><button>Attach</button><button>Send</button></span>") },
		});
		const row = container.querySelector("div") as HTMLElement;

		expect(row.className).toContain("ft-composer-toolbar");
		expect(row.className).toContain("flex");
		expect(row.className).toContain("items-center");
		expect(row.className).toContain("gap-1");
		expect(row.querySelectorAll("button")).toHaveLength(2);
	});

	it("takes extra classes without dropping its own layout", () => {
		const { container } = render(ComposerToolbar, { props: { class: "mt-2" } });
		const row = container.querySelector("div") as HTMLElement;

		expect(row.className).toContain("mt-2");
		expect(row.className).toContain("items-center");
	});

	it("renders an empty rail rather than throwing when it has nothing on it", () => {
		const { container } = render(ComposerToolbar, {});
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

	it("shows the model named by `value`, and follows it when it changes", async () => {
		const { container, rerender } = renderPicker({ value: "pro" });
		expect(trigger(container).textContent).toContain("Pro");

		await rerender({ value: "max" });
		expect(trigger(container).textContent).toContain("Max");
	});

	it("keeps the menu out of the DOM until it is opened, and takes it back out", async () => {
		const { container } = renderPicker();
		expect(menu(container)).toBeNull();
		expect(trigger(container).getAttribute("aria-expanded")).toBe("false");

		const list = await openMenu(container);
		expect(list).not.toBeNull();
		expect(trigger(container).getAttribute("aria-expanded")).toBe("true");
		expect(trigger(container).getAttribute("aria-controls")).toBe(list.id);

		await fireEvent.click(trigger(container));
		expect(menu(container)).toBeNull();
		expect(trigger(container).getAttribute("aria-controls")).toBeNull();
	});

	it("lists every model with its badge and its description", async () => {
		const { container } = renderPicker();
		await openMenu(container);
		const rows = options(container);

		expect(rows).toHaveLength(3);
		expect(rows[0].textContent).toContain("Mini");
		expect(rows[0].textContent).toContain("Fast");
		expect(rows[0].textContent).toContain("Short answers, small context.");
		expect(rows[2].textContent).toContain("New");
	});

	it("opens on the selected model, and points activedescendant at it", async () => {
		const { container } = renderPicker({ value: "pro" });
		const list = await openMenu(container);
		const rows = options(container);

		expect(list.getAttribute("role")).toBe("listbox");
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[1].id);
		expect(rows[1].getAttribute("aria-selected")).toBe("true");
		expect(rows[0].getAttribute("aria-selected")).toBe("false");
		expect(document.activeElement).toBe(list);
	});

	it("moves the active option with the arrows, wrapping at both ends", async () => {
		const { container } = renderPicker();
		const list = await openMenu(container);
		const rows = options(container);

		await fireEvent.keyDown(list, { key: "ArrowDown" });
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[1].id);

		await fireEvent.keyDown(list, { key: "ArrowUp" });
		await fireEvent.keyDown(list, { key: "ArrowUp" });
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[2].id);

		await fireEvent.keyDown(list, { key: "ArrowDown" });
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[0].id);
	});

	it("opens from the trigger's own arrow keys", async () => {
		const { container } = renderPicker();

		await fireEvent.keyDown(trigger(container), { key: "ArrowUp" });
		expect(menu(container)).not.toBeNull();
	});

	it("selects the active option on Enter, reporting the change and closing", async () => {
		const onChange = vi.fn();
		const { container } = renderPicker({ onChange });
		const list = await openMenu(container);

		await fireEvent.keyDown(list, { key: "ArrowDown" });
		await fireEvent.keyDown(list, { key: "Enter" });

		expect(onChange).toHaveBeenCalledTimes(1);
		expect(onChange).toHaveBeenCalledWith("pro");
		expect(menu(container)).toBeNull();
		expect(trigger(container).textContent).toContain("Pro");
		expect(document.activeElement).toBe(trigger(container));
	});

	it("writes the pick back through the bindable value", async () => {
		// An accessor pair is what `bind:value` compiles down to, and the closest a
		// `.ts` test can get to one without a rune-carrying rig: the component sees a
		// settable prop and pushes the pick through it. Only the write-back is
		// asserted here — a plain closure is not reactive, so the trigger's own
		// re-render is left to the tests that let the picker hold its own value.
		let bound = "mini";
		const { container } = render(ComposerModelPicker, {
			props: {
				models: MODELS,
				get value() {
					return bound;
				},
				set value(next: string) {
					bound = next;
				},
			},
		});

		await openMenu(container);
		await fireEvent.click(options(container)[2]);

		expect(bound).toBe("max");
	});

	it("selects on click, and stays silent when the pick changes nothing", async () => {
		const onChange = vi.fn();
		const { container } = renderPicker({ value: "pro", onChange });

		await openMenu(container);
		await fireEvent.click(options(container)[1]);

		expect(menu(container)).toBeNull();
		expect(onChange).not.toHaveBeenCalled();
		expect(trigger(container).textContent).toContain("Pro");
	});

	it("closes on Escape and hands focus back to the trigger", async () => {
		const { container } = renderPicker();
		const list = await openMenu(container);

		await fireEvent.keyDown(list, { key: "Escape" });

		expect(menu(container)).toBeNull();
		expect(document.activeElement).toBe(trigger(container));
	});

	it("steps aside on Tab, leaving focus where the browser can carry it on", async () => {
		const { container } = renderPicker();
		const list = await openMenu(container);

		await fireEvent.keyDown(list, { key: "Tab" });

		expect(menu(container)).toBeNull();
		expect(document.activeElement).toBe(trigger(container));
	});

	it("closes on a press outside, and survives a press inside the menu", async () => {
		const { container } = renderPicker();
		const list = await openMenu(container);

		await fireEvent.mouseDown(options(container)[1]);
		expect(menu(container)).not.toBeNull();

		await fireEvent.mouseDown(document.body);
		expect(menu(container)).toBeNull();
		// The press is already moving focus elsewhere; the picker does not fight it.
		expect(document.activeElement).not.toBe(trigger(container));
		expect(list.isConnected).toBe(false);
	});

	it("goes inert while the composer is disabled", async () => {
		const { container } = renderPicker(
			{},
			composerContext(() => true)
		);

		expect(trigger(container).disabled).toBe(true);
		await fireEvent.keyDown(trigger(container), { key: "ArrowDown" });
		expect(menu(container)).toBeNull();
	});

	it("closes itself when the composer switches off mid-menu", async () => {
		let off = false;
		const { container, rerender } = renderPicker(
			{},
			composerContext(() => off)
		);
		await openMenu(container);

		off = true;
		// The stand-in is a plain object, so nothing re-reads its getter on its own:
		// the prop update is the nudge a real root's state change would deliver.
		await rerender({ models: [...MODELS] });

		expect(trigger(container).disabled).toBe(true);
		expect(menu(container)).toBeNull();
	});

	it("has nothing to offer, and says so, on an empty model list", () => {
		const { container } = renderPicker({ models: [], label: "Engine" });

		expect(trigger(container).disabled).toBe(true);
		expect(trigger(container).textContent).toContain("Engine");
		expect(trigger(container).getAttribute("aria-label")).toBe("Engine");
	});

	it("works on its own, outside a composer", async () => {
		const { container } = renderPicker();

		expect(trigger(container).disabled).toBe(false);
		await openMenu(container);
		expect(options(container)).toHaveLength(3);
	});

	it("adds one document listener while open and takes it back on close", async () => {
		const add = vi.spyOn(document, "addEventListener");
		const remove = vi.spyOn(document, "removeEventListener");
		const { container } = renderPicker();

		const list = await openMenu(container);
		const added = add.mock.calls.filter(([type]) => type === "mousedown");
		expect(added).toHaveLength(1);
		expect(remove.mock.calls.filter(([type]) => type === "mousedown")).toHaveLength(0);

		await fireEvent.keyDown(list, { key: "Escape" });
		expect(remove.mock.calls.filter(([type]) => type === "mousedown")).toHaveLength(1);

		add.mockRestore();
		remove.mockRestore();
	});

	it("leaves no document listener behind when it is destroyed while open", async () => {
		const add = vi.spyOn(document, "addEventListener");
		const remove = vi.spyOn(document, "removeEventListener");
		const { container, unmount } = renderPicker();

		await openMenu(container);
		expect(add.mock.calls.filter(([type]) => type === "mousedown")).toHaveLength(1);

		unmount();
		await tick();

		expect(remove.mock.calls.filter(([type]) => type === "mousedown")).toHaveLength(1);
		add.mockRestore();
		remove.mockRestore();
	});

	it("mounts and opens without warnings", async () => {
		const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
		const error = vi.spyOn(console, "error").mockImplementation(() => {});

		const { container } = renderPicker({ class: "self-center" });
		const list = await openMenu(container);
		await fireEvent.keyDown(list, { key: "ArrowDown" });
		await fireEvent.keyDown(list, { key: "Enter" });

		expect(trigger(container).className).toContain("self-center");
		expect(warn).not.toHaveBeenCalled();
		expect(error).not.toHaveBeenCalled();
		warn.mockRestore();
		error.mockRestore();
	});
});
