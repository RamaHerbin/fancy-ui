import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { IconButton } from "./IconButton.js";
import type { ButtonSize, ButtonVariant } from "../button/types.js";

function icon() {
	return (
		<svg aria-hidden="true">
			<path d="M4 4h8v8H4z" />
		</svg>
	);
}

function root(container: HTMLElement) {
	return container.firstElementChild as HTMLElement;
}

describe("IconButton", () => {
	afterEach(cleanup);

	it("renders the icon centred, with no visible text", () => {
		const { container } = render(<IconButton label="Edit">{icon()}</IconButton>);
		const el = root(container);

		expect(el.querySelector("svg")).toBeTruthy();
		expect(el.textContent?.trim()).toBe("");
	});

	it("exposes the required label as the accessible name", () => {
		const { getByRole } = render(<IconButton label="Edit">{icon()}</IconButton>);
		expect(getByRole("button", { name: "Edit" })).toBeTruthy();
	});

	it("carries the label through as aria-label", () => {
		const { container } = render(<IconButton label="Settings">{icon()}</IconButton>);
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
			const { container } = render(
				<IconButton variant={variant} label="Action">
					{icon()}
				</IconButton>
			);
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
			const { container } = render(
				<IconButton size={size} label="Action">
					{icon()}
				</IconButton>
			);
			expect(root(container).className).toContain(marker);
		}
	);

	it("keeps the size's own radius in the default square shape", () => {
		const { container } = render(
			<IconButton size="md" label="Action">
				{icon()}
			</IconButton>
		);
		expect(root(container).className).toContain("rounded-[8px]");
	});

	it("replaces the radius with a full circle when shape is circle", () => {
		const { container } = render(
			<IconButton shape="circle" size="md" label="Action">
				{icon()}
			</IconButton>
		);
		const className = root(container).className;

		expect(className).toContain("rounded-full");
		// tailwind-merge drops the size's own conflicting radius utility once the
		// shape override arrives — proving circle actually replaces it rather
		// than just adding alongside it.
		expect(className).not.toContain("rounded-[8px]");
	});

	it("shows a spinner and marks the control busy while loading, hiding the icon", () => {
		const { container } = render(
			<IconButton loading label="Save">
				{icon()}
			</IconButton>
		);
		const el = root(container);

		expect(el.getAttribute("aria-busy")).toBe("true");
		expect(container.querySelector(".ft-btn-spinner")).toBeTruthy();
		expect(container.querySelector("svg")).toBeNull();
	});

	it("blocks the click callback while loading", () => {
		const onclick = vi.fn();
		const { container } = render(
			<IconButton loading onclick={onclick} label="Save">
				{icon()}
			</IconButton>
		);

		root(container).dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));
		expect(onclick).not.toHaveBeenCalled();
	});

	it("disables the control and blocks the click callback", () => {
		const onclick = vi.fn();
		const { container } = render(
			<IconButton disabled onclick={onclick} label="Delete">
				{icon()}
			</IconButton>
		);
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
		const { container } = render(
			<IconButton onclick={onclick} label="Like">
				{icon()}
			</IconButton>
		);

		await fireEvent.click(root(container));
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it("renders an anchor that keeps the accessible name when href is set", () => {
		const { container } = render(
			<IconButton href="https://example.com" label="Open">
				{icon()}
			</IconButton>
		);
		const el = root(container);

		expect(el.tagName).toBe("A");
		expect(el.getAttribute("href")).toBe("https://example.com");
		expect(el.getAttribute("aria-label")).toBe("Open");
	});

	it("merges a caller class alongside the geometry classes", () => {
		const { container } = render(
			<IconButton label="Action" className="my-icon-button">
				{icon()}
			</IconButton>
		);
		expect(root(container).className.split(/\s+/)).toContain("my-icon-button");
	});
});
