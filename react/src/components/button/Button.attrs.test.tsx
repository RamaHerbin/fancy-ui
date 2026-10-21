import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Button } from "./Button.js";

function root(container: HTMLElement) {
	return container.firstElementChild as HTMLElement;
}

describe("Button native attributes", () => {
	afterEach(cleanup);

	const cases = [
		{ name: "button", props: {}, tag: "BUTTON" },
		{ name: "anchor", props: { href: "/x" }, tag: "A" },
	] as const;

	describe.each(cases)("$name branch", ({ props, tag }) => {
		it("forwards id, aria-* and data-* to the native element", () => {
			const { container } = render(
				<Button
					{...props}
					id="go"
					aria-describedby="hint"
					aria-controls="panel"
					aria-expanded="false"
					data-testid="btn"
				/>
			);
			const el = root(container);
			expect(el.tagName).toBe(tag);
			expect(el.id).toBe("go");
			expect(el.getAttribute("aria-describedby")).toBe("hint");
			expect(el.getAttribute("aria-controls")).toBe("panel");
			expect(el.getAttribute("aria-expanded")).toBe("false");
			expect(el.getAttribute("data-testid")).toBe("btn");
		});

		it("fires a listener the component does not handle once", () => {
			const onFocus = vi.fn();
			const onKeyDown = vi.fn();
			const { container } = render(<Button {...props} onFocus={onFocus} onKeyDown={onKeyDown} />);
			fireEvent.focus(root(container));
			fireEvent.keyDown(root(container), { key: "a" });
			expect(onFocus).toHaveBeenCalledTimes(1);
			expect(onKeyDown).toHaveBeenCalledTimes(1);
		});

		it("lets a consumer aria-label stand when no label prop is set", () => {
			const { container } = render(<Button {...props} aria-label="Mine" />);
			expect(root(container).getAttribute("aria-label")).toBe("Mine");
		});

		it("keeps aria-busy authoritative while loading", () => {
			const { container } = render(<Button {...props} loading aria-busy="false" />);
			expect(root(container).getAttribute("aria-busy")).toBe("true");
		});

		it("calls the consumer click once, and not while loading", () => {
			const onClick = vi.fn();
			const { container } = render(<Button {...props} onClick={onClick} />);
			fireEvent.click(root(container));
			expect(onClick).toHaveBeenCalledTimes(1);
			cleanup();
			const blocked = vi.fn();
			const { container: c2 } = render(<Button {...props} loading onClick={blocked} />);
			fireEvent.click(root(c2));
			expect(blocked).not.toHaveBeenCalled();
		});
	});

	it("keeps a disabled link inert whatever the consumer passes", () => {
		const { container } = render(<Button href="/x" disabled tabIndex={0} aria-disabled="false" />);
		const el = root(container);
		expect(el.getAttribute("tabindex")).toBe("-1");
		expect(el.getAttribute("aria-disabled")).toBe("true");
		expect(el.hasAttribute("href")).toBe(false);
	});

	it("keeps a consumer tabindex on an enabled link", () => {
		const { container } = render(<Button href="/x" tabIndex={0} />);
		expect(root(container).getAttribute("tabindex")).toBe("0");
	});

	it("keeps the button type authoritative", () => {
		const { container } = render(<Button type="submit" />);
		expect(root(container).getAttribute("type")).toBe("submit");
	});
});
