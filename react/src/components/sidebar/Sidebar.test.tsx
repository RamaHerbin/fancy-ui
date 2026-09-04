import { cleanup, fireEvent, render } from "@testing-library/react";
import { useEffect, useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetSoundForTests, sound } from "../../sound/sound.js";
import { Sidebar } from "./Sidebar.js";
import { SidebarGroup } from "./SidebarGroup.js";
import { SidebarItem } from "./SidebarItem.js";
import { SidebarSeparator } from "./SidebarSeparator.js";
import { SidebarFooter } from "./SidebarFooter.js";

/*
 * Test-only rig. `collapsed` is a plain prop on `Sidebar` — there is nothing
 * to round-trip, since nothing inside the compound ever changes it itself.
 * This rig keeps its own local `collapsed` state (so a test can flip it the
 * way a real consumer-owned trigger would) and forwards it into `Sidebar`
 * as an ordinary prop, then echoes it into the DOM so a test can observe the
 * round trip through the harness's own state, not Sidebar's. Also proves
 * the context-propagation behaviour (group headings and item labels/badges
 * moving to sr-only) reacts correctly to an externally-driven prop change.
 *
 * The Svelte side needed its own `.test.svelte` file for this because a
 * Svelte component cannot be declared inline; a React one can, so it lives
 * here beside the tests that use it.
 */
function Harness() {
	const [collapsed, setCollapsed] = useState(false);
	const navRef = useRef<HTMLElement | null>(null);

	useEffect(() => {
		navRef.current?.setAttribute("data-bound-ref", "yes");
	});

	return (
		<>
			<button type="button" data-testid="toggle" onClick={() => setCollapsed((value) => !value)}>
				Toggle
			</button>

			<Sidebar collapsed={collapsed} ref={navRef}>
				<SidebarGroup label="General">
					<SidebarItem href="/dashboard" current badge={4} badgeLabel="unread">
						Dashboard
					</SidebarItem>
					<SidebarItem>Projects</SidebarItem>
				</SidebarGroup>
			</Sidebar>

			<span data-testid="bound-collapsed">{String(collapsed)}</span>
		</>
	);
}

function nav(container: HTMLElement): HTMLElement {
	return container.querySelector("nav") as HTMLElement;
}

describe("Sidebar", () => {
	afterEach(cleanup);

	it("renders a nav landmark named 'Sidebar' by default", () => {
		const { container } = render(<Sidebar />);
		expect(nav(container)).toBeTruthy();
		expect(nav(container).getAttribute("aria-label")).toBe("Sidebar");
	});

	it("accepts a custom accessible name", () => {
		const { container } = render(<Sidebar label="Workspace" />);
		expect(nav(container).getAttribute("aria-label")).toBe("Workspace");
	});

	it("renders its children inside the nav", () => {
		const { container } = render(
			<Sidebar>
				<span data-testid="body">content</span>
			</Sidebar>
		);
		expect(container.querySelector("[data-testid='body']")).toBeTruthy();
	});

	it("widens for the expanded rail and narrows for the collapsed one", () => {
		const { container: expanded } = render(<Sidebar />);
		expect(nav(expanded).className).toContain("w-[240px]");
		expect(nav(expanded).getAttribute("data-collapsed")).toBe("false");

		cleanup();

		const { container: collapsed } = render(<Sidebar collapsed />);
		expect(nav(collapsed).className).toContain("w-[64px]");
		expect(nav(collapsed).getAttribute("data-collapsed")).toBe("true");
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(<Sidebar className="mt-2" />);
		expect(nav(container).className).toContain("ft-sidebar");
		expect(nav(container).className).toContain("mt-2");
	});

	it("binds the root element", () => {
		const ref = { current: null as HTMLElement | null };
		const { container } = render(<Sidebar ref={ref} />);
		expect(ref.current).toBe(nav(container));
	});

	it("reflects an externally-driven collapsed prop change — plain prop, nothing to bind on Sidebar itself", () => {
		// `collapsed` is owned by the harness (standing in for a consumer's
		// own state), not by `Sidebar` — this proves a plain prop change from
		// outside still reaches the rendered `<nav>` on the very next render,
		// with no callback involved because there is none to call.
		const { container, getByTestId } = render(<Harness />);

		expect(getByTestId("bound-collapsed").textContent).toBe("false");
		expect(nav(container).getAttribute("data-collapsed")).toBe("false");

		fireEvent.click(getByTestId("toggle"));

		expect(getByTestId("bound-collapsed").textContent).toBe("true");
		expect(nav(container).getAttribute("data-collapsed")).toBe("true");

		fireEvent.click(getByTestId("toggle"));

		expect(getByTestId("bound-collapsed").textContent).toBe("false");
		expect(nav(container).getAttribute("data-collapsed")).toBe("false");
	});

	it("propagates collapsed through context: group headings and item labels/badges move to sr-only", () => {
		const { container, getByTestId } = render(<Harness />);
		const groupLabel = container.querySelector(".ft-sidebar-group span") as HTMLElement;
		expect(groupLabel.className).not.toContain("sr-only");

		fireEvent.click(getByTestId("toggle"));

		expect(groupLabel.className).toContain("sr-only");
		const badge = container.querySelector(".ft-sidebar-item-badge") as HTMLElement;
		expect(badge.className).toContain("sr-only");
	});
});

describe("SidebarGroup", () => {
	afterEach(cleanup);

	it("labels its list with aria-labelledby pointing at the heading's id", () => {
		const { container } = render(<SidebarGroup label="General" />);
		const heading = container.querySelector("span") as HTMLElement;
		const list = container.querySelector("ul") as HTMLElement;

		expect(heading.textContent?.trim()).toBe("General");
		expect(heading.id).toBeTruthy();
		expect(list.getAttribute("aria-labelledby")).toBe(heading.id);
	});

	it("renders its children inside the list", () => {
		const { container } = render(
			<SidebarGroup label="General">
				<li data-testid="row">Row</li>
			</SidebarGroup>
		);
		expect(container.querySelector("ul [data-testid='row']")).toBeTruthy();
	});

	it("keeps the heading visible when there is no collapsed ancestor", () => {
		const { container } = render(<SidebarGroup label="General" />);
		expect((container.querySelector("span") as HTMLElement).className).not.toContain("sr-only");
	});
});

describe("SidebarItem", () => {
	afterEach(cleanup);

	it("renders an <a> wrapped in an <li> when href is given", () => {
		const { container } = render(
			<SidebarItem href="/dashboard">
				<span>Dashboard</span>
			</SidebarItem>
		);
		const link = container.querySelector("a");
		expect(link).toBeTruthy();
		expect(link?.getAttribute("href")).toBe("/dashboard");
		expect(link?.parentElement?.tagName).toBe("LI");
	});

	it("renders a <button type=button> wrapped in an <li> when href is omitted", () => {
		const { container } = render(
			<SidebarItem>
				<span>Projects</span>
			</SidebarItem>
		);
		const button = container.querySelector("button");
		expect(button).toBeTruthy();
		expect(button?.getAttribute("type")).toBe("button");
		expect(button?.parentElement?.tagName).toBe("LI");
	});

	it("marks the current item with aria-current and the accent bar class, never colour alone", () => {
		const { container } = render(
			<SidebarItem href="/dashboard" current>
				<span>Dashboard</span>
			</SidebarItem>
		);
		const link = container.querySelector("a") as HTMLElement;
		expect(link.getAttribute("aria-current")).toBe("page");
		expect(link.className).toContain("font-medium");
		expect(link.className).toContain("ft-sidebar-item--current");
	});

	it("carries no aria-current and no accent class when not current", () => {
		const { container } = render(
			<SidebarItem href="/dashboard">
				<span>Dashboard</span>
			</SidebarItem>
		);
		const link = container.querySelector("a") as HTMLElement;
		expect(link.hasAttribute("aria-current")).toBe(false);
		expect(link.className).not.toContain("ft-sidebar-item--current");
	});

	// The accent bar sits on a `::before` pseudo-element rather than on
	// `.ft-sidebar-item--current`'s own `box-shadow`: the item's `box-shadow`
	// is what `focus-visible:ring-2` compiles to, and an unlayered rule on the
	// host would overwrite it, leaving the current item with no visible focus
	// ring at all. jsdom computes neither pseudo-elements nor cascade layers,
	// so what a test can pin is that both hooks still sit on the same element.
	it("keeps the focus-ring utility on the current item alongside the accent class", () => {
		const { container } = render(
			<SidebarItem href="/dashboard" current>
				<span>Dashboard</span>
			</SidebarItem>
		);
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
			const { container } = render(
				<SidebarItem href="/dashboard" current>
					<span>Dashboard</span>
				</SidebarItem>
			);
			const link = container.querySelector("a") as HTMLElement;

			expect(link.getAttribute("aria-current")).toBe("page");
			expect(link.className).toContain("ft-sidebar-item--current");

			const { container: railContainer } = render(<Sidebar collapsed />);
			expect(nav(railContainer).className).toContain("w-[64px]");
		} finally {
			window.matchMedia = real;
		}
	});

	it("renders the badge value and folds badgeLabel into a hidden note", () => {
		const { container } = render(
			<SidebarItem badge={4} badgeLabel="unread">
				<span>Inbox</span>
			</SidebarItem>
		);
		const badge = container.querySelector(".ft-sidebar-item-badge") as HTMLElement;
		expect(badge.textContent?.replace(/\s+/g, " ").trim()).toBe("4 unread");
		expect(badge.querySelector(".sr-only")?.textContent?.trim()).toBe("unread");
	});

	it("defaults to just the badge value when badgeLabel is not given", () => {
		const { container } = render(
			<SidebarItem badge={4}>
				<span>Inbox</span>
			</SidebarItem>
		);
		const badge = container.querySelector(".ft-sidebar-item-badge") as HTMLElement;
		expect(badge.textContent?.trim()).toBe("4");
		expect(badge.querySelector(".sr-only")).toBeNull();
	});

	it("renders no badge element at all when badge is not given", () => {
		const { container } = render(
			<SidebarItem>
				<span>Inbox</span>
			</SidebarItem>
		);
		expect(container.querySelector(".ft-sidebar-item-badge")).toBeNull();
	});

	it("wraps the icon in an aria-hidden element", () => {
		const { container } = render(
			<SidebarItem icon={<svg data-testid="glyph" />}>
				<span>Dashboard</span>
			</SidebarItem>
		);
		const iconWrap = container.querySelector(".ft-sidebar-item-icon") as HTMLElement;
		expect(iconWrap.getAttribute("aria-hidden")).toBe("true");
		expect(iconWrap.querySelector("[data-testid='glyph']")).toBeTruthy();
	});

	it("strips href, sets aria-disabled and tabindex -1, and blocks the click when disabled (anchor)", () => {
		const onClick = vi.fn();
		const { container } = render(
			<SidebarItem href="/dashboard" disabled onClick={onClick}>
				<span>Dashboard</span>
			</SidebarItem>
		);
		const link = container.querySelector("a") as HTMLElement;

		expect(link.hasAttribute("href")).toBe(false);
		expect(link.getAttribute("aria-disabled")).toBe("true");
		expect(link.getAttribute("tabindex")).toBe("-1");

		fireEvent.click(link);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("guards the click handler when disabled (button), on top of the native attribute", () => {
		const onClick = vi.fn();
		const { container } = render(
			<SidebarItem disabled onClick={onClick}>
				<span>Projects</span>
			</SidebarItem>
		);
		const button = container.querySelector("button") as HTMLButtonElement;

		expect(button.disabled).toBe(true);
		fireEvent.click(button);
		expect(onClick).not.toHaveBeenCalled();
	});

	it("fires onclick when enabled", () => {
		const onClick = vi.fn();
		const { container } = render(
			<SidebarItem onClick={onClick}>
				<span>Projects</span>
			</SidebarItem>
		);
		fireEvent.click(container.querySelector("button") as HTMLButtonElement);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("merges the class prop with the base classes", () => {
		const { container } = render(
			<SidebarItem className="mx-1">
				<span>Projects</span>
			</SidebarItem>
		);
		expect((container.querySelector("button") as HTMLElement).className).toContain("mx-1");
	});

	it("binds the interactive element", () => {
		const ref = { current: null as HTMLAnchorElement | HTMLButtonElement | null };
		const { container } = render(
			<SidebarItem href="/dashboard" ref={ref}>
				<span>Dashboard</span>
			</SidebarItem>
		);
		expect(ref.current).toBe(container.querySelector("a"));
	});

	describe("sound", () => {
		beforeEach(() => {
			resetSoundForTests();
			window.localStorage.clear();
		});

		afterEach(() => {
			vi.restoreAllMocks();
		});

		it("plays the select cue exactly once when sound is enabled and a non-current item (button branch) is activated", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(
				<SidebarItem sound>
					<span>Projects</span>
				</SidebarItem>
			);

			fireEvent.click(container.querySelector("button") as HTMLButtonElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays the select cue exactly once when sound is enabled and a non-current item (link branch) is activated", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(
				<SidebarItem href="/dashboard" sound>
					<span>Dashboard</span>
				</SidebarItem>
			);

			fireEvent.click(container.querySelector("a") as HTMLAnchorElement);

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("select", undefined);
		});

		it("plays nothing by default (sound prop omitted)", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(
				<SidebarItem>
					<span>Projects</span>
				</SidebarItem>
			);

			fireEvent.click(container.querySelector("button") as HTMLButtonElement);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(
				<SidebarItem sound disabled>
					<span>Projects</span>
				</SidebarItem>
			);

			fireEvent.click(container.querySelector("button") as HTMLButtonElement);

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing when the item is already current — the changed-only guard", () => {
			const play = vi.spyOn(sound, "play").mockImplementation(() => {});
			const { container } = render(
				<SidebarItem href="/dashboard" current sound>
					<span>Dashboard</span>
				</SidebarItem>
			);

			fireEvent.click(container.querySelector("a") as HTMLAnchorElement);

			expect(play).not.toHaveBeenCalled();
		});
	});
});

describe("SidebarSeparator", () => {
	afterEach(cleanup);

	it("renders an <hr>", () => {
		const { container } = render(<SidebarSeparator />);
		expect(container.querySelector("hr")).toBeTruthy();
	});

	it("merges the class prop and binds ref", () => {
		const ref = { current: null as HTMLHRElement | null };
		const { container } = render(<SidebarSeparator className="my-4" ref={ref} />);
		const hr = container.querySelector("hr") as HTMLElement;
		expect(hr.className).toContain("my-4");
		expect(ref.current).toBe(hr);
	});
});

describe("SidebarFooter", () => {
	afterEach(cleanup);

	it("renders a separator before the avatar/text row", () => {
		const { container } = render(
			<SidebarFooter avatar={<span data-testid="avatar" />}>
				<span>Rama</span>
			</SidebarFooter>
		);
		const footer = container.querySelector(".ft-sidebar-footer") as HTMLElement;
		const hr = footer.querySelector("hr");
		const avatar = footer.querySelector("[data-testid='avatar']");
		expect(hr).toBeTruthy();
		expect(avatar).toBeTruthy();
		// The separator precedes the row in document order.
		// `&` binds tighter than `??`, so the mask has to be parenthesised —
		// without it the assertion reads the raw bitmask and can never fail.
		expect(
			(hr?.compareDocumentPosition(avatar as Node) ?? 0) & Node.DOCUMENT_POSITION_FOLLOWING
		).toBeTruthy();
	});

	it("hides the avatar decoratively and shows the text", () => {
		const { container } = render(
			<SidebarFooter avatar={<span data-testid="avatar" />}>
				<span>Rama H.</span>
			</SidebarFooter>
		);
		const avatarWrap = container.querySelector("[aria-hidden='true']") as HTMLElement;
		expect(avatarWrap.querySelector("[data-testid='avatar']")).toBeTruthy();
		expect(container.textContent).toContain("Rama H.");
	});

	it("merges the class prop and binds ref", () => {
		const ref = { current: null as HTMLDivElement | null };
		const { container } = render(<SidebarFooter className="px-1" ref={ref} />);
		const footer = container.querySelector(".ft-sidebar-footer") as HTMLElement;
		expect(footer.className).toContain("px-1");
		expect(ref.current).toBe(footer);
	});
});
