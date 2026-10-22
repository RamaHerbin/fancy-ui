import { render, cleanup, fireEvent } from "@testing-library/react";
import { afterEach, describe, it, expect, vi } from "vitest";
import { Button } from "./Button.js";

function setup(props: Record<string, unknown>) {
	const seen: { data: FormData; submitter: HTMLElement | null }[] = [];
	const onSubmit = (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		const submitter = (event.nativeEvent as SubmitEvent).submitter;
		seen.push({ data: new FormData(event.currentTarget, submitter), submitter });
	};
	const { container } = render(
		<form onSubmit={onSubmit}>
			<Button {...props}>Go</Button>
		</form>
	);
	return {
		seen,
		form: container.querySelector("form") as HTMLFormElement,
		button: container.querySelector("button") as HTMLButtonElement,
	};
}

describe("Button form contract", () => {
	afterEach(cleanup);

	it("submits name=value of the submitter with requestSubmit", () => {
		const { form, seen, button } = setup({ type: "submit", name: "intent", value: "save" });
		form.requestSubmit(button);
		expect(seen).toHaveLength(1);
		expect(seen[0]!.data.get("intent")).toBe("save");
		expect(seen[0]!.submitter).toBe(button);
	});

	it("submits on a real click when type=submit", () => {
		const { seen, button } = setup({ type: "submit", name: "intent", value: "go" });
		fireEvent.click(button);
		expect(seen).toHaveLength(1);
		expect(seen[0]!.data.get("intent")).toBe("go");
	});

	it("defaults to type=button and does not submit", () => {
		const { seen, button } = setup({});
		expect(button.type).toBe("button");
		fireEvent.click(button);
		expect(seen).toHaveLength(0);
	});

	it("honours form=id to submit a form it is not nested in", () => {
		const onSubmit = vi.fn((e: Event) => e.preventDefault());
		const target = document.body.appendChild(document.createElement("form"));
		target.id = "far";
		target.addEventListener("submit", onSubmit);
		const { container } = render(<Button type="submit" form="far" name="intent" value="x" />);
		const el = container.querySelector("button") as HTMLButtonElement;
		expect(el.form).toBe(target);
		fireEvent.click(el);
		expect(onSubmit).toHaveBeenCalledTimes(1);
		target.remove();
	});

	it("forwards formAction, formMethod and formNoValidate", () => {
		const { button } = setup({
			type: "submit",
			formAction: "/other",
			formMethod: "post",
			formNoValidate: true,
		});
		expect(button.getAttribute("formaction")).toBe("/other");
		expect(button.getAttribute("formmethod")).toBe("post");
		expect(button.hasAttribute("formnovalidate")).toBe(true);
	});

	it("does not submit while loading, on a click or a scripted click", () => {
		const { seen, button } = setup({ type: "submit", loading: true, name: "n", value: "v" });
		fireEvent.click(button);
		button.click();
		expect(seen).toHaveLength(0);
	});

	it("keeps a loading button out of the disabled state", () => {
		const { button } = setup({ type: "submit", loading: true });
		expect(button.disabled).toBe(false);
		expect(button.getAttribute("aria-busy")).toBe("true");
	});

	it("does not submit a disabled submit button", () => {
		const { seen, button } = setup({ type: "submit", disabled: true });
		fireEvent.click(button);
		expect(seen).toHaveLength(0);
	});

	it("passes required and aria-invalid through", () => {
		const { button } = setup({ required: true, "aria-invalid": true });
		expect(button.hasAttribute("required")).toBe(true);
		expect(button.getAttribute("aria-invalid")).toBe("true");
	});
});
