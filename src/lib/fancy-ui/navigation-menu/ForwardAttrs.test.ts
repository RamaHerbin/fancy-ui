import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Harness from "./ForwardAttrsHarness.test.svelte";

afterEach(cleanup);

const first = () => document.querySelector('[data-value="products"]') as HTMLButtonElement;

describe("NavigationMenuTrigger forwards native attributes", () => {
	it("puts data-testid, aria-describedby and title on the button", () => {
		render(Harness, {
			attrs: { "data-testid": "nav", "aria-describedby": "hint", title: "Products" },
		});
		expect(first().getAttribute("data-testid")).toBe("nav");
		expect(first().getAttribute("aria-describedby")).toBe("hint");
		expect(first().title).toBe("Products");
	});

	it("fires listeners the component does not handle once", async () => {
		const onblur = vi.fn();
		const onpointerdown = vi.fn();
		render(Harness, { attrs: { onblur, onpointerdown } });
		await fireEvent.blur(first());
		await fireEvent.pointerDown(first());
		expect(onblur).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once, after the panel toggled", async () => {
		const onclick = vi.fn();
		render(Harness, { attrs: { onclick } });
		await fireEvent.click(first());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(first().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs the consumer onkeydown once, after the internal handling", async () => {
		const onkeydown = vi.fn();
		render(Harness, { attrs: { onkeydown } });
		await fireEvent.keyDown(first(), { key: "ArrowDown" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(first().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs consumer pointer listeners once", async () => {
		const onpointerenter = vi.fn();
		const onpointerleave = vi.fn();
		render(Harness, { attrs: { onpointerenter, onpointerleave } });
		await fireEvent.pointerEnter(first());
		await fireEvent.pointerLeave(first());
		expect(onpointerenter).toHaveBeenCalledTimes(1);
		expect(onpointerleave).toHaveBeenCalledTimes(1);
	});

	it("keeps id, aria-expanded, aria-controls and the roving tabindex authoritative", () => {
		render(Harness, {
			attrs: { id: "mine", "aria-expanded": "true", "aria-controls": "x", tabindex: "5" },
		});
		expect(first().id).not.toBe("mine");
		expect(first().getAttribute("aria-expanded")).toBe("false");
		expect(first().getAttribute("aria-controls")).toBeNull();
		expect(first().getAttribute("tabindex")).toBe("0");
	});
});
