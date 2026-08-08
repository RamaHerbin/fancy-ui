import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Popover from "./Popover.svelte";

// Spies on the real `anchorPosition` action instead of replacing it, so
// positioning assertions check what Popover asked for while the action
// itself still runs for real (jsdom doesn't compute layout, but the action
// must not throw either).
vi.mock("../_internals/anchor-position.js", async (importOriginal) => {
	const actual = await importOriginal<typeof import("../_internals/anchor-position.js")>();
	return { ...actual, anchorPosition: vi.fn(actual.anchorPosition) };
});

import { anchorPosition } from "../_internals/anchor-position.js";

function textSnippet(text: string) {
	return createRawSnippet(() => ({ render: () => `<span>${text}</span>` }));
}

function panelSnippet() {
	return createRawSnippet(() => ({
		render: () =>
			`<div><input data-testid="panel-input" /><button data-testid="panel-button">Close</button></div>`,
	}));
}

function triggerButton(container: HTMLElement): HTMLButtonElement {
	return container.querySelector(".ft-popover-trigger") as HTMLButtonElement;
}

function panel(container: HTMLElement): HTMLElement | null {
	// Portalled to document.body, not inside `container`.
	return document.querySelector(".ft-popover-content");
}

describe("Popover", () => {
	afterEach(() => {
		cleanup();
		document.body.querySelectorAll(".ft-popover-content").forEach((el) => el.remove());
		vi.mocked(anchorPosition).mockClear();
	});

	it("renders closed by default, with aria-expanded false", () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		const btn = triggerButton(container);
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(panel(container)).toBeNull();
	});

	it("opens on trigger click, and closes on a second click", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});
		const btn = triggerButton(container);

		await fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("true");
		expect(panel(container)).not.toBeNull();

		await fireEvent.click(btn);
		expect(btn.getAttribute("aria-expanded")).toBe("false");
		expect(panel(container)).toBeNull();
	});

	it("aria-controls is absent while closed and points at the panel's real id once open", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});
		const btn = triggerButton(container);
		// Nothing in the DOM to point at yet — the panel doesn't mount until
		// open, so the attribute itself must not be there either.
		expect(btn.hasAttribute("aria-controls")).toBe(false);

		await fireEvent.click(btn);
		const controls = btn.getAttribute("aria-controls");
		expect(controls).toBeTruthy();
		const content = panel(container);
		expect(content?.id).toBe(controls);

		await fireEvent.click(btn);
		expect(btn.hasAttribute("aria-controls")).toBe(false);
	});

	// The three ways this codebase expects a bindable prop plus its change
	// callback to work: bind:, the callback alone, and a plain non-bound
	// value plus that same callback.
	it("round-trips through bind:open", async () => {
		let open = false;
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				get open() {
					return open;
				},
				set open(v: boolean) {
					open = v;
				},
			},
		});

		await fireEvent.click(triggerButton(container));
		expect(open).toBe(true);
	});

	it("works uncontrolled with only onOpenChange", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet(), onOpenChange },
		});

		await fireEvent.click(triggerButton(container));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel(container)).not.toBeNull();
	});

	it("works with a plain non-bound open plus onOpenChange", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				open: false,
				onOpenChange,
			},
		});

		await fireEvent.click(triggerButton(container));
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(panel(container)).not.toBeNull();
	});

	it("passes side, align and offset through to the anchorPosition action", async () => {
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				side: "right",
				align: "start",
				offset: 20,
			},
		});

		await fireEvent.click(triggerButton(container));
		await tick();

		expect(anchorPosition).toHaveBeenCalled();
		const [, opts] = vi.mocked(anchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "right", align: "start", offset: 20 });
		expect(opts.anchor()).toBe(triggerButton(container));
	});

	it("defaults to side bottom, align center, offset 8", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await tick();

		const [, opts] = vi.mocked(anchorPosition).mock.calls.at(-1)!;
		expect(opts).toMatchObject({ side: "bottom", align: "center", offset: 8 });
	});

	it("closes on Escape", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet(), onOpenChange },
		});

		await fireEvent.click(triggerButton(container));
		expect(panel(container)).not.toBeNull();

		await fireEvent.keyDown(document, { key: "Escape" });
		expect(onOpenChange).toHaveBeenCalledWith(false);
		await waitFor(() => expect(panel(container)).toBeNull());
	});

	it("closes on an outside click", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		expect(panel(container)).not.toBeNull();

		await fireEvent.pointerDown(outside);
		await waitFor(() => expect(panel(container)).toBeNull());
		outside.remove();
	});

	it("does not close on Escape or outside click when dismissible is false", async () => {
		const outside = document.createElement("button");
		document.body.appendChild(outside);
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				dismissible: false,
			},
		});

		await fireEvent.click(triggerButton(container));
		expect(panel(container)).not.toBeNull();

		await fireEvent.keyDown(document, { key: "Escape" });
		expect(panel(container)).not.toBeNull();

		await fireEvent.pointerDown(outside);
		expect(panel(container)).not.toBeNull();
		outside.remove();
	});

	it("clicking the trigger again to close does not get treated as an outside click that fires twice", async () => {
		const onOpenChange = vi.fn();
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet(), onOpenChange },
		});
		const btn = triggerButton(container);

		await fireEvent.click(btn);
		onOpenChange.mockClear();
		await fireEvent.click(btn);

		expect(onOpenChange).toHaveBeenCalledTimes(1);
		expect(onOpenChange).toHaveBeenCalledWith(false);
	});

	it("moves focus into the panel on open, to its first focusable descendant", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});

		await fireEvent.click(triggerButton(container));
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});
	});

	it("returns focus to the trigger on close", async () => {
		const { container } = render(Popover, {
			props: { trigger: textSnippet("Options"), children: panelSnippet() },
		});
		const btn = triggerButton(container);

		btn.focus();
		await fireEvent.click(btn);
		await waitFor(() => {
			expect(document.activeElement).toBe(document.querySelector('[data-testid="panel-input"]'));
		});

		await fireEvent.click(btn);
		await waitFor(() => expect(document.activeElement).toBe(btn));
	});

	it("merges the class prop onto the panel", async () => {
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				class: "w-[220px]",
			},
		});

		await fireEvent.click(triggerButton(container));
		const content = panel(container);
		expect(content?.className).toContain("w-[220px]");
		expect(content?.className).toContain("ft-popover-content");
	});

	it("binds the panel element via ref", async () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(Popover, {
			props: {
				trigger: textSnippet("Options"),
				children: panelSnippet(),
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});

		await fireEvent.click(triggerButton(container));
		await tick();
		expect(ref).toBe(panel(container));
	});
});
