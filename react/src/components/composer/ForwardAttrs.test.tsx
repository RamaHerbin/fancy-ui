import { cleanup, fireEvent, render } from "@testing-library/react";
import type { ComponentProps } from "react";
import { afterEach, describe, it, expect, vi } from "vitest";

import { Composer } from "./Composer.js";
import { ComposerInput } from "./ComposerInput.js";
import { ComposerSubmit } from "./ComposerSubmit.js";
import { ComposerModelPicker } from "./ComposerModelPicker.js";

afterEach(cleanup);

const MODELS = [
	{ id: "a", label: "Alpha" },
	{ id: "b", label: "Beta" },
];

interface RigProps {
	input?: Partial<ComponentProps<typeof ComposerInput>> & Record<string, unknown>;
	submit?: Partial<ComponentProps<typeof ComposerSubmit>> & Record<string, unknown>;
	picker?: Partial<ComponentProps<typeof ComposerModelPicker>> & Record<string, unknown>;
	value?: string;
	streaming?: boolean;
	onStop?: () => void;
	onSubmit?: () => void;
}

function Rig({ input, submit, picker, value = "", streaming, onStop, onSubmit }: RigProps) {
	return (
		<Composer value={value} streaming={streaming} onStop={onStop} onSubmit={onSubmit}>
			<ComposerInput {...input} />
			<ComposerModelPicker models={MODELS} {...picker} />
			<ComposerSubmit {...submit} />
		</Composer>
	);
}

const input = () => document.querySelector("textarea") as HTMLTextAreaElement;
const submit = () => document.querySelector(".ft-composer-submit") as HTMLButtonElement;
const picker = () => document.querySelector(".ft-composer-model") as HTMLButtonElement;

describe("ComposerInput forwards native attributes", () => {
	it("puts id, name, data-testid and aria-describedby on the textarea", () => {
		render(
			<Rig
				input={{
					id: "msg",
					name: "message",
					maxLength: 200,
					"data-testid": "in",
					"aria-describedby": "hint",
				}}
			/>
		);
		expect(input().id).toBe("msg");
		expect(input().name).toBe("message");
		expect(input().maxLength).toBe(200);
		expect(input().getAttribute("data-testid")).toBe("in");
		expect(input().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires listeners the component does not handle once", () => {
		const onBlur = vi.fn();
		const onFocus = vi.fn();
		render(<Rig input={{ onBlur, onFocus }} />);
		fireEvent.focus(input());
		fireEvent.blur(input());
		expect(onFocus).toHaveBeenCalledTimes(1);
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onChange once, after the draft was stored", () => {
		const onChange = vi.fn();
		render(<Rig input={{ onChange }} />);
		fireEvent.change(input(), { target: { value: "hello" } });
		expect(onChange).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onKeyDown once, after Enter submitted", () => {
		const onKeyDown = vi.fn();
		const onSubmit = vi.fn();
		render(<Rig value="hi" onSubmit={onSubmit} input={{ onKeyDown }} />);
		fireEvent.keyDown(input(), { key: "Enter" });
		expect(onSubmit).toHaveBeenCalledTimes(1);
		expect(onKeyDown).toHaveBeenCalledTimes(1);
	});

	it("keeps value, readOnly and aria-disabled authoritative", () => {
		render(
			<Rig
				value="kept"
				streaming
				input={{ value: "nope", "aria-disabled": false, readOnly: false }}
			/>
		);
		expect(input().value).toBe("kept");
		expect(input().getAttribute("aria-disabled")).toBe("true");
		expect(input().readOnly).toBe(true);
	});
});

describe("ComposerSubmit forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the button", () => {
		render(<Rig submit={{ id: "go", "data-testid": "s", "aria-describedby": "hint" }} />);
		expect(submit().id).toBe("go");
		expect(submit().getAttribute("data-testid")).toBe("s");
		expect(submit().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires a listener the component does not handle once", () => {
		const onPointerDown = vi.fn();
		render(<Rig submit={{ onPointerDown }} />);
		fireEvent.pointerDown(submit());
		expect(onPointerDown).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after stop was requested", () => {
		const onClick = vi.fn();
		const onStop = vi.fn();
		render(<Rig streaming onStop={onStop} submit={{ onClick }} />);
		fireEvent.click(submit());
		expect(onStop).toHaveBeenCalledTimes(1);
		expect(onClick).toHaveBeenCalledTimes(1);
	});

	it("does not call the consumer onClick while disabled", () => {
		const onClick = vi.fn();
		render(<Rig submit={{ onClick }} />);
		expect(submit().disabled).toBe(true);
		fireEvent.click(submit());
		expect(onClick).not.toHaveBeenCalled();
	});

	it("keeps type, disabled and aria-label authoritative", () => {
		render(<Rig submit={{ type: "reset", disabled: false, "aria-label": "Zap", title: "Zap" }} />);
		expect(submit().type).toBe("submit");
		expect(submit().disabled).toBe(true);
		expect(submit().getAttribute("aria-label")).toBe("Send");
		expect(submit().title).toBe("Send");
	});
});

describe("ComposerModelPicker forwards native attributes", () => {
	it("puts id, data-testid and aria-describedby on the trigger button", () => {
		render(<Rig picker={{ id: "mdl", "data-testid": "p", "aria-describedby": "hint" }} />);
		expect(picker().id).toBe("mdl");
		expect(picker().getAttribute("data-testid")).toBe("p");
		expect(picker().getAttribute("aria-describedby")).toBe("hint");
	});

	it("fires a listener the component does not handle once", () => {
		const onBlur = vi.fn();
		render(<Rig picker={{ onBlur }} />);
		fireEvent.blur(picker());
		expect(onBlur).toHaveBeenCalledTimes(1);
	});

	it("runs the consumer onClick once, after the menu opened", () => {
		const onClick = vi.fn();
		render(<Rig picker={{ onClick }} />);
		fireEvent.click(picker());
		expect(onClick).toHaveBeenCalledTimes(1);
		expect(picker().getAttribute("aria-expanded")).toBe("true");
	});

	it("runs the consumer onKeyDown once, after ArrowDown opened the menu", () => {
		const onKeyDown = vi.fn();
		render(<Rig picker={{ onKeyDown }} />);
		fireEvent.keyDown(picker(), { key: "ArrowDown" });
		expect(onKeyDown).toHaveBeenCalledTimes(1);
		expect(picker().getAttribute("aria-expanded")).toBe("true");
	});

	it("keeps type, aria-haspopup and aria-expanded authoritative", () => {
		render(<Rig picker={{ type: "submit", "aria-haspopup": "menu", "aria-expanded": true }} />);
		expect(picker().type).toBe("button");
		expect(picker().getAttribute("aria-haspopup")).toBe("listbox");
		expect(picker().getAttribute("aria-expanded")).toBe("false");
	});
});
