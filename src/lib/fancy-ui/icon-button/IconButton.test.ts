import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { afterEach, beforeEach, describe, it, expect, vi } from "vitest";
import IconButton from "./IconButton.svelte";
import type { ButtonSize, ButtonVariant } from "../button/types.js";
import { sound } from "../sound/sound.svelte.js";

function icon(html = '<svg aria-hidden="true"><path d="M4 4h8v8H4z" /></svg>') {
	return createRawSnippet(() => ({ render: () => html }));
}

function root(container: HTMLElement) {
	return container.firstElementChild as HTMLElement;
}

describe("IconButton", () => {
	afterEach(cleanup);

	it("renders the icon centred, with no visible text", () => {
		const { container } = render(IconButton, { props: { label: "Edit", children: icon() } });
		const el = root(container);

		expect(el.querySelector("svg")).toBeTruthy();
		expect(el.textContent?.trim()).toBe("");
	});

	it("exposes the required label as the accessible name", () => {
		const { getByRole } = render(IconButton, { props: { label: "Edit", children: icon() } });
		expect(getByRole("button", { name: "Edit" })).toBeTruthy();
	});

	it("carries the label through as aria-label", () => {
		const { container } = render(IconButton, { props: { label: "Settings", children: icon() } });
		expect(root(container).getAttribute("aria-label")).toBe("Settings");
	});

	it.each([
		["primary", "bg-primary"],
		["secondary", "bg-secondary"],
		["outline", "border-border"],
		["ghost", "text-muted-foreground"],
		["accent", "ft-btn--accent"],
		["destructive", "border-destructive/35"],
	] satisfies Array<[ButtonVariant, string]>)(
		"variant %s carries its own class (%s)",
		(variant, marker) => {
			const { container } = render(IconButton, {
				props: { variant, label: "Action", children: icon() },
			});
			expect(root(container).className).toContain(marker);
		}
	);

	it.each([
		["sm", "size-[30px]"],
		["md", "size-[36px]"],
		["lg", "size-[42px]"],
	] satisfies Array<[ButtonSize, string]>)(
		"size %s carries its own square footprint (%s)",
		(size, marker) => {
			const { container } = render(IconButton, {
				props: { size, label: "Action", children: icon() },
			});
			expect(root(container).className).toContain(marker);
		}
	);

	it("keeps the size's own radius in the default square shape", () => {
		const { container } = render(IconButton, {
			props: { size: "md", label: "Action", children: icon() },
		});
		expect(root(container).className).toContain("rounded-[8px]");
	});

	it("replaces the radius with a full circle when shape is circle", () => {
		const { container } = render(IconButton, {
			props: { shape: "circle", size: "md", label: "Action", children: icon() },
		});
		const className = root(container).className;

		expect(className).toContain("rounded-full");
		// tailwind-merge drops the size's own conflicting radius utility once the
		// shape override arrives — proving circle actually replaces it rather
		// than just adding alongside it.
		expect(className).not.toContain("rounded-[8px]");
	});

	it("shows a spinner and marks the control busy while loading, hiding the icon", () => {
		const { container } = render(IconButton, {
			props: { loading: true, label: "Save", children: icon() },
		});
		const el = root(container);

		expect(el.getAttribute("aria-busy")).toBe("true");
		expect(container.querySelector(".ft-btn-spinner")).toBeTruthy();
		expect(container.querySelector("svg")).toBeNull();
	});

	it("blocks the click callback while loading", () => {
		const onclick = vi.fn();
		const { container } = render(IconButton, {
			props: { loading: true, onclick, label: "Save", children: icon() },
		});

		root(container).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(onclick).not.toHaveBeenCalled();
	});

	it("disables the control and blocks the click callback", () => {
		const onclick = vi.fn();
		const { container } = render(IconButton, {
			props: { disabled: true, onclick, label: "Delete", children: icon() },
		});
		const el = root(container) as HTMLButtonElement;

		expect(el.disabled).toBe(true);
		// A synthetic dispatch walks straight past the native `disabled` guard in
		// jsdom, unlike a real press — this proves the JS-level guard, inherited
		// from Button, is what blocks the callback here.
		el.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(onclick).not.toHaveBeenCalled();
	});

	it("calls onclick when activated", async () => {
		const onclick = vi.fn();
		const { container } = render(IconButton, {
			props: { onclick, label: "Like", children: icon() },
		});

		await fireEvent.click(root(container));
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it("renders an anchor that keeps the accessible name when href is set", () => {
		const { container } = render(IconButton, {
			props: { href: "https://example.com", label: "Open", children: icon() },
		});
		const el = root(container);

		expect(el.tagName).toBe("A");
		expect(el.getAttribute("href")).toBe("https://example.com");
		expect(el.getAttribute("aria-label")).toBe("Open");
	});

	it("merges a caller class alongside the geometry classes", () => {
		const { container } = render(IconButton, {
			props: { label: "Action", class: "my-icon-button", children: icon() },
		});
		expect(root(container).className.split(/\s+/)).toContain("my-icon-button");
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
			const { container } = render(IconButton, {
				props: { sound: true, label: "Like", children: icon() },
			});

			await fireEvent.click(root(container));

			expect(play).toHaveBeenCalledTimes(1);
			expect(play).toHaveBeenCalledWith("press");
		});

		it("plays nothing by default (sound prop omitted)", async () => {
			const { container } = render(IconButton, {
				props: { label: "Like", children: icon() },
			});

			await fireEvent.click(root(container));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while disabled, even with sound enabled", () => {
			const { container } = render(IconButton, {
				props: { sound: true, disabled: true, label: "Delete", children: icon() },
			});

			root(container).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});

		it("plays nothing while loading, even with sound enabled", () => {
			const { container } = render(IconButton, {
				props: { sound: true, loading: true, label: "Save", children: icon() },
			});

			root(container).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(play).not.toHaveBeenCalled();
		});
	});
});
