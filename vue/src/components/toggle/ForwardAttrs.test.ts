import { render, cleanup, fireEvent } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import Toggle from "./Toggle.vue";

afterEach(cleanup);

const button = () => document.querySelector("button") as HTMLButtonElement;

describe("Toggle forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(Toggle, {
			props: { label: "Bold" },
			attrs: { id: "mine", "data-testid": "tg", "aria-describedby": "hint" },
		});
		expect(button().id).toBe("mine");
		expect(button().getAttribute("data-testid")).toBe("tg");
		expect(button().getAttribute("aria-describedby")).toBe("hint");
	});

	it("uses a consumer aria-label when no label prop is given", () => {
		render(Toggle, { attrs: { "aria-label": "Italic" } });
		expect(button().getAttribute("aria-label")).toBe("Italic");
	});

	it("fires listeners the component does not handle once", async () => {
		const onKeydown = vi.fn();
		const onBlur = vi.fn();
		render(Toggle, { attrs: { onKeydown, onBlur } });
		await fireEvent.keyDown(button(), { key: "a" });
		await fireEvent.blur(button());
		expect(onKeydown).toHaveBeenCalledTimes(1);
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the press state changed", async () => {
		const onClick = vi.fn();
		const onPressedChange = vi.fn();
		render(Toggle, { props: { onPressedChange }, attrs: { onClick } });
		await fireEvent.click(button());
		expect(onPressedChange).toHaveBeenCalledWith(true);
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(button().getAttribute("aria-pressed")).toBe("true");
	});

	it("does not call the consumer onClick while disabled", async () => {
		const onClick = vi.fn();
		render(Toggle, { props: { disabled: true }, attrs: { onClick } });
		await fireEvent.click(button());
		expect(onClick).not.toHaveBeenCalled();
	});

	it("keeps aria-pressed and type authoritative", () => {
		render(Toggle, { attrs: { "aria-pressed": "mixed", type: "submit" } });
		expect(button().getAttribute("aria-pressed")).toBe("false");
		expect(button().type).toBe("button");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Toggle);
		await rerender({ "data-late": "yes" });
		await nextTick();
		expect(button().getAttribute("data-late")).toBe("yes");
	});
});
