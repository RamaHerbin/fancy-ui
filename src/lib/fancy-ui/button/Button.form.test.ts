import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Button from "./Button.svelte";

type Submitted = { data: FormData; submitter: HTMLElement | null };

function mountForm(props: Record<string, unknown>) {
	const form = document.body.appendChild(document.createElement("form"));
	const seen: Submitted[] = [];
	form.addEventListener("submit", (event) => {
		event.preventDefault();
		const submitter = (event as SubmitEvent).submitter;
		seen.push({ data: new FormData(form, submitter), submitter });
	});
	render(Button, { target: form, props });
	return { form, seen, button: form.querySelector("button") as HTMLButtonElement };
}

describe("Button form contract", () => {
	afterEach(() => {
		cleanup();
		document.body.innerHTML = "";
	});

	it("submits name=value of the submitter with requestSubmit", () => {
		const { form, seen, button } = mountForm({ type: "submit", name: "intent", value: "save" });
		form.requestSubmit(button);
		expect(seen).toHaveLength(1);
		expect(seen[0].data.get("intent")).toBe("save");
		expect(seen[0].submitter).toBe(button);
	});

	it("submits on a real click when type=submit", async () => {
		const { seen, button } = mountForm({ type: "submit", name: "intent", value: "go" });
		await fireEvent.click(button);
		expect(seen).toHaveLength(1);
		expect(seen[0].data.get("intent")).toBe("go");
	});

	it("defaults to type=button and does not submit", async () => {
		const { seen, button } = mountForm({});
		expect(button.type).toBe("button");
		await fireEvent.click(button);
		expect(seen).toHaveLength(0);
	});

	it("honours form=id to submit a form it is not nested in", async () => {
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		const seen = vi.fn((e: Event) => e.preventDefault());
		target.addEventListener("submit", seen);
		const { container } = render(Button, {
			props: { type: "submit", form: "far", name: "intent", value: "x" },
		});
		const el = container.querySelector("button") as HTMLButtonElement;
		expect(el.form).toBe(target);
		await fireEvent.click(el);
		expect(seen).toHaveBeenCalledTimes(1);
	});

	it("forwards formaction, formmethod and formnovalidate to the native button", () => {
		const { button } = mountForm({
			type: "submit",
			formaction: "/other",
			formmethod: "post",
			formnovalidate: true,
		});
		expect(button.getAttribute("formaction")).toBe("/other");
		expect(button.getAttribute("formmethod")).toBe("post");
		expect(button.hasAttribute("formnovalidate")).toBe(true);
	});

	it("does not submit while loading, on a click or a scripted click", async () => {
		const { seen, button } = mountForm({ type: "submit", loading: true, name: "n", value: "v" });
		await fireEvent.click(button);
		button.click();
		expect(seen).toHaveLength(0);
	});

	it("keeps a loading button out of the disabled state", () => {
		const { button } = mountForm({ type: "submit", loading: true });
		expect(button.disabled).toBe(false);
		expect(button.getAttribute("aria-busy")).toBe("true");
	});

	it("does not submit a disabled submit button", async () => {
		const { seen, button } = mountForm({ type: "submit", disabled: true });
		await fireEvent.click(button);
		expect(seen).toHaveLength(0);
	});

	it("passes required and aria-invalid through", () => {
		const { button } = mountForm({ required: true, "aria-invalid": "true" });
		expect(button.hasAttribute("required")).toBe(true);
		expect(button.getAttribute("aria-invalid")).toBe("true");
	});
});
