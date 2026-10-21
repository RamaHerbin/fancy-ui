import { render, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import Popover from "./Popover.vue";

afterEach(cleanup);

const trigger = () => document.querySelector(".ft-popover-trigger") as HTMLButtonElement;

describe("Popover trigger forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the trigger button", () => {
		render(Popover, { attrs: { id: "pop", "data-testid": "t", "aria-describedby": "hint" } });
		expect(trigger().id).toBe("pop");
		expect(trigger().getAttribute("data-testid")).toBe("t");
		expect(trigger().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires listeners the component does not handle once", async () => {
		const onKeydown = vi.fn();
		const onBlur = vi.fn();
		render(Popover, { attrs: { onKeydown, onBlur } });
		await fireEvent.keyDown(trigger(), { key: "a" });
		await fireEvent.blur(trigger());
		expect(onKeydown).toHaveBeenCalledTimes(1);
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the panel opened", async () => {
		const onClick = vi.fn();
		const onOpenChange = vi.fn();
		render(Popover, { props: { onOpenChange }, attrs: { onClick } });
		await fireEvent.click(trigger());
		expect(onOpenChange).toHaveBeenCalledWith(true);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(trigger().getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps type, aria-expanded and aria-controls authoritative", () => {
		render(Popover, { attrs: { type: "submit", "aria-expanded": "true", "aria-controls": "x" } });
		expect(trigger().type).toBe("button");
		expect(trigger().getAttribute("aria-expanded")).toBe("false");
		expect(trigger().getAttribute("aria-controls")).toBeNull();
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Popover);
		await rerender({ "data-late": "yes" });
		await nextTick();
		expect(trigger().getAttribute("data-late")).toBe("yes");
	});
});
