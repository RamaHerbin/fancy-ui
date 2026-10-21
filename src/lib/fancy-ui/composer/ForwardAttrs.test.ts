import { render, cleanup, fireEvent } from "@testing-library/svelte";
import { afterEach, describe, it, expect, vi } from "vitest";
import Harness from "./ForwardAttrsHarness.test.svelte";

afterEach(cleanup);

const input = () => document.querySelector("textarea") as HTMLTextAreaElement;
const submit = () => document.querySelector(".ft-composer-submit") as HTMLButtonElement;
const picker = () => document.querySelector(".ft-composer-model") as HTMLButtonElement;

describe("ComposerInput forwards native attributes", () => {
	it("puts id, name, data-testid and aria-describedby on the textarea", () => {
		render(Harness, {
			inputAttrs: {
				id: "msg",
				name: "message",
				maxlength: 200,
				"data-testid": "in",
				"aria-describedby": "hint",
			},
		});
		expect(input().id).toBe("msg");
		expect(input().name).toBe("message");
		expect(input().maxLength).toBe(200);
		expect(input().getAttribute("data-testid")).toBe("in");
		expect(input().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires listeners the component does not handle once", async () => {
		const onblur = vi.fn();
		const onfocus = vi.fn();
		render(Harness, { inputAttrs: { onblur, onfocus } });
		await fireEvent.focus(input());
		await fireEvent.blur(input());
		expect(onfocus).toHaveBeenCalledTimes(1);
		expect(onblur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer oninput once, after the draft was stored", async () => {
		const oninput = vi.fn();
		render(Harness, { inputAttrs: { oninput } });
		await fireEvent.input(input(), { target: { value: "hello" } });
		expect(oninput).toHaveBeenCalledTimes(1);
		expect(input().value).toBe("hello");
	});

	it("runs the consumer onkeydown once, after Enter submitted", async () => {
		const onkeydown = vi.fn();
		const onSubmit = vi.fn();
		render(Harness, { initialValue: "hi", onSubmit, inputAttrs: { onkeydown } });
		await fireEvent.keyDown(input(), { key: "Enter" });
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onkeydown).toHaveBeenCalledTimes(1);
	});

	it("keeps value, readonly and aria-disabled authoritative", () => {
		render(Harness, {
			initialValue: "kept",
			streaming: true,
			inputAttrs: { value: "nope", "aria-disabled": "false", readonly: false },
		});
		expect(input().value).toBe("kept");
		expect(input().getAttribute("aria-disabled")).toBe("true");
		expect(input().readOnly).toBe(true);
	});
});

describe("ComposerSubmit forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(Harness, {
			submitAttrs: { id: "go", "data-testid": "s", "aria-describedby": "hint" },
		});
		expect(submit().id).toBe("go");
		expect(submit().getAttribute("data-testid")).toBe("s");
		expect(submit().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires a listener the component does not handle once", async () => {
		const onpointerdown = vi.fn();
		render(Harness, { submitAttrs: { onpointerdown } });
		await fireEvent.pointerDown(submit());
		expect(onpointerdown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once, after stop was requested", async () => {
		const onclick = vi.fn();
		const onStop = vi.fn();
		render(Harness, { streaming: true, onStop, submitAttrs: { onclick } });
		await fireEvent.click(submit());
		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onclick).toHaveBeenCalledTimes(1);
	});

	it("does not call the consumer onclick while disabled", async () => {
		const onclick = vi.fn();
		render(Harness, { submitAttrs: { onclick } });
		expect(submit().disabled).toBe(true);
		await fireEvent.click(submit());
		expect(onclick).not.toHaveBeenCalled();
	});

	it("keeps type, disabled and aria-label authoritative", () => {
		render(Harness, {
			submitAttrs: { type: "reset", disabled: false, "aria-label": "Zap", title: "Zap" },
		});
		expect(submit().type).toBe("submit");
		expect(submit().disabled).toBe(true);
		expect(submit().getAttribute("aria-label")).toBe("Send");
		expect(submit().title).toBe("Send");
	});
});

describe("ComposerModelPicker forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the trigger button", () => {
		render(Harness, {
			pickerAttrs: { id: "mdl", "data-testid": "p", "aria-describedby": "hint" },
		});
		expect(picker().id).toBe("mdl");
		expect(picker().getAttribute("data-testid")).toBe("p");
		expect(picker().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires a listener the component does not handle once", async () => {
		const onblur = vi.fn();
		render(Harness, { pickerAttrs: { onblur } });
		await fireEvent.blur(picker());
		expect(onblur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onclick once, after the menu opened", async () => {
		const onclick = vi.fn();
		render(Harness, { pickerAttrs: { onclick } });
		await fireEvent.click(picker());
		expect(onclick).toHaveBeenCalledTimes(1);
		expect(picker().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs the consumer onkeydown once, after ArrowDown opened the menu", async () => {
		const onkeydown = vi.fn();
		render(Harness, { pickerAttrs: { onkeydown } });
		await fireEvent.keyDown(picker(), { key: "ArrowDown" });
		expect(onkeydown).toHaveBeenCalledTimes(1);
		expect(picker().getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps type, aria-haspopup and aria-expanded authoritative", () => {
		render(Harness, {
			pickerAttrs: { type: "submit", "aria-haspopup": "menu", "aria-expanded": "true" },
		});
		expect(picker().type).toBe("button");
		expect(picker().getAttribute("aria-haspopup")).toBe("listbox");
		expect(picker().getAttribute("aria-expanded")).toBe("false");
	});
});
