import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import CopyButton from "./CopyButton.vue";

const mount = render as unknown as (
	comp: unknown,
	options: { props?: Record<string, unknown>; attrs?: Record<string, unknown> }
) => ReturnType<typeof render>;

function stubClipboard(writeText: unknown) {
	Object.defineProperty(navigator, "clipboard", {
		value: writeText === undefined ? undefined : { writeText },
		configurable: true,
	});
}

function button(container: Element): HTMLButtonElement {
	return container.querySelector("button") as HTMLButtonElement;
}

describe("CopyButton native attributes", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("forwards id, aria-* and data-* to the button", () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = mount(CopyButton, {
			props: { value: "x" },
			attrs: { id: "cp", "aria-describedby": "hint", "data-testid": "copy" },
		});
		const el = button(container);
		expect(el.id).toBe("cp");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("copy");
	});

	it("fires a listener the component does not handle once", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const onBlur = vi.fn();
		const { container } = mount(CopyButton, { props: { value: "x" }, attrs: { onBlur } });
		await fireEvent.blur(button(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("calls the consumer click once, synchronously, with the copy already started", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		let writesSeen = -1;
		const onClick = vi.fn(() => {
			writesSeen = writeText.mock.calls.length;
		});
		const { container } = mount(CopyButton, { props: { value: "x" }, attrs: { onClick } });
		await fireEvent.click(button(container));
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(writesSeen).toBe(1);
	});

	it("does not call the consumer click while disabled", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const onClick = vi.fn();
		const { container } = mount(CopyButton, {
			props: { value: "x", disabled: true },
			attrs: { onClick },
		});
		await fireEvent.click(button(container));
		expect(onClick).not.toHaveBeenCalled();
	});

	it("stays type=button inside a form when type=submit is forwarded", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const form = document.body.appendChild(document.createElement("form"));
		const onSubmit = vi.fn((event: Event) => event.preventDefault());
		form.addEventListener("submit", onSubmit);
		const { container } = (
			render as unknown as (
				comp: unknown,
				options: Record<string, unknown>
			) => ReturnType<typeof render>
		)(CopyButton, { container: form, props: { value: "x" }, attrs: { type: "submit" } });
		const el = button(container);
		expect(el.type).toBe("button");
		await fireEvent.click(el);
		expect(onSubmit).not.toHaveBeenCalled();
		form.remove();
	});
});
