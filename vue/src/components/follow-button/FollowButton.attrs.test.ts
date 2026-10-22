import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import FollowButton from "./FollowButton.vue";

const mount = render as unknown as (
	comp: unknown,
	options: { props?: Record<string, unknown>; attrs?: Record<string, unknown> }
) => ReturnType<typeof render>;

const button = (c: Element) => c.querySelector("button") as HTMLButtonElement;

describe("FollowButton native attributes", () => {
	afterEach(() => {
		cleanup();
	});

	it("forwards id, aria-* and data-* to the button", () => {
		const { container } = mount(FollowButton, {
			attrs: { id: "fb", "aria-describedby": "hint", "data-testid": "follow" },
		});
		const el = button(container);
		expect(el.id).toBe("fb");
		expect(el.getAttribute("aria-describedby")).toBe("hint");
		expect(el.getAttribute("data-testid")).toBe("follow");
	});

	it("fires a listener the component does not handle once", async () => {
		const onBlur = vi.fn();
		const { container } = mount(FollowButton, { attrs: { onBlur } });
		await fireEvent.blur(button(container));
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("uses a consumer aria-label as the accessible name when `label` is absent", () => {
		const { container } = mount(FollowButton, { attrs: { "aria-label": "Follow the team" } });
		expect(button(container).getAttribute("aria-label")).toBe("Follow the team");
	});

	it("keeps aria-pressed, aria-busy, data-state and type under consumer overrides", () => {
		const { container } = mount(FollowButton, {
			attrs: {
				"aria-pressed": "mixed",
				"aria-busy": "true",
				"data-state": "wrong",
				type: "submit",
			},
		});
		const el = button(container);
		expect(el.getAttribute("aria-pressed")).toBe("false");
		expect(el.hasAttribute("aria-busy")).toBe(false);
		expect(el.getAttribute("data-state")).toBe("idle");
		expect(el.type).toBe("button");
	});

	it("does not call the consumer click while disabled", async () => {
		const onClick = vi.fn();
		const { container } = mount(FollowButton, { props: { disabled: true, onClick } });
		await fireEvent.click(button(container));
		expect(onClick).not.toHaveBeenCalled();
	});

	it("does not call a click bound with a modifier while disabled", async () => {
		const onClickOnce = vi.fn();
		const { container } = mount(FollowButton, {
			props: { disabled: true },
			attrs: { onClickOnce },
		});
		await fireEvent.click(button(container));
		expect(onClickOnce).not.toHaveBeenCalled();
	});
});
