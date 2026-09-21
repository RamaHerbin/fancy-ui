import { render, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import ComposerToolbar from "./ComposerToolbar.vue";
import ComposerModelPicker from "./ComposerModelPicker.vue";
import { COMPOSER_CONTEXT_KEY, type ComposerContext } from "./types.js";
import type { ModelOptionData } from "../../internals/ai-types.js";
import { sound } from "../../sound/sound.js";

/**
 * Transposed assertion-for-assertion from the source component's suite. Three
 * shapes changed and nothing else did:
 *
 * - The snippet prop becomes a slot, passed as a template string.
 * - The context map handed to Svelte's `render` becomes
 *   `global: { provide: { [COMPOSER_CONTEXT_KEY]: … } }`.
 * - The bindable `value` is written back through `onUpdate:value`, which is
 *   what `v-model:value` compiles down to.
 */

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
 * provide without the test noticing. `disabled` arrives as a getter so a test
 * can flip it mid-life, the way a real root's own state does.
 */
function composerContext(disabled: () => boolean = () => false, sound = false): ComposerContext {
	return {
		value: { current: "" },
		attachments: { current: [] },
		get disabled() {
			return disabled();
		},
		streaming: false,
		stoppable: false,
		textareaRef: { current: null },
		sound,
		submit: () => {},
		stop: () => {},
		setValue: () => {},
		insertText: () => {},
		addFiles: () => {},
		removeAttachment: () => {},
	};
}

function provide(context: ComposerContext) {
	return { global: { provide: { [COMPOSER_CONTEXT_KEY as symbol]: context } } };
}

interface PickerProps {
	models?: ModelOptionData[];
	value?: string;
	onChange?: (id: string) => void;
	label?: string;
	class?: string;
}

function renderPicker(props: PickerProps = {}, context?: ComposerContext) {
	const { models = MODELS, ...rest } = props;
	return render(ComposerModelPicker, {
		props: { models, ...rest },
		...(context ? provide(context) : {}),
	});
}

function trigger(container: Element): HTMLButtonElement {
	return container.querySelector("button.ft-composer-model") as HTMLButtonElement;
}

function menu(container: Element): HTMLElement | null {
	return container.querySelector('[role="listbox"]');
}

function options(container: Element): HTMLElement[] {
	return Array.from(container.querySelectorAll('[role="option"]'));
}

async function openMenu(container: Element) {
	await fireEvent.click(trigger(container));
	return menu(container) as HTMLElement;
}

describe("ComposerToolbar", () => {
	afterEach(cleanup);

	it("lays its children out on a single row", () => {
		const { container } = render(ComposerToolbar, {
			slots: { default: "<span><button>Attach</button><button>Send</button></span>" },
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

		await rerender({ models: MODELS, value: "max" });
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
		expect(rows[0]!.textContent).toContain("Mini");
		expect(rows[0]!.textContent).toContain("Fast");
		expect(rows[0]!.textContent).toContain("Short answers, small context.");
		expect(rows[2]!.textContent).toContain("New");
	});

	it("opens on the selected model, and points activedescendant at it", async () => {
		const { container } = renderPicker({ value: "pro" });
		const list = await openMenu(container);
		const rows = options(container);

		expect(list.getAttribute("role")).toBe("listbox");
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[1]!.id);
		expect(rows[1]!.getAttribute("aria-selected")).toBe("true");
		expect(rows[0]!.getAttribute("aria-selected")).toBe("false");
		expect(document.activeElement).toBe(list);
	});

	it("moves the active option with the arrows, wrapping at both ends", async () => {
		const { container } = renderPicker();
		const list = await openMenu(container);
		const rows = options(container);

		await fireEvent.keyDown(list, { key: "ArrowDown" });
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[1]!.id);

		await fireEvent.keyDown(list, { key: "ArrowUp" });
		await fireEvent.keyDown(list, { key: "ArrowUp" });
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[2]!.id);

		await fireEvent.keyDown(list, { key: "ArrowDown" });
		expect(list.getAttribute("aria-activedescendant")).toBe(rows[0]!.id);
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
		// `onUpdate:value` is what `v-model:value` compiles down to, and the
		// closest a `.ts` test can get to a binding without a rig: the component
		// sees a settable model and pushes the pick through it. Only the
		// write-back is asserted here — the handler does not feed the new value
		// back in, so the trigger's own re-render is left to the tests that let
		// the picker hold its own value.
		let bound = "mini";
		const { container } = render(ComposerModelPicker, {
			props: {
				models: MODELS,
				value: bound,
				"onUpdate:value": (next: string | undefined) => {
					bound = next as string;
				},
			},
		});

		await openMenu(container);
		await fireEvent.click(options(container)[2]!);

		expect(bound).toBe("max");
	});

	it("selects on click, and stays silent when the pick changes nothing", async () => {
		const onChange = vi.fn();
		const { container } = renderPicker({ value: "pro", onChange });

		await openMenu(container);
		await fireEvent.click(options(container)[1]!);

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

		await fireEvent.mouseDown(options(container)[1]!);
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
		await nextTick();

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

		it("plays open exactly once when the trigger opens the menu", async () => {
			const { container } = renderPicker(
				{},
				composerContext(() => false, true)
			);

			await fireEvent.click(trigger(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("open", undefined);
		});

		it("plays select once (never close) when a different model is picked", async () => {
			const { container } = renderPicker(
				{},
				composerContext(() => false, true)
			);
			await openMenu(container);
			play.mockClear();

			await fireEvent.click(options(container)[2]!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays close, not select, when re-picking the already-selected model", async () => {
			const { container } = renderPicker(
				{ value: "pro" },
				composerContext(() => false, true)
			);
			await openMenu(container);
			play.mockClear();

			await fireEvent.click(options(container)[1]!);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays close exactly once on Escape", async () => {
			const { container } = renderPicker(
				{},
				composerContext(() => false, true)
			);
			const list = await openMenu(container);
			play.mockClear();

			await fireEvent.keyDown(list, { key: "Escape" });

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays close exactly once on a press outside", async () => {
			const { container } = renderPicker(
				{},
				composerContext(() => false, true)
			);
			await openMenu(container);
			play.mockClear();

			await fireEvent.mouseDown(document.body);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("close", undefined);
		});

		it("plays nothing by default (no composer context wiring sound on)", async () => {
			const { container } = renderPicker();

			await fireEvent.click(trigger(container));
			await fireEvent.click(options(container)[1]!);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled, via a synthetic dispatch", () => {
			const { container } = renderPicker(
				{},
				composerContext(() => true, true)
			);

			// A synthetic dispatch bypasses the trigger's native disabled attribute,
			// proving the guard lives inside `openMenu()` itself.
			trigger(container).dispatchEvent(
				new MouseEvent("click", { bubbles: true, cancelable: true })
			);

			expect(play).not.toHaveBeenCalled();
		});
	});
});
