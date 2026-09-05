import { StrictMode, useState } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, it, expect } from "vitest";
import { Portal, resolvePortalTarget, usePortalTarget } from "./Portal.js";

describe("resolvePortalTarget", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("returns document.body by default", () => {
		expect(resolvePortalTarget()).toBe(document.body);
	});

	it("returns a given HTMLElement target unchanged", () => {
		const target = document.createElement("section");
		document.body.appendChild(target);

		expect(resolvePortalTarget(target)).toBe(target);
	});

	it("resolves a CSS selector", () => {
		const target = document.createElement("section");
		target.id = "modal-root";
		document.body.appendChild(target);

		expect(resolvePortalTarget("#modal-root")).toBe(target);
	});

	it("falls back to document.body when the selector matches nothing", () => {
		expect(resolvePortalTarget("#does-not-exist")).toBe(document.body);
	});
});

describe("Portal", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("renders into document.body by default", () => {
		render(
			<Portal>
				<div data-testid="content">portal content</div>
			</Portal>
		);

		const content = screen.getByTestId("content");
		expect(document.body.contains(content)).toBe(true);
		expect(content.parentElement).toBe(document.body);
	});

	it("renders into a given HTMLElement target", () => {
		const target = document.createElement("section");
		document.body.appendChild(target);

		render(
			<Portal target={target}>
				<div data-testid="content">portal content</div>
			</Portal>
		);

		expect(screen.getByTestId("content").parentElement).toBe(target);
	});

	it("renders into a target resolved from a CSS selector", () => {
		const target = document.createElement("section");
		target.id = "modal-root";
		document.body.appendChild(target);

		render(
			<Portal target="#modal-root">
				<div data-testid="content">portal content</div>
			</Portal>
		);

		expect(screen.getByTestId("content").parentElement).toBe(target);
	});

	it("falls back to document.body when the selector matches nothing", () => {
		render(
			<Portal target="#does-not-exist">
				<div data-testid="content">portal content</div>
			</Portal>
		);

		expect(screen.getByTestId("content").parentElement).toBe(document.body);
	});

	// Replaces the Svelte suite's "moves the node out of its original parent":
	// nothing is moved here, so the observable claim is that the content was
	// never rendered into the React parent in the first place.
	it("renders into the target, not into the React parent", () => {
		const target = document.createElement("section");
		document.body.appendChild(target);

		const { container } = render(
			<div data-testid="react-parent">
				<Portal target={target}>
					<div data-testid="content">portal content</div>
				</Portal>
			</div>
		);

		const content = screen.getByTestId("content");
		expect(container.contains(content)).toBe(false);
		expect(screen.getByTestId("react-parent").contains(content)).toBe(false);
		expect(target.contains(content)).toBe(true);
	});

	it("removes the content from the DOM on unmount", () => {
		const { unmount } = render(
			<Portal>
				<div data-testid="content">portal content</div>
			</Portal>
		);

		const content = screen.getByTestId("content");
		expect(content.isConnected).toBe(true);

		unmount();

		expect(content.isConnected).toBe(false);
		expect(content.parentElement).toBeNull();
		expect(screen.queryByTestId("content")).toBeNull();
	});

	it("moves the content to a new target when the target prop changes", () => {
		const first = document.createElement("section");
		const second = document.createElement("section");
		document.body.append(first, second);

		const { rerender } = render(
			<Portal target={first}>
				<div data-testid="content">portal content</div>
			</Portal>
		);
		expect(screen.getByTestId("content").parentElement).toBe(first);

		rerender(
			<Portal target={second}>
				<div data-testid="content">portal content</div>
			</Portal>
		);
		expect(screen.getByTestId("content").parentElement).toBe(second);
		expect(first.childElementCount).toBe(0);
	});

	it("renders children in place when disabled", () => {
		const { container } = render(
			<div data-testid="react-parent">
				<Portal disabled>
					<div data-testid="content">portal content</div>
				</Portal>
			</div>
		);

		const content = screen.getByTestId("content");
		expect(container.contains(content)).toBe(true);
		expect(content.parentElement).toBe(screen.getByTestId("react-parent"));
	});

	it("survives a StrictMode mount without leaving a stray copy behind", () => {
		const target = document.createElement("section");
		document.body.appendChild(target);

		const { unmount } = render(
			<StrictMode>
				<Portal target={target}>
					<div data-testid="content">portal content</div>
				</Portal>
			</StrictMode>
		);

		expect(target.childElementCount).toBe(1);

		unmount();
		expect(target.childElementCount).toBe(0);
	});
});

describe("usePortalTarget", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("reports null on the first render and the resolved target once mounted", () => {
		const seen: (HTMLElement | null)[] = [];

		function Probe() {
			seen.push(usePortalTarget());
			return null;
		}

		render(<Probe />);

		// Null during the hydration render, so the server HTML and the first
		// client render agree by construction.
		expect(seen[0]).toBeNull();
		expect(seen.at(-1)).toBe(document.body);
	});

	it("re-resolves when the target changes", () => {
		const first = document.createElement("section");
		first.id = "first";
		const second = document.createElement("section");
		second.id = "second";
		document.body.append(first, second);

		function Probe() {
			const [selector, setSelector] = useState("#first");
			const target = usePortalTarget(selector);
			return (
				<button type="button" data-testid="swap" onClick={() => setSelector("#second")}>
					{target?.id ?? "none"}
				</button>
			);
		}

		render(<Probe />);
		expect(screen.getByTestId("swap").textContent).toBe("first");

		fireEvent.click(screen.getByTestId("swap"));
		expect(screen.getByTestId("swap").textContent).toBe("second");
	});
});
