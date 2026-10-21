import { render, cleanup, fireEvent } from "@testing-library/vue";
import { afterEach, describe, it, expect, vi } from "vitest";
import Button from "./Button.vue";

type Opts = { props?: Record<string, unknown>; attrs?: Record<string, unknown> };
const mount = render as unknown as (
	comp: unknown,
	options: Opts & Record<string, unknown>
) => ReturnType<typeof render>;

function setup(opts: Opts) {
	const form = document.body.appendChild(document.createElement("form"));
	const seen: { data: FormData; submitter: HTMLElement | null }[] = [];
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const submitter = (event as SubmitEvent).submitter;
		seen.push({ data: new FormData(form, submitter), submitter });
	});
	mount(Button, { container: form, ...opts });
	return { form, seen, button: form.querySelector("button") as HTMLButtonElement };
}

describe("Button form contract", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("submits name=value of the submitter with requestSubmit", () => {
		const { form, seen, button } = setup({
			props: { type: "submit" },
			attrs: { name: "intent", value: "save" },
		});
		form.requestSubmit(button);
		expect(seen).toHaveLength(1);
		expect(seen[0]!.data.get("intent")).toBe("save");
		expect(seen[0]!.submitter).toBe(button);
	});

	it("submits on a real click when type=submit", async () => {
		const { seen, button } = setup({
			props: { type: "submit" },
			attrs: { name: "intent", value: "go" },
		});
		await fireEvent.click(button);
		expect(seen).toHaveLength(1);
		expect(seen[0]!.data.get("intent")).toBe("go");
	});

	it("defaults to type=button and does not submit", async () => {
		const { seen, button } = setup({});
		expect(button.type).toBe("button");
		await fireEvent.click(button);
		expect(seen).toHaveLength(0);
	});

	it("honours form=id to submit a form it is not nested in", async () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const onSubmit = vi.fn((e: Event) => e.preventDefault());
		target.addEventListener("submit", onSubmit);
		const { container } = mount(Button, {
			props: { type: "submit" },
			attrs: { form: "far", name: "intent", value: "x" },
		});
		const el = container.querySelector("button") as HTMLButtonElement;
		expect(el.form).toBe(target);
		await fireEvent.click(el);
		expect(onSubmit).toHaveBeenCalledTimes(1);
	});

	it("forwards formaction, formmethod and formnovalidate", () => {
		const { button } = setup({
			props: { type: "submit" },
			attrs: { formaction: "/other", formmethod: "post", formnovalidate: true },
		});
		expect(button.getAttribute("formaction")).toBe("/other");
		expect(button.getAttribute("formmethod")).toBe("post");
		expect(button.hasAttribute("formnovalidate")).toBe(true);
	});

	it("does not submit while loading, on a click or a scripted click", async () => {
		const { seen, button } = setup({
			props: { type: "submit", loading: true },
			attrs: { name: "n", value: "v" },
		});
		await fireEvent.click(button);
		button.click();
		expect(seen).toHaveLength(0);
	});

	it("keeps a loading button out of the disabled state", () => {
		const { button } = setup({ props: { type: "submit", loading: true } });
		expect(button.disabled).toBe(false);
		expect(button.getAttribute("aria-busy")).toBe("true");
	});

	it("does not submit a disabled submit button", async () => {
		const { seen, button } = setup({ props: { type: "submit", disabled: true } });
		await fireEvent.click(button);
		expect(seen).toHaveLength(0);
	});

	it("passes required and aria-invalid through", () => {
		const { button } = setup({ attrs: { required: true, "aria-invalid": "true" } });
		expect(button.hasAttribute("required")).toBe(true);
		expect(button.getAttribute("aria-invalid")).toBe("true");
	});
});
