import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import CopyButton from "./CopyButton.svelte";

function stubClipboard(writeText: unknown) {
	Object.defineProperty(navigator, "clipboard", {
		value: writeText === undefined ? undefined : { writeText },
		configurable: true,
	});
}

function button(container: HTMLElement): HTMLButtonElement {
	return container.querySelector("button") as HTMLButtonElement;
}

describe("CopyButton native attributes", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("forwards id, aria-* and data-* to the button", () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(CopyButton, {
			props: { value: "x", id: "cp", "aria-describedby": "hint", "data-testid": "copy" },
		});
		const el = button(container);
		expect(el.id).toBe("cp");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("copy");
	});

	it("fires a listener the component does not handle once", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const onblur = vi.fn();
		const { container } = render(CopyButton, { props: { value: "x", onblur } });
		await fireEvent.blur(button(container));
		expect(onblur).toHaveBeenCalledTimes(1);
	});

	it("calls the consumer click once, synchronously, with the copy already started", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		let writesSeen = -1;
		const onclick = vi.fn(() => {
			writesSeen = writeText.mock.calls.length;
		});
		const { container } = render(CopyButton, { props: { value: "x", onclick } });
		await fireEvent.click(button(container));
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(writesSeen).toBe(1);
	});

	it("does not call the consumer click while disabled", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const onclick = vi.fn();
		const { container } = render(CopyButton, { props: { value: "x", disabled: true, onclick } });
		await fireEvent.click(button(container));
		expect(onclick).not.toHaveBeenCalled();
	});
});
