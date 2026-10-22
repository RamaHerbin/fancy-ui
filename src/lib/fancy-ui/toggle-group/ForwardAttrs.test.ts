import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Harness from "./ForwardAttrsHarness.test.svelte";

afterEach(cleanup);

const alpha = () => document.querySelector('[data-value="a"]') as HTMLButtonElement;

describe("ToggleGroupItem forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(Harness, {
			attrs: { id: "mine", "data-testid": "item", "aria-describedby": "hint" },
		});
		expect(alpha().id).toBe("mine");
		expect(alpha().getAttribute("data-testid")).toBe("item");
		expect(alpha().getAttribute("aria-describedby")).toBe("hint");
	});

	it("uses a consumer aria-label when no label prop is given", () => {
		render(Harness, { attrs: { "aria-label": "Bold" } });
		expect(alpha().getAttribute("aria-label")).toBe("Bold");
	});

	it("fires listeners the component does not handle once", async () => {
		const onblur = vi.fn();
		const onpointerdown = vi.fn();
		render(Harness, { attrs: { onblur, onpointerdown } });
		await fireEvent.blur(alpha());
		await fireEvent.pointerDown(alpha());
		expect(onblur).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick and onkeydown once after the internal logic", async () => {
		const onclick = vi.fn();
		const onkeydown = vi.fn();
		render(Harness, { attrs: { onclick, onkeydown } });
		await fireEvent.click(alpha());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(alpha().getAttribute("aria-pressed")).toBe("true");
		await fireEvent.keyDown(alpha(), { key: "ArrowRight" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(document.querySelector('[data-value="b"]')?.getAttribute("tabindex")).toBe("0");
	});

	it("calls neither listener when disabled", async () => {
		const onclick = vi.fn();
		const onkeydown = vi.fn();
		render(Harness, { disabled: true, attrs: { onclick, onkeydown } });
		await fireEvent.click(alpha());
		await fireEvent.keyDown(alpha(), { key: "Home" });
		expect(onclick).not.toHaveBeenCalled();
		expect(onkeydown).not.toHaveBeenCalled();
	});

	it("keeps aria-pressed, disabled and the roving tabindex authoritative", () => {
		render(Harness, {
			disabled: true,
			attrs: { "aria-pressed": "true", tabindex: "5" },
		});
		expect(alpha().getAttribute("aria-pressed")).toBe("false");
		expect(alpha().disabled).toBe(true);
		expect(alpha().getAttribute("tabindex")).toBe("-1");
	});
});
