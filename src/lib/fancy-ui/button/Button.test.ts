import { render, cleanup, fireEvent, waitFor } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, describe, it, expect, vi, beforeEach } from "vitest";
import Button from "./Button.svelte";
import LeadHarness from "./ButtonLeadHarness.test.svelte";
import type { ButtonSize, ButtonVariant } from "./types.js";
import { sound } from "../sound/sound.svelte.js";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function root(container: HTMLElement) {
	return container.firstElementChild as HTMLElement;
}

/** Replaces `window.matchMedia` wholesale — the pattern the rest of the repo
 * uses. `prefersReducedMotion()` resolves it fresh on every call, and the
 * lead fade reads it from its transition params thunk, so an override
 * installed before a render is visible to the very next swap. */
function stubReducedMotion(matches: boolean) {
	vi.stubGlobal("matchMedia", (query: string) => ({
		matches,
		media: query,
		onchange: null,
		addEventListener: () => {},
		removeEventListener: () => {},
		dispatchEvent: () => false,
		addListener: () => {},
		removeListener: () => {},
	}));
}

describe("Button", () => {
	afterEach(() => {
		cleanup();
		vi.unstubAllGlobals();
	});

	it("renders a real button with children as its label", () => {
		const { container } = render(Button, { props: { children: snippet("<span>Save</span>") } });
		const el = root(container);

		expect(el.tagName).toBe("BUTTON");
		expect(el.getAttribute("type")).toBe("button");
		expect(el.textContent?.trim()).toBe("Save");
	});

	it.each([
		["primary", "bg-primary"],
		["secondary", "bg-secondary"],
		["outline", "border-border"],
		["ghost", "hover:bg-accent"],
		["accent", "ft-btn--accent"],
		["destructive", "border-destructive/35"],
	] satisfies Array<[ButtonVariant, string]>)(
		"variant %s carries its own class (%s)",
		(variant, marker) => {
			const { container } = render(Button, {
				props: { variant, children: snippet("<span>Go</span>") },
			});
			expect(root(container).className).toContain(marker);
		}
	);

	it.each([
		["sm", "px-[12px]", "text-[12px]", "rounded-[6px]"],
		["md", "px-[18px]", "text-[13px]", "rounded-[8px]"],
		["lg", "px-[24px]", "text-[14px]", "rounded-[10px]"],
	] satisfies Array<[ButtonSize, string, string, string]>)(
		"size %s carries its own geometry",
		(size, padding, font, radius) => {
			const { container } = render(Button, {
				props: { size, children: snippet("<span>Go</span>") },
			});
			const className = root(container).className;
			expect(className).toContain(padding);
			expect(className).toContain(font);
			// A radius swap between sizes doesn't move padding or font-size, so it
			// needs its own assertion — the two above would pass unchanged.
			expect(className).toContain(radius);
		}
	);

	it("stretches to fill its container when fullWidth is set", () => {
		const { container } = render(Button, {
			props: { fullWidth: true, children: snippet("<span>Go</span>") },
		});
		expect(root(container).className).toContain("w-full");
	});

	it("calls onclick when activated", async () => {
		const onclick = vi.fn();
		const { container } = render(Button, {
			props: { onclick, children: snippet("<span>Go</span>") },
		});

		await fireEvent.click(root(container));
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it("renders iconStart before the label when not loading", () => {
		const { container } = render(Button, {
			props: {
				iconStart: snippet('<span class="my-icon-start">+</span>'),
				children: snippet("<span>New</span>"),
			},
		});
		expect(container.querySelector(".my-icon-start")).toBeTruthy();
	});

	it("renders iconEnd after the label", () => {
		const { container } = render(Button, {
			props: {
				iconEnd: snippet('<span class="my-icon-end">→</span>'),
				children: snippet("<span>Continue</span>"),
			},
		});
		expect(container.querySelector(".my-icon-end")).toBeTruthy();
	});

	it("replaces iconStart with the spinner while loading, instead of rendering both", () => {
		const { container } = render(Button, {
			props: {
				loading: true,
				iconStart: snippet('<span class="my-icon-start">+</span>'),
				children: snippet("<span>Save</span>"),
			},
		});

		expect(container.querySelector(".ft-btn-spinner")).toBeTruthy();
		expect(container.querySelector(".my-icon-start")).toBeFalsy();
	});

	it("shows a spinner and marks the button busy while loading, without disabling it", () => {
		const { container } = render(Button, {
			props: { loading: true, children: snippet("<span>Save</span>") },
		});
		const el = root(container) as HTMLButtonElement;

		expect(el.getAttribute("aria-busy")).toBe("true");
		expect(container.querySelector(".ft-btn-spinner")).toBeTruthy();
		// Loading reads as "working", not "unavailable" — the mockup keeps the
		// button at full opacity, so it must not pick up `disabled`'s dimming.
		expect(el.disabled).toBe(false);
	});

	it("blocks the click callback while loading", () => {
		const onclick = vi.fn();
		const { container } = render(Button, {
			props: { loading: true, onclick, children: snippet("<span>Save</span>") },
		});

		root(container).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(onclick).not.toHaveBeenCalled();
	});

	it("disables the native button and blocks the click callback", () => {
		const onclick = vi.fn();
		const { container } = render(Button, {
			props: { disabled: true, onclick, children: snippet("<span>Go</span>") },
		});
		const el = root(container) as HTMLButtonElement;

		expect(el.disabled).toBe(true);
		// A synthetic dispatch walks straight past the native `disabled` guard in
		// jsdom, unlike a real press — this is what proves the JS-level guard, not
		// just the HTML attribute, is doing the blocking.
		el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(onclick).not.toHaveBeenCalled();
	});

	it("renders an anchor instead of a button when href is set", () => {
		const { container } = render(Button, {
			props: { href: "https://example.com", children: snippet("<span>Visit</span>") },
		});
		const el = root(container);

		expect(el.tagName).toBe("A");
		expect(el.getAttribute("href")).toBe("https://example.com");
	});

	it("strips href and adds aria-disabled/tabindex=-1 on a disabled anchor, and swallows the click", () => {
		const onclick = vi.fn();
		const { container } = render(Button, {
			props: {
				href: "https://example.com",
				disabled: true,
				onclick,
				children: snippet("<span>Visit</span>"),
			},
		});
		const el = root(container);

		expect(el.getAttribute("href")).toBeNull();
		expect(el.getAttribute("aria-disabled")).toBe("true");
		expect(el.getAttribute("tabindex")).toBe("-1");
		// The dimming hook: a truly disabled anchor should look the part.
		expect(el.getAttribute("data-disabled")).toBe("true");

		el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(onclick).not.toHaveBeenCalled();
	});

	it("makes a loading anchor inert: strips href, marks it aria-disabled, and drops it from the tab order", () => {
		// This is the regression case for the anchor-branch loading bug: href and
		// target drive real browser behaviour — middle-click, "open link in new
		// tab" from the context menu — that never reaches `onclick` at all, so
		// `disabled ? undefined : href` alone left a loading link fully navigable.
		const onclick = vi.fn();
		const { container } = render(Button, {
			props: {
				href: "https://example.com",
				loading: true,
				onclick,
				children: snippet("<span>Pay</span>"),
			},
		});
		const el = root(container);

		expect(el.getAttribute("href")).toBeNull();
		expect(el.getAttribute("target")).toBeNull();
		expect(el.getAttribute("aria-disabled")).toBe("true");
		expect(el.getAttribute("tabindex")).toBe("-1");
		expect(el.getAttribute("aria-busy")).toBe("true");

		el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(onclick).not.toHaveBeenCalled();
	});

	it("does not dim a loading (not disabled) anchor the way a disabled one is dimmed", () => {
		// `aria-disabled` goes true for loading too (see the test above), but the
		// dimming hook must stay tied to `disabled` alone, or the mockup's "loading
		// stays full-strength" swatch would regress the moment loading is on an <a>.
		const { container } = render(Button, {
			props: {
				href: "https://example.com",
				loading: true,
				children: snippet("<span>Pay</span>"),
			},
		});
		expect(root(container).hasAttribute("data-disabled")).toBe(false);
	});

	it("forces a safe rel when target=_blank, keeping the caller's own tokens", () => {
		const { container } = render(Button, {
			props: {
				href: "https://example.com",
				target: "_blank",
				rel: "nofollow",
				children: snippet("<span>Visit</span>"),
			},
		});
		const rel = root(container).getAttribute("rel")?.split(/\s+/) ?? [];

		expect(rel).toEqual(expect.arrayContaining(["noopener", "noreferrer", "nofollow"]));
	});

	it("leaves rel untouched without target=_blank", () => {
		const { container } = render(Button, {
			props: {
				href: "https://example.com",
				rel: "nofollow",
				children: snippet("<span>Visit</span>"),
			},
		});
		expect(root(container).getAttribute("rel")).toBe("nofollow");
	});

	it("sets aria-label for an icon-only button", () => {
		const { container } = render(Button, {
			props: { label: "Close", children: snippet('<svg aria-hidden="true"></svg>') },
		});
		expect(root(container).getAttribute("aria-label")).toBe("Close");
	});

	it("merges a caller class alongside the base classes, letting it win over a conflicting utility", () => {
		const { container } = render(Button, {
			props: {
				variant: "primary",
				class: "bg-red-500 my-button",
				children: snippet("<span>Go</span>"),
			},
		});
		const classList = root(container).className.split(/\s+/);

		expect(classList).toContain("my-button");
		expect(classList).toContain("bg-red-500");
		// tailwind-merge drops the variant's own unconditional background utility
		// once a conflicting one arrives through `class` — that is the "wins"
		// part. `hover:bg-primary/90` is a different variant group, so it is left
		// alone; only the base `bg-primary` is a real conflict with `bg-red-500`.
		expect(classList).not.toContain("bg-primary");
	});

	// The scoped `<style>` now declares a `transition` shorthand on this same
	// element, so the press scale can join the colour channel under
	// `prefers-reduced-motion: no-preference`. Svelte's scoped CSS is unlayered
	// and Tailwind's utilities sit in `@layer utilities`, so leaving
	// `transition-colors` on the class string would read as a colour transition
	// that silently never ran.
	it("drops the transition-colors utility in favour of the hand-written channel", () => {
		const { container } = render(Button, { props: { children: snippet("<span>Go</span>") } });
		expect(root(container).className).not.toContain("transition-colors");
	});

	describe("lead slot", () => {
		const leadProps = {
			iconStart: snippet('<span class="my-icon-start">+</span>'),
			children: snippet("<span>Save</span>"),
		};

		function toggleOf(container: HTMLElement) {
			return container.querySelector<HTMLButtonElement>('[data-testid="toggle"]')!;
		}

		it("wraps iconStart in the shared lead cell, exposed to assistive tech", () => {
			const { container } = render(Button, { props: leadProps });
			const lead = container.querySelector(".ft-btn-lead");

			expect(lead).toBeTruthy();
			expect(lead?.querySelector(".my-icon-start")).toBeTruthy();
			// Not loading: nothing here is decorative, so the caller's own icon
			// markup keeps whatever accessible treatment the caller gave it.
			expect(lead?.hasAttribute("aria-hidden")).toBe(false);
		});

		it("renders no lead cell at all when there is neither a spinner nor an iconStart", () => {
			const { container } = render(Button, {
				props: { children: snippet("<span>Save</span>") },
			});
			expect(container.querySelector(".ft-btn-lead")).toBeNull();
		});

		it("keeps aria-busy on the control and aria-hidden on the cell, never the other way round", () => {
			const { container } = render(Button, { props: { ...leadProps, loading: true } });
			const el = root(container);
			const lead = container.querySelector(".ft-btn-lead")!;

			expect(el.getAttribute("aria-busy")).toBe("true");
			expect(el.hasAttribute("aria-hidden")).toBe(false);
			expect(lead.getAttribute("aria-hidden")).toBe("true");
			expect(lead.hasAttribute("aria-busy")).toBe(false);
		});

		it("renders the same lead cell on the anchor branch", () => {
			const { container } = render(Button, {
				props: { ...leadProps, href: "https://example.com" },
			});
			const lead = container.querySelector(".ft-btn-lead");

			expect(root(container).tagName).toBe("A");
			expect(lead?.querySelector(".my-icon-start")).toBeTruthy();
		});

		// The proof the cross-fade exists at all. Every static-render assertion
		// above and at `:101` stays green whether or not the fade was ever wired
		// up, because a local transition never plays on the initial render of the
		// block that owns it — only a live toggle can tell the two apart.
		it("holds the icon and the spinner in the DOM together for the length of the cross-fade", async () => {
			const { container } = render(LeadHarness);
			const toggle = toggleOf(container);

			expect(container.querySelector(".my-icon-start")).toBeTruthy();
			expect(container.querySelector(".ft-btn-spinner")).toBeNull();

			toggle.click();
			await tick();

			// Both mounted, sharing the one grid cell: that overlap IS the fade.
			// Without it the icon would already be gone in this same flush.
			expect(container.querySelector(".ft-btn-spinner")).toBeTruthy();
			expect(container.querySelector(".my-icon-start")).toBeTruthy();

			// And it settles on the spinner alone once the fade finishes.
			await waitFor(() => expect(container.querySelector(".my-icon-start")).toBeNull());
			expect(container.querySelector(".ft-btn-spinner")).toBeTruthy();
		});

		it("cross-fades back the other way when loading clears", async () => {
			const { container } = render(LeadHarness);
			const toggle = toggleOf(container);

			toggle.click();
			await waitFor(() => expect(container.querySelector(".my-icon-start")).toBeNull());

			toggle.click();
			await tick();

			expect(container.querySelector(".my-icon-start")).toBeTruthy();
			expect(container.querySelector(".ft-btn-spinner")).toBeTruthy();

			await waitFor(() => expect(container.querySelector(".ft-btn-spinner")).toBeNull());
			expect(container.querySelector(".my-icon-start")).toBeTruthy();
		});

		it("reduced motion: the swap is synchronous, with no window where both are mounted", async () => {
			stubReducedMotion(true);

			const { container } = render(LeadHarness);
			const toggle = toggleOf(container);

			toggle.click();
			await tick();

			// Duration 0 makes Svelte skip `element.animate()` entirely, so the
			// outgoing icon is gone in the same flush that mounts the spinner —
			// exactly the behaviour this button had before the fade existed.
			expect(container.querySelector(".ft-btn-spinner")).toBeTruthy();
			expect(container.querySelector(".my-icon-start")).toBeNull();
		});
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
			const { container } = render(Button, {
				props: { sound: true, children: snippet("<span>Go</span>") },
			});

			await fireEvent.click(root(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(Button, {
				props: { children: snippet("<span>Go</span>") },
			});

			await fireEvent.click(root(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const { container } = render(Button, {
				props: { sound: true, disabled: true, children: snippet("<span>Go</span>") },
			});

			root(container).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while loading, even with sound enabled", () => {
			const { container } = render(Button, {
				props: { sound: true, loading: true, children: snippet("<span>Go</span>") },
			});

			root(container).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("does not double-fire on keyboard activation — a single click, however triggered, plays one cue", async () => {
			const onclick = vi.fn();
			const { container } = render(Button, {
				props: { sound: true, onclick, children: snippet("<span>Go</span>") },
			});
			const el = root(container);

			// jsdom does not synthesize a click from a real keydown on <button>;
			// this proves the cue is wired to the shared click handler alone, not
			// duplicated onto a keydown listener as well.
			await fireEvent.keyDown(el, { key: "Enter" });
			await fireEvent.click(el);

			expect(onclick).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("does not leak the sound prop into the DOM attributes", () => {
			const { container } = render(Button, {
				props: { sound: true, children: snippet("<span>Go</span>") },
			});

			expect(root(container).hasAttribute("sound")).toBe(false);
		});
	});
});
