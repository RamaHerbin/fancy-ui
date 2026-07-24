import { afterEach, describe, it, expect } from "vitest";
import { portal } from "./portal";

function createNode(): HTMLElement {
	const node = document.createElement("div");
	node.textContent = "portal content";
	return node;
}

describe("portal", () => {
	afterEach(() => {
		document.body.innerHTML = "";
	});

	it("moves the node to document.body by default", () => {
		const node = createNode();
		document.body.appendChild(node);

		portal(node);

		expect(node.parentElement).toBe(document.body);
	});

	it("moves the node to a given HTMLElement target", () => {
		const target = document.createElement("section");
		document.body.appendChild(target);
		const node = createNode();
		document.body.appendChild(node);

		portal(node, target);

		expect(node.parentElement).toBe(target);
	});

	it("moves the node to a target resolved from a CSS selector", () => {
		const target = document.createElement("section");
		target.id = "modal-root";
		document.body.appendChild(target);
		const node = createNode();

		portal(node, "#modal-root");

		expect(node.parentElement).toBe(target);
	});

	it("falls back to document.body when the selector matches nothing", () => {
		const node = createNode();

		portal(node, "#does-not-exist");

		expect(node.parentElement).toBe(document.body);
	});

	it("removes the node from the DOM on destroy", () => {
		const node = createNode();
		const action = portal(node);

		expect(node.isConnected).toBe(true);

		action.destroy();

		expect(node.isConnected).toBe(false);
		expect(node.parentElement).toBeNull();
	});

	it("moves the node to a new target when update() is called", () => {
		const first = document.createElement("section");
		const second = document.createElement("section");
		document.body.append(first, second);
		const node = createNode();

		const action = portal(node, first);
		expect(node.parentElement).toBe(first);

		action.update(second);
		expect(node.parentElement).toBe(second);
	});
});
