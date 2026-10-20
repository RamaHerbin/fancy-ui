import { render, screen, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import RainbowButton from "./RainbowButton.vue";
import { sound } from "../../sound/index.js";

describe("RainbowButton", () => {
	afterEach(cleanup);

	it("renders a button element by default", () => {
		render(RainbowButton);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("renders the hover beam layers, hidden from assistive tech, on both branches", () => {
		for (const props of [{}, { href: "/x" }]) {
			const { container, unmount } = render(RainbowButton, { props });
			const beam = container.querySelector(".rainbow-button__beam");
			const glow = container.querySelector(".rainbow-button__glow");
			expect(beam).toBeTruthy();
			expect(glow).toBeTruthy();
			expect(beam?.getAttribute("aria-hidden")).toBe("true");
			expect(glow?.getAttribute("aria-hidden")).toBe("true");
			unmount();
		}
	});

	it("renders an anchor element when href is provided", () => {
		render(RainbowButton, { props: { href: "/test" } });
		expect(screen.getByRole("link")).toBeInTheDocument();
	});

	it("applies the href to the anchor element", () => {
		render(RainbowButton, { props: { href: "/test" } });
		expect(screen.getByRole("link")).toHaveAttribute("href", "/test");
	});

	it("sets the --rainbow-speed CSS custom property", () => {
		render(RainbowButton, { props: { speed: 5 } });
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--rainbow-speed: 5s");
	});

	it("uses default speed of 2s", () => {
		render(RainbowButton);
		const button = screen.getByRole("button");
		expect(button.getAttribute("style")).toContain("--rainbow-speed: 2s");
	});

	it("applies custom class names", () => {
		render(RainbowButton, { props: { class: "my-custom" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("my-custom");
	});

	it("preserves base classes when custom class is added", () => {
		render(RainbowButton, { props: { class: "extra" } });
		const button = screen.getByRole("button");
		expect(button.className).toContain("rainbow-button");
		expect(button.className).toContain("rounded-xl");
	});

	it("supports disabled state on button", () => {
		render(RainbowButton, { props: { disabled: true } });
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it('sets type="button" by default', () => {
		render(RainbowButton);
		expect(screen.getByRole("button")).toHaveAttribute("type", "button");
	});

	it("allows custom type attribute", () => {
		render(RainbowButton, { props: { type: "submit" } });
		expect(screen.getByRole("button")).toHaveAttribute("type", "submit");
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays the press cue exactly once when sound is enabled and the button is clicked", async () => {
			render(RainbowButton, { props: { sound: true } });

			await fireEvent.click(screen.getByRole("button"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			render(RainbowButton);

			await fireEvent.click(screen.getByRole("button"));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			render(RainbowButton, { props: { sound: true, disabled: true } });
			const button = screen.getByRole("button");

			// Synthetic dispatch bypasses jsdom's native-disabled short-circuit.
			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		// The anchor branch has no native `disabled` attribute at all — only
		// `aria-disabled` — so the JS `if (disabled) return;` guard in
		// handleClick is the ONLY thing keeping a disabled link silent. This
		// proves that guard actually runs on the anchor branch, not just the
		// button branch.
		it("plays nothing on a disabled anchor, even with sound enabled", () => {
			render(RainbowButton, { props: { sound: true, disabled: true, href: "/pricing" } });
			const link = screen.getByRole("link");

			link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		// handleClick is bound separately on both render branches — this proves
		// the anchor branch actually plays the cue too, not just the button.
		it("plays the press cue on an enabled anchor as well as the button", async () => {
			render(RainbowButton, { props: { sound: true, href: "/pricing" } });

			await fireEvent.click(screen.getByRole("link"));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press", undefined);
		});
	});
});

describe("RainbowButton disabled anchor (upstream fix)", () => {
	afterEach(cleanup);

	// aria-disabled and tabindex="-1" do not stop a pointer click from
	// following href, so the disabled path must cancel the default action.
	it("cancels navigation when a disabled anchor is clicked", () => {
		render(RainbowButton, { props: { disabled: true, href: "/pricing" } });
		const event = new MouseEvent("click", { bubbles: true, cancelable: true });

		screen.getByRole("link").dispatchEvent(event);

		expect(event.defaultPrevented).toBe(true);
	});

	it("leaves navigation alone on an enabled anchor", () => {
		render(RainbowButton, { props: { href: "/pricing" } });
		const event = new MouseEvent("click", { bubbles: true, cancelable: true });
		let preventedByComponent: boolean | undefined;
		// Bubble-phase window listener runs after the component's handler:
		// record its verdict, then cancel so jsdom does not attempt navigation.
		const probe = (e: Event) => {
			preventedByComponent = e.defaultPrevented;
			e.preventDefault();
		};
		window.addEventListener("click", probe);

		screen.getByRole("link").dispatchEvent(event);
		window.removeEventListener("click", probe);

		expect(preventedByComponent).toBe(false);
	});
});

describe("RainbowButton public contract", () => {
	afterEach(() => {
		cleanup();
		vi.restoreAllMocks();
	});

	it("calls the consumer onClick exactly once on a button and on an anchor", async () => {
		const handler = vi.fn();
		render(RainbowButton, { props: { onClick: handler } });
		await fireEvent.click(screen.getByRole("button"));
		expect(handler).toHaveBeenCalledTimes(1);
		cleanup();

		const onLink = vi.fn();
		render(RainbowButton, { props: { onClick: onLink, href: "#x" } });
		await fireEvent.click(screen.getByRole("link"));
		expect(onLink).toHaveBeenCalledTimes(1);
	});

	it("calls the consumer onClick once and plays the cue once when sound is enabled", async () => {
		const play = vi.spyOn(sound, "play").mockImplementation(() => {});
		const handler = vi.fn();
		render(RainbowButton, { props: { onClick: handler, sound: true } });

		await fireEvent.click(screen.getByRole("button"));

		expect(handler).toHaveBeenCalledTimes(1);
		expect(play).toHaveBeenCalledTimes(1);
	});

	it("does not call the consumer onClick while disabled (button and anchor)", () => {
		const handler = vi.fn();
		render(RainbowButton, { props: { onClick: handler, disabled: true } });
		screen
			.getByRole("button")
			.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		cleanup();

		render(RainbowButton, { props: { onClick: handler, disabled: true, href: "/x" } });
		screen
			.getByRole("link")
			.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

		expect(handler).not.toHaveBeenCalled();
	});

	it("forwards aria-label and data-* attributes on the button and anchor branches", () => {
		render(RainbowButton, { attrs: { "aria-label": "Go", "data-test": "rb" } });
		const button = screen.getByRole("button");
		expect(button).toHaveAttribute("aria-label", "Go");
		expect(button).toHaveAttribute("data-test", "rb");
		cleanup();

		render(RainbowButton, {
			props: { href: "/x" },
			attrs: { "aria-label": "Go", "data-test": "rb" },
		});
		const link = screen.getByRole("link");
		expect(link).toHaveAttribute("aria-label", "Go");
		expect(link).toHaveAttribute("data-test", "rb");
	});

	it("drops the href of a disabled anchor", () => {
		render(RainbowButton, { props: { disabled: true, href: "/pricing" } });
		const link = screen.getByRole("link");
		expect(link).not.toHaveAttribute("href");
		expect(link).toHaveAttribute("aria-disabled", "true");
	});
});

describe("RainbowButton default slot", () => {
	afterEach(cleanup);

	it("renders the optional default slot in both the button and anchor branches", () => {
		render(RainbowButton, { slots: { default: "Shine" } });
		expect(screen.getByRole("button").textContent).toBe("Shine");
		cleanup();
		render(RainbowButton, { props: { href: "#x" }, slots: { default: "Link" } });
		expect(screen.getByRole("link").textContent).toBe("Link");
	});
});
