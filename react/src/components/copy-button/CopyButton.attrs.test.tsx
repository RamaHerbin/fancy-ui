import { render, cleanup, fireEvent, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./CopyButton.js";

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
		const { container } = render(
			<CopyButton value="x" id="cp" aria-describedby="hint" data-testid="copy" />
		);
		const el = button(container);
		expect(el.id).toBe("cp");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("copy");
	});

	it("fires a listener the component does not handle once", () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const onBlur = vi.fn();
		const { container } = render(<CopyButton value="x" onBlur={onBlur} />);
		fireEvent.blur(button(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("calls the consumer click once, after the copy has been written", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const onClick = vi.fn(() => {
			expect(writeText).toHaveBeenCalledTimes(1);
		});
		const { container } = render(<CopyButton value="x" onClick={onClick} />);
		fireEvent.click(button(container));
		await waitFor(() => expect(onClick).toHaveBeenCalledTimes(1));
	});

	it("does not call the consumer click while disabled", () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const onClick = vi.fn();
		const { container } = render(<CopyButton value="x" disabled onClick={onClick} />);
		fireEvent.click(button(container));
		expect(onClick).not.toHaveBeenCalled();
	});
});
