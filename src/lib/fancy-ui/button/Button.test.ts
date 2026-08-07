import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Button from "./Button.svelte";
import type { ButtonSize, ButtonVariant } from "./types.js";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function root(container: HTMLElement) {
	return container.firstElementChild as HTMLElement;
}

describe("Button", () => {
	afterEach(cleanup);

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
});
