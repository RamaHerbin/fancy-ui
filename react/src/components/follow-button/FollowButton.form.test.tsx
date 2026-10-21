import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { FollowButton } from "./FollowButton.js";

describe("FollowButton form contract", () => {
	afterEach(cleanup);

	it("is type=button and never submits the enclosing form, even asked to", () => {
		let submitted = 0;
		const { container } = render(
			<form
				onSubmit={(e) => {
					e.preventDefault();
					submitted++;
				}}
			>
				<FollowButton name="follow" {...({ type: "submit" } as Record<string, unknown>)} />
			</form>
		);
		const el = container.querySelector("button") as HTMLButtonElement;
		expect(el.type).toBe("button");
		fireEvent.click(el);
		expect(submitted).toBe(0);
		expect(new FormData(container.querySelector("form") as HTMLFormElement).has("follow")).toBe(
			false
		);
	});

	it("passes form and aria-invalid through", () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const { container } = render(<FollowButton form="far" aria-invalid />);
		const el = container.querySelector("button") as HTMLButtonElement;
		expect(el.form).toBe(target);
		expect(el.getAttribute("aria-invalid")).toBe("true");
		target.remove();
	});
});
