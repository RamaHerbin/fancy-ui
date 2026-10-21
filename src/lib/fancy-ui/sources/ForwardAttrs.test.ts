import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Harness from "./ForwardAttrsHarness.test.svelte";

afterEach(cleanup);

const trigger = () => document.querySelector(".ft-sources-trigger") as HTMLButtonElement;

describe("SourcesTrigger forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(Harness, {
			attrs: { id: "src", "data-testid": "t", "aria-describedby": "hint" },
		});
		expect(trigger().id).toBe("src");
		expect(trigger().getAttribute("data-testid")).toBe("t");
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires a listener the component does not handle once", async () => {
		const onblur = vi.fn();
		const onpointerdown = vi.fn();
		render(Harness, { attrs: { onblur, onpointerdown } });
		await fireEvent.blur(trigger());
		await fireEvent.pointerDown(trigger());
		expect(onblur).toHaveBeenCalledTimes(1);
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once, after the list toggled", async () => {
		const onclick = vi.fn();
		render(Harness, { attrs: { onclick } });
		await fireEvent.click(trigger());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps aria-expanded and aria-controls authoritative and type fixed", () => {
		render(Harness, { attrs: { "aria-expanded": "true", "aria-controls": "x", type: "submit" } });
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
		expect(trigger().getAttribute("aria-controls")).not.toBe("x");
		expect(trigger().type).toBe("button");
	});
});
