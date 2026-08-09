import { afterEach, describe, it, expect } from "vitest";
import { focusTrap } from "./focus-trap";

function pressTab(options: { shiftKey?: boolean } = {}) {
	const event = new KeyboardEvent("keydown", {
		key: "Tab",
		shiftKey: options.shiftKey ?? false,
		bubbles: true,
		cancelable: true,
	});
	document.activeElement?.dispatchEvent(event);
	return event;
}

describe("focusTrap", () => {
	let container: HTMLElement;

	afterEach(() => {
		container?.remove();
		document.body.innerHTML = "";
	});

	function setup(innerHtml: string) {
		container = document.createElement("div");
		container.innerHTML = innerHtml;
		document.body.appendChild(container);
		const trapNode = container.querySelector<HTMLElement>("#trap")!;
		return trapNode;
	}

	it("focuses the first focusable element by default", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
			</div>
		`);
		focusTrap(trapNode);
		expect(document.activeElement?.id).toBe("a");
	});

	it("focuses the given initialFocus element", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
			</div>
		`);
		const b = trapNode.querySelector<HTMLElement>("#b")!;
		focusTrap(trapNode, { initialFocus: b });
		expect(document.activeElement?.id).toBe("b");
	});

	it("cycles forward from the last focusable element back to the first on Tab", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
				<button id="c">C</button>
			</div>
		`);
		focusTrap(trapNode);
		trapNode.querySelector<HTMLElement>("#c")!.focus();

		const event = pressTab();

		expect(document.activeElement?.id).toBe("a");
		expect(event.defaultPrevented).toBe(true);
	});

	it("cycles backward from the first focusable element to the last on Shift+Tab", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
				<button id="c">C</button>
			</div>
		`);
		focusTrap(trapNode);

		const event = pressTab({ shiftKey: true });

		expect(document.activeElement?.id).toBe("c");
		expect(event.defaultPrevented).toBe(true);
	});

	it("does not interfere with Tab between elements in the middle", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
				<button id="c">C</button>
			</div>
		`);
		focusTrap(trapNode);
		trapNode.querySelector<HTMLElement>("#b")!.focus();

		const event = pressTab();

		// jsdom does not implement native Tab traversal; the action only
		// intervenes at the boundaries, leaving mid-cycle Tabs untouched.
		expect(event.defaultPrevented).toBe(false);
	});

	it("ignores tabindex=-1 elements when cycling", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
				<button id="b">B</button>
				<div id="ghost" tabindex="-1"></div>
			</div>
		`);
		focusTrap(trapNode);

		// Shift+Tab from the first focusable should skip the tabindex=-1
		// ghost element and land on the last real focusable ("b").
		pressTab({ shiftKey: true });

		expect(document.activeElement?.id).toBe("b");
	});

	it("restores focus to the previously active element on destroy by default", () => {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();

		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
			</div>
		`);
		const trap = focusTrap(trapNode);
		expect(document.activeElement?.id).toBe("a");

		trap?.destroy?.();
		expect(document.activeElement?.id).toBe("outside");

		outside.remove();
	});

	it("does not restore focus on destroy when returnFocus is false", () => {
		const outside = document.createElement("button");
		outside.id = "outside";
		document.body.appendChild(outside);
		outside.focus();

		const trapNode = setup(`
			<div id="trap">
				<button id="a">A</button>
			</div>
		`);
		const trap = focusTrap(trapNode, { returnFocus: false });
		trapNode.querySelector<HTMLElement>("#a")!.focus();

		trap?.destroy?.();
		expect(document.activeElement?.id).toBe("a");

		outside.remove();
	});
});

describe("focusTrap — visibility and empty containers", () => {
	let container: HTMLElement;

	afterEach(() => {
		container?.remove();
		document.body.innerHTML = "";
	});

	function setup(innerHtml: string) {
		container = document.createElement("div");
		container.innerHTML = innerHtml;
		document.body.appendChild(container);
		return container.querySelector<HTMLElement>("#trap")!;
	}

	it("skips hidden elements when picking the initial focus", () => {
		const trapNode = setup(`
			<div id="trap">
				<button id="ghost" style="display: none">Ghost</button>
				<button id="real">Real</button>
			</div>
		`);
		const action = focusTrap(trapNode, {});
		expect(document.activeElement?.id).toBe("real");
		action?.destroy?.();
	});

	it("falls back to focusing the container when there are no focusable descendants", () => {
		const trapNode = setup(`<div id="trap"><p>Loading…</p></div>`);
		const action = focusTrap(trapNode, {});
		expect(document.activeElement).toBe(trapNode);
		expect(trapNode.getAttribute("tabindex")).toBe("-1");
		action?.destroy?.();
	});
});
