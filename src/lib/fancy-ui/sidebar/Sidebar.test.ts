import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet, tick } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import Sidebar from "./Sidebar.svelte";
import SidebarGroup from "./SidebarGroup.svelte";
import SidebarItem from "./SidebarItem.svelte";
import SidebarSeparator from "./SidebarSeparator.svelte";
import SidebarFooter from "./SidebarFooter.svelte";
import Harness from "./SidebarHarness.test.svelte";
import { sound } from "../sound/sound.svelte.js";

function snippet(html: string) {
	return createRawSnippet(() => ({ render: () => html }));
}

function nav(container: HTMLElement): HTMLElement {
	return container.querySelector("nav") as HTMLElement;
}

describe("Sidebar", () => {
	afterEach(cleanup);

	it("renders a nav landmark named 'Sidebar' by default", () => {
		const { container } = render(Sidebar);
		expect(nav(container)).toBeTruthy();
		expect(nav(container).getAttribute("aria-label")).toBe("Sidebar");
	});

	it("accepts a custom accessible name", () => {
		const { container } = render(Sidebar, { props: { label: "Workspace" } });
		expect(nav(container).getAttribute("aria-label")).toBe("Workspace");
	});

	it("renders its children inside the nav", () => {
		const { container } = render(Sidebar, {
			props: { children: snippet('<span data-testid="body">content</span>') },
		});
		expect(container.querySelector("[data-testid='body']")).toBeTruthy();
	});

	it("widens for the expanded rail and narrows for the collapsed one", () => {
		const { container: expanded } = render(Sidebar);
		expect(nav(expanded).className).toContain("w-[240px]");
		expect(nav(expanded).getAttribute("data-collapsed")).toBe("false");

		cleanup();

		const { container: collapsed } = render(Sidebar, { props: { collapsed: true } });
		expect(nav(collapsed).className).toContain("w-[64px]");
		expect(nav(collapsed).getAttribute("data-collapsed")).toBe("true");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(Sidebar, { props: { class: "mt-2" } });
		expect(nav(container).className).toContain("ft-sidebar");
		expect(nav(container).className).toContain("mt-2");
	});

	it("binds the root element", () => {
		let ref: HTMLElement | null = null;
		const { container } = render(Sidebar, {
			props: {
				get ref() {
					return ref;
				},
				set ref(value: HTMLElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(nav(container));
	});

	it("reflects an externally-driven collapsed prop change — plain prop, nothing to bind on Sidebar itself", async () => {
		// `collapsed` is bindable on the harness (standing in for a consumer's
		// own state), not on `Sidebar` — this proves a plain prop change from
		// outside still reaches the rendered `<nav>` on the very next render,
		// with no callback involved because there is none to call.
		const { container, getByTestId } = render(Harness);

		expect(getByTestId("bound-collapsed").textContent).toBe("false");
		expect(nav(container).getAttribute("data-collapsed")).toBe("false");

		await fireEvent.click(getByTestId("toggle"));
		await tick();

		expect(getByTestId("bound-collapsed").textContent).toBe("true");
		expect(nav(container).getAttribute("data-collapsed")).toBe("true");

		await fireEvent.click(getByTestId("toggle"));
		await tick();

		expect(getByTestId("bound-collapsed").textContent).toBe("false");
		expect(nav(container).getAttribute("data-collapsed")).toBe("false");
	});

	it("propagates collapsed through context: group headings and item labels/badges move to sr-only", async () => {
		const { container, getByTestId } = render(Harness);
		const groupLabel = container.querySelector(".ft-sidebar-group span") as HTMLElement;
		expect(groupLabel.className).not.toContain("sr-only");

		await fireEvent.click(getByTestId("toggle"));
		await tick();

		expect(groupLabel.className).toContain("sr-only");
		const badge = container.querySelector(".ft-sidebar-item-badge") as HTMLElement;
		expect(badge.className).toContain("sr-only");
	});
});

describe("SidebarGroup", () => {
	afterEach(cleanup);

	it("labels its list with aria-labelledby pointing at the heading's id", () => {
		const { container } = render(SidebarGroup, { props: { label: "General" } });
		const heading = container.querySelector("span") as HTMLElement;
		const list = container.querySelector("ul") as HTMLElement;

		expect(heading.textContent?.trim()).toBe("General");
		expect(heading.id).toBeTruthy();
		expect(list.getAttribute("aria-labelledby")).toBe(heading.id);
	});

	it("renders its children inside the list", () => {
		const { container } = render(SidebarGroup, {
			props: { label: "General", children: snippet('<li data-testid="row">Row</li>') },
		});
		expect(container.querySelector("ul [data-testid='row']")).toBeTruthy();
	});

	it("keeps the heading visible when there is no collapsed ancestor", () => {
		const { container } = render(SidebarGroup, { props: { label: "General" } });
		expect((container.querySelector("span") as HTMLElement).className).not.toContain("sr-only");
	});
});

describe("SidebarItem", () => {
	afterEach(cleanup);

	it("renders an <a> wrapped in an <li> when href is given", () => {
		const { container } = render(SidebarItem, {
			props: { href: "/dashboard", children: snippet("<span>Dashboard</span>") },
		});
		const link = container.querySelector("a");
		expect(link).toBeTruthy();
		expect(link?.getAttribute("href")).toBe("/dashboard");
		expect(link?.parentElement?.tagName).toBe("LI");
	});

	it("renders a <button type=button> wrapped in an <li> when href is omitted", () => {
		const { container } = render(SidebarItem, {
			props: { children: snippet("<span>Projects</span>") },
		});
		const button = container.querySelector("button");
		expect(button).toBeTruthy();
		expect(button?.getAttribute("type")).toBe("button");
		expect(button?.parentElement?.tagName).toBe("LI");
	});

	it("marks the current item with aria-current and the accent bar class, never colour alone", () => {
		const { container } = render(SidebarItem, {
			props: { href: "/dashboard", current: true, children: snippet("<span>Dashboard</span>") },
		});
		const link = container.querySelector("a") as HTMLElement;
		expect(link.getAttribute("aria-current")).toBe("page");
		expect(link.className).toContain("font-medium");
		expect(link.className).toContain("ft-sidebar-item--current");
	});

	it("carries no aria-current and no accent class when not current", () => {
		const { container } = render(SidebarItem, {
			props: { href: "/dashboard", children: snippet("<span>Dashboard</span>") },
		});
		const link = container.querySelector("a") as HTMLElement;
		expect(link.hasAttribute("aria-current")).toBe(false);
		expect(link.className).not.toContain("ft-sidebar-item--current");
	});

	// The accent bar moved from `.ft-sidebar-item--current`'s own `box-shadow`
	// to a `::before` pseudo-element. That is a bug fix riding along inside a
	// motion change: the item's `box-shadow` is what `focus-visible:ring-2`
	// compiles to, and Svelte's unlayered scoped CSS was overwriting it, so
	// until now the current item had no visible focus ring at all. jsdom
	// computes neither pseudo-elements nor cascade layers, so what a test can
	// pin is that both hooks still sit on the same element.
	it("keeps the focus-ring utility on the current item alongside the accent class", () => {
		const { container } = render(SidebarItem, {
			props: { href: "/dashboard", current: true, children: snippet("<span>Dashboard</span>") },
		});
		const link = container.querySelector("a") as HTMLElement;

		expect(link.className).toContain("ft-sidebar-item--current");
		expect(link.className).toContain("focus-visible:ring-2");
	});

	it("reduced motion: the current marker still arrives, it just does not grow", () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real(query),
			matches: true,
		})) as typeof window.matchMedia;

		try {
			// The bar's `scaleY` growth and the sidebar's own width transition are
			// both declared only inside `no-preference`. Neither is observable in
			// jsdom; what is observable is that nothing about the state contract —
			// the accent class, `aria-current`, the collapsed width — is gated on
			// the preference.
			const { container } = render(SidebarItem, {
				props: { href: "/dashboard", current: true, children: snippet("<span>Dashboard</span>") },
			});
			const link = container.querySelector("a") as HTMLElement;

			expect(link.getAttribute("aria-current")).toBe("page");
			expect(link.className).toContain("ft-sidebar-item--current");

			const { container: railContainer } = render(Sidebar, { props: { collapsed: true } });
			expect(nav(railContainer).className).toContain("w-[64px]");
		} finally {
			window.matchMedia = real;
		}
	});

	it("renders the badge value and folds badgeLabel into a hidden note", () => {
		const { container } = render(SidebarItem, {
			props: { badge: 4, badgeLabel: "unread", children: snippet("<span>Inbox</span>") },
		});
		const badge = container.querySelector(".ft-sidebar-item-badge") as HTMLElement;
		expect(badge.textContent?.replace(/\s+/g, " ").trim()).toBe("4 unread");
		expect(badge.querySelector(".sr-only")?.textContent?.trim()).toBe("unread");
	});

	it("defaults to just the badge value when badgeLabel is not given", () => {
		const { container } = render(SidebarItem, {
			props: { badge: 4, children: snippet("<span>Inbox</span>") },
		});
		const badge = container.querySelector(".ft-sidebar-item-badge") as HTMLElement;
		expect(badge.textContent?.trim()).toBe("4");
		expect(badge.querySelector(".sr-only")).toBeNull();
	});

	it("renders no badge element at all when badge is not given", () => {
		const { container } = render(SidebarItem, {
			props: { children: snippet("<span>Inbox</span>") },
		});
		expect(container.querySelector(".ft-sidebar-item-badge")).toBeNull();
	});

	it("wraps the icon in an aria-hidden element", () => {
		const { container } = render(SidebarItem, {
			props: {
				icon: snippet('<svg data-testid="glyph"></svg>'),
				children: snippet("<span>Dashboard</span>"),
			},
		});
		const iconWrap = container.querySelector(".ft-sidebar-item-icon") as HTMLElement;
		expect(iconWrap.getAttribute("aria-hidden")).toBe("true");
		expect(iconWrap.querySelector("[data-testid='glyph']")).toBeTruthy();
	});

	it("strips href, sets aria-disabled and tabindex -1, and blocks the click when disabled (anchor)", async () => {
		const onclick = vi.fn();
		const { container } = render(SidebarItem, {
			props: {
				href: "/dashboard",
				disabled: true,
				onclick,
				children: snippet("<span>Dashboard</span>"),
			},
		});
		const link = container.querySelector("a") as HTMLElement;

		expect(link.hasAttribute("href")).toBe(false);
		expect(link.getAttribute("aria-disabled")).toBe("true");
		expect(link.getAttribute("tabindex")).toBe("-1");

		await fireEvent.click(link);
		expect(onclick).not.toHaveBeenCalled();
	});

	it("guards the click handler when disabled (button), on top of the native attribute", async () => {
		const onclick = vi.fn();
		const { container } = render(SidebarItem, {
			props: { disabled: true, onclick, children: snippet("<span>Projects</span>") },
		});
		const button = container.querySelector("button") as HTMLButtonElement;

		expect(button.disabled).toBe(true);
		await fireEvent.click(button);
		expect(onclick).not.toHaveBeenCalled();
	});

	it("fires onclick when enabled", async () => {
		const onclick = vi.fn();
		const { container } = render(SidebarItem, {
			props: { onclick, children: snippet("<span>Projects</span>") },
		});
		await fireEvent.click(container.querySelector("button") as HTMLButtonElement);
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(SidebarItem, {
			props: { class: "mx-1", children: snippet("<span>Projects</span>") },
		});
		expect((container.querySelector("button") as HTMLElement).className).toContain("mx-1");
	});

	it("binds the interactive element", () => {
		let ref: HTMLAnchorElement | HTMLButtonElement | null = null;
		const { container } = render(SidebarItem, {
			props: {
				href: "/dashboard",
				children: snippet("<span>Dashboard</span>"),
				get ref() {
					return ref;
				},
				set ref(value: HTMLAnchorElement | HTMLButtonElement | null) {
					ref = value;
				},
			},
		});
		expect(ref).toBe(container.querySelector("a"));
	});

	describe("sound", () => {
		let play: ReturnType<typeof vi.spyOn>;

		beforeEach(() => {
			play = vi.spyOn(sound, "play").mockImplementation(() => {});
		});

		afterEach(() => {
			play.mockRestore();
		});

		it("plays the select cue exactly once when sound is enabled and a non-current item (button branch) is activated", async () => {
			const { container } = render(SidebarItem, {
				props: { sound: true, children: snippet("<span>Projects</span>") },
			});

			await fireEvent.click(container.querySelector("button") as HTMLButtonElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays the select cue exactly once when sound is enabled and a non-current item (link branch) is activated", async () => {
			const { container } = render(SidebarItem, {
				props: { href: "/dashboard", sound: true, children: snippet("<span>Dashboard</span>") },
			});

			await fireEvent.click(container.querySelector("a") as HTMLAnchorElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(SidebarItem, {
				props: { children: snippet("<span>Projects</span>") },
			});

			await fireEvent.click(container.querySelector("button") as HTMLButtonElement);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const { container } = render(SidebarItem, {
				props: { sound: true, disabled: true, children: snippet("<span>Projects</span>") },
			});
			const button = container.querySelector("button") as HTMLButtonElement;

			button.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when the item is already current — the changed-only guard", async () => {
			const { container } = render(SidebarItem, {
				props: {
					href: "/dashboard",
					current: true,
					sound: true,
					children: snippet("<span>Dashboard</span>"),
				},
			});

			await fireEvent.click(container.querySelector("a") as HTMLAnchorElement);

			expect(play).not.toHaveBeenCalled();
		});
	});
});

describe("SidebarSeparator", () => {
	afterEach(cleanup);

	it("renders an <hr>", () => {
		const { container } = render(SidebarSeparator);
		expect(container.querySelector("hr")).toBeTruthy();
	});

	it("merges the class prop and binds ref", () => {
		let ref: HTMLHRElement | null = null;
		const { container } = render(SidebarSeparator, {
			props: {
				class: "my-4",
				get ref() {
					return ref;
				},
				set ref(value: HTMLHRElement | null) {
					ref = value;
				},
			},
		});
		const hr = container.querySelector("hr") as HTMLElement;
		expect(hr.className).toContain("my-4");
		expect(ref).toBe(hr);
	});
});

describe("SidebarFooter", () => {
	afterEach(cleanup);

	it("renders a separator before the avatar/text row", () => {
		const { container } = render(SidebarFooter, {
			props: {
				avatar: snippet('<span data-testid="avatar"></span>'),
				children: snippet("<span>Rama</span>"),
			},
		});
		const footer = container.querySelector(".ft-sidebar-footer") as HTMLElement;
		const hr = footer.querySelector("hr");
		const avatar = footer.querySelector("[data-testid='avatar']");
		expect(hr).toBeTruthy();
		expect(avatar).toBeTruthy();
		// The separator precedes the row in document order.
		expect(
			hr?.compareDocumentPosition(avatar as Node) ?? 0 & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it("hides the avatar decoratively and shows the text", () => {
		const { container } = render(SidebarFooter, {
			props: {
				avatar: snippet('<span data-testid="avatar"></span>'),
				children: snippet("<span>Rama H.</span>"),
			},
		});
		const avatarWrap = container.querySelector("[aria-hidden='true']") as HTMLElement;
		expect(avatarWrap.querySelector("[data-testid='avatar']")).toBeTruthy();
		expect(container.textContent).toContain("Rama H.");
	});

	it("merges the class prop and binds ref", () => {
		let ref: HTMLDivElement | null = null;
		const { container } = render(SidebarFooter, {
			props: {
				class: "px-1",
				get ref() {
					return ref;
				},
				set ref(value: HTMLDivElement | null) {
					ref = value;
				},
			},
		});
		const footer = container.querySelector(".ft-sidebar-footer") as HTMLElement;
		expect(footer.className).toContain("px-1");
		expect(ref).toBe(footer);
	});
});
