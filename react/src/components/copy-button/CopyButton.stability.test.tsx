import { render, cleanup, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CopyButton } from "./CopyButton.js";

function stubClipboard(writeText: unknown) {
	Object.defineProperty(navigator, "clipboard", {
		value: writeText === undefined ? undefined : { writeText },
		configurable: true,
	});
}

function stubReducedMotion(reduce: boolean) {
	window.matchMedia = vi.fn().mockImplementation((query: string) => ({
		matches: reduce && query.includes("reduce"),
		media: query,
		addEventListener: vi.fn(),
		removeEventListener: vi.fn(),
		addListener: vi.fn(),
		removeListener: vi.fn(),
	})) as unknown as typeof window.matchMedia;
}

const button = (c: HTMLElement) => c.querySelector("button") as HTMLButtonElement;
const cell = (c: HTMLElement) => c.querySelector(".ft-copybtn__label") as HTMLElement | null;
const live = (c: HTMLElement) => c.querySelector(".ft-copybtn__live") as HTMLElement;
const ghosts = (c: HTMLElement) => [...c.querySelectorAll(".ft-copybtn__ghost")] as HTMLElement[];
const leaving = (c: HTMLElement) => c.querySelector(".ft-copybtn__leave") as HTMLElement | null;
const advance = (ms: number) => act(async () => void (await vi.advanceTimersByTimeAsync(ms)));
const flush = () => advance(0);
const click = (el: Element) => act(async () => void fireEvent.click(el));

describe("CopyButton width stability and text swap", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		stubReducedMotion(false);
	});
	afterEach(() => {
		cleanup();
		vi.useRealTimers();
		stubClipboard(undefined);
		delete (window as { matchMedia?: unknown }).matchMedia;
	});

	it("reserves the widest label with three hidden ghosts in one cell", () => {
		const { container } = render(
			<CopyButton
				{...{ value: "x", label: "Copy link", copiedLabel: "Link copied", errorLabel: "Nope" }}
			/>
		);
		expect(cell(container)).not.toBeNull();
		const g = ghosts(container);
		expect(g.map((n) => n.textContent)).toEqual(["Copy link", "Link copied", "Nope"]);
		for (const n of g) expect(n.getAttribute("aria-hidden")).toBe("true");
		expect(cell(container)!.contains(live(container))).toBe(true);
		expect(live(container).textContent).toBe("Copy link");
		expect(live(container).hasAttribute("aria-hidden")).toBe(false);
	});

	it("renders no cell and no ghosts when iconOnly", () => {
		const { container } = render(<CopyButton {...{ value: "x", iconOnly: true }} />);
		expect(button(container).getAttribute("aria-label")).toBe("Copy");
		expect(cell(container)).toBeNull();
		expect(ghosts(container)).toHaveLength(0);
		expect(live(container).className).toContain("sr-only");
	});

	it("keeps the aria-live span for custom children, with no cell", () => {
		const { container } = render(
			<CopyButton value="x">
				<b>icon</b>
			</CopyButton>
		);
		expect(ghosts(container)).toHaveLength(0);
		expect(live(container).getAttribute("aria-live")).toBe("polite");
		expect(live(container).className).toContain("sr-only");
	});

	it("shows the outgoing label for 80 ms while the new one arrives", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(<CopyButton {...{ value: "x" }} />);
		expect(leaving(container)).toBeNull();
		expect(live(container).hasAttribute("data-swapped")).toBe(false);

		await click(button(container));
		await flush();

		expect(live(container).textContent).toBe("Copied");
		expect(live(container).hasAttribute("data-swapped")).toBe(true);
		expect(leaving(container)?.textContent).toBe("Copy");
		expect(leaving(container)?.getAttribute("aria-hidden")).toBe("true");

		await advance(79);
		expect(leaving(container)).not.toBeNull();
		await advance(2);
		expect(leaving(container)).toBeNull();
	});

	it("skips the outgoing layer entirely under reduced motion", async () => {
		stubReducedMotion(true);
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(<CopyButton {...{ value: "x" }} />);
		await click(button(container));
		await flush();
		expect(live(container).textContent).toBe("Copied");
		expect(leaving(container)).toBeNull();
	});

	it("reports the value that was written when `value` changes in flight", async () => {
		let resolve!: () => void;
		const writeText = vi.fn().mockReturnValue(new Promise<void>((r) => (resolve = r)));
		stubClipboard(writeText);
		const onCopy = vi.fn();
		const { container, rerender } = render(<CopyButton {...{ value: "first", onCopy }} />);
		await click(button(container));
		rerender(<CopyButton {...{ value: "second", onCopy }} />);
		resolve();
		await flush();
		expect(writeText).toHaveBeenCalledWith("first");
		expect(onCopy).toHaveBeenCalledWith("first", true);
	});

	it("reverts on the next tick when resetMs is 0", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container } = render(<CopyButton {...{ value: "x", resetMs: 0 }} />);
		await click(button(container));
		await flush();
		await advance(10);
		expect(live(container).textContent).toBe("Copy");
	});

	it("survives a double click and settles back to idle", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const { container } = render(<CopyButton {...{ value: "x", resetMs: 500 }} />);
		await click(button(container));
		await click(button(container));
		await flush();
		expect(writeText).toHaveBeenCalledTimes(2);
		expect(live(container).textContent).toBe("Copied");
		await advance(600);
		expect(live(container).textContent).toBe("Copy");
		expect(leaving(container)).toBeNull();
	});

	it("reports failure without a clipboard and shows the error label", async () => {
		stubClipboard(undefined);
		const onCopy = vi.fn();
		const { container } = render(<CopyButton {...{ value: "x", onCopy }} />);
		await click(button(container));
		await flush();
		expect(onCopy).toHaveBeenCalledWith("x", false);
		expect(live(container).textContent).toBe("Copy failed");
	});

	it("does nothing while disabled", async () => {
		const writeText = vi.fn().mockResolvedValue(undefined);
		stubClipboard(writeText);
		const onCopy = vi.fn();
		const { container } = render(<CopyButton {...{ value: "x", disabled: true, onCopy }} />);
		await click(button(container));
		await flush();
		expect(writeText).not.toHaveBeenCalled();
		expect(onCopy).not.toHaveBeenCalled();
		expect(live(container).textContent).toBe("Copy");
	});

	it("keeps the copied label when `label` changes in the copied state, then adopts it", async () => {
		stubClipboard(vi.fn().mockResolvedValue(undefined));
		const { container, rerender } = render(<CopyButton {...{ value: "x", resetMs: 300 }} />);
		await click(button(container));
		await flush();
		rerender(<CopyButton {...{ value: "x", resetMs: 300, label: "Duplicate" }} />);
		expect(live(container).textContent).toBe("Copied");
		await advance(400);
		expect(live(container).textContent).toBe("Duplicate");
		expect(ghosts(container)[0]?.textContent).toBe("Duplicate");
	});
});
