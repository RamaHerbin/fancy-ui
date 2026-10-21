import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, expect, it } from "vitest";
import CopyButton from "./CopyButton.vue";

const mount = render as unknown as (
	comp: unknown,
	options: Record<string, unknown>
) => ReturnType<typeof render>;

describe("CopyButton form contract", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("never submits the enclosing form, even asked to, and `value` is not a form value", async () => {
		const form = document.body.appendChild(document.createElement("form"));
		let submitted = 0;
		form.addEventListener("submit", (e) => {
			e.preventDefault();
			submitted++;
		});
		mount(CopyButton, {
			container: form,
			props: { value: "npm i fancy" },
			attrs: { name: "copy", type: "submit" },
		});
		const el = form.querySelector("button") as HTMLButtonElement;
		expect(el.type).toBe("button");
		await fireEvent.click(el);
		expect(submitted).toBe(0);
		expect(new FormData(form).has("copy")).toBe(false);
	});

	it("passes form and aria-invalid through", () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const { container } = mount(CopyButton, {
			props: { value: "x" },
			attrs: { form: "far", "aria-invalid": "true" },
		});
		const el = container.querySelector("button") as HTMLButtonElement;
		expect(el.form).toBe(target);
		expect(el.getAttribute("aria-invalid")).toBe("true");
	});
});
