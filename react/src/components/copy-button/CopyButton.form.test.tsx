import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { CopyButton } from "./CopyButton.js";

describe("CopyButton form contract", () => {
	afterEach(cleanup);

	it("never submits the enclosing form, even asked to, and `value` is not a form value", () => {
		let submitted = 0;
		const { container } = render(
			<form
				onSubmit={(e) => {
					e.preventDefault();
					submitted++;
				}}
			>
				<CopyButton value="npm i fancy" name="copy" {...({ type: "submit" } as object)} />
			</form>
		);
		const el = container.querySelector("button") as HTMLButtonElement;
		expect(el.type).toBe("button");
		fireEvent.click(el);
		expect(submitted).toBe(0);
		expect(new FormData(container.querySelector("form") as HTMLFormElement).has("copy")).toBe(
			false
		);
	});

	it("passes form and aria-invalid through", () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const { container } = render(<CopyButton value="x" form="far" aria-invalid />);
		const el = container.querySelector("button") as HTMLButtonElement;
		expect(el.form).toBe(target);
		expect(el.getAttribute("aria-invalid")).toBe("true");
		target.remove();
	});
});
