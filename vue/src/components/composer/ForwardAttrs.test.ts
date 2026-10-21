import { render, cleanup, fireEvent } from "@testing-library/vue";
import { defineComponent, h, nextTick, type PropType } from "vue";
import { afterEach, describe, it, expect, vi } from "vitest";

import Composer from "./Composer.vue";
import ComposerInput from "./ComposerInput.vue";
import ComposerSubmit from "./ComposerSubmit.vue";
import ComposerModelPicker from "./ComposerModelPicker.vue";

afterEach(cleanup);

type Bag = Record<string, unknown>;

const MODELS = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Beta" },
];

/** The three composer parts carrying consumer attribute bags inside a real root. */
const Harness = defineComponent({
	name: "ForwardAttrsHarness",
	props: {
		inputAttrs: { type: Object as PropType<Bag>, default: () => ({}) },
		submitAttrs: { type: Object as PropType<Bag>, default: () => ({}) },
		pickerAttrs: { type: Object as PropType<Bag>, default: () => ({}) },
		value: { type: String, default: "" },
		streaming: { type: Boolean, default: false },
		onStop: { type: Function as PropType<() => void>, default: undefined },
		onSubmit: { type: Function as PropType<() => void>, default: undefined },
	},
	setup(props) {
		return () =>
			h(
				Composer,
				{
					value: props.value,
					streaming: props.streaming,
					onStop: props.onStop,
					onSubmit: props.onSubmit,
				},
				{
					default: () => [
						h(ComposerInput, props.inputAttrs),
						h(ComposerModelPicker, { models: MODELS, ...props.pickerAttrs }),
						h(ComposerSubmit, props.submitAttrs),
					],
				}
			);
	},
});

const input = () => document.querySelector("textarea") as HTMLTextAreaElement;
const submit = () => document.querySelector(".ft-composer-submit") as HTMLButtonElement;
const picker = () => document.querySelector(".ft-composer-model") as HTMLButtonElement;

describe("ComposerInput forwards native attributes", () => {
	it("puts id, name, data-testid and aria-describedby on the textarea", () => {
		render(Harness, {
			props: {
				inputAttrs: {
					id: "msg",
					name: "message",
					maxlength: 200,
					"data-testid": "in",
					"aria-describedby": "hint",
				},
			},
		});
		expect(input().id).toBe("msg");
		expect(input().name).toBe("message");
		expect(input().maxLength).toBe(200);
		expect(input().getAttribute("data-testid")).toBe("in");
		expect(input().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires listeners the component does not handle once", async () => {
		const onBlur = vi.fn();
		const onFocus = vi.fn();
		render(Harness, { props: { inputAttrs: { onBlur, onFocus } } });
		await fireEvent.focus(input());
		await fireEvent.blur(input());
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onInput once, after the draft was stored", async () => {
		const onInput = vi.fn();
		render(Harness, { props: { inputAttrs: { onInput } } });
		await fireEvent.update(input(), "hello");
		expect(onInput).toHaveBeenCalledTimes(1);
		expect(input().value).toBe("hello");
	});

	it("runs the consumer onKeydown once, after Enter submitted", async () => {
		const onKeydown = vi.fn();
		const onSubmit = vi.fn();
		render(Harness, { props: { value: "hi", onSubmit, inputAttrs: { onKeydown } } });
		await fireEvent.keyDown(input(), { key: "Enter" });
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onKeydown).toHaveBeenCalledTimes(1);
	});

	it("keeps value, readonly and aria-disabled authoritative", () => {
		render(Harness, {
			props: {
				value: "kept",
				streaming: true,
				inputAttrs: { value: "nope", "aria-disabled": "false", readonly: false },
			},
		});
		expect(input().value).toBe("kept");
		expect(input().getAttribute("aria-disabled")).toBe("true");
		expect(input().readOnly).toBe(true);
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness);
		await rerender({ inputAttrs: { "data-late": "yes" } });
		await nextTick();
		expect(input().getAttribute("data-late")).toBe("yes");
	});
});

describe("ComposerSubmit forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(Harness, {
			props: { submitAttrs: { id: "go", "data-testid": "s", "aria-describedby": "hint" } },
		});
		expect(submit().id).toBe("go");
		expect(submit().getAttribute("data-testid")).toBe("s");
		expect(submit().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires a listener the component does not handle once", async () => {
		const onBlur = vi.fn();
		render(Harness, { props: { submitAttrs: { onBlur } } });
		await fireEvent.blur(submit());
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after stop was requested", async () => {
		const onClick = vi.fn();
		const onStop = vi.fn();
		render(Harness, { props: { streaming: true, onStop, submitAttrs: { onClick } } });
		await fireEvent.click(submit());
		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("does not call the consumer onClick while disabled", async () => {
		const onClick = vi.fn();
		render(Harness, { props: { submitAttrs: { onClick } } });
		expect(submit().disabled).toBe(true);
		await fireEvent.click(submit());
		expect(onClick).not.toHaveBeenCalled();
	});

	it("keeps type, disabled and aria-label authoritative", () => {
		render(Harness, {
			props: {
				submitAttrs: { type: "reset", disabled: false, "aria-label": "Zap", title: "Zap" },
			},
		});
		expect(submit().type).toBe("submit");
		expect(submit().disabled).toBe(true);
		expect(submit().getAttribute("aria-label")).toBe("Send");
		expect(submit().title).toBe("Send");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness);
		await rerender({ submitAttrs: { "data-late": "yes" } });
		await nextTick();
		expect(submit().getAttribute("data-late")).toBe("yes");
	});
});

describe("ComposerModelPicker forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the trigger button", () => {
		render(Harness, {
			props: { pickerAttrs: { id: "mdl", "data-testid": "p", "aria-describedby": "hint" } },
		});
		expect(picker().id).toBe("mdl");
		expect(picker().getAttribute("data-testid")).toBe("p");
		expect(picker().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires a listener the component does not handle once", async () => {
		const onBlur = vi.fn();
		render(Harness, { props: { pickerAttrs: { onBlur } } });
		await fireEvent.blur(picker());
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the menu opened", async () => {
		const onClick = vi.fn();
		render(Harness, { props: { pickerAttrs: { onClick } } });
		await fireEvent.click(picker());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(picker().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs the consumer onKeydown once, after ArrowDown opened the menu", async () => {
		const onKeydown = vi.fn();
		render(Harness, { props: { pickerAttrs: { onKeydown } } });
		await fireEvent.keyDown(picker(), { key: "ArrowDown" });
		expect(onKeydown).toHaveBeenCalledTimes(1);
		expect(picker().getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps type, aria-haspopup and aria-expanded authoritative", () => {
		render(Harness, {
			props: {
				pickerAttrs: { type: "submit", "aria-haspopup": "menu", "aria-expanded": "true" },
			},
		});
		expect(picker().type).toBe("button");
		expect(picker().getAttribute("aria-haspopup")).toBe("listbox");
		expect(picker().getAttribute("aria-expanded")).toBe("false");
	});

	it("applies an attribute added by a re-render", async () => {
		const { rerender } = render(Harness);
		await rerender({ pickerAttrs: { "data-late": "yes" } });
		await nextTick();
		expect(picker().getAttribute("data-late")).toBe("yes");
	});
});
