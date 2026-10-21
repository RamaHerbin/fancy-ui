import { describe, expect, it } from "vitest";
import { hasModifier, isEditableTarget, isPrintableKey } from "./shared.js";

describe("isEditableTarget", () => {
	it("matches form fields, contenteditable and textbox roles, including descendants", () => {
		document.body.innerHTML = `
			<input id="i" /><textarea id="t"></textarea><select id="s"></select>
			<div contenteditable="true"><span id="ce">x</span></div>
			<div contenteditable=""><span id="ce2">x</span></div>
			<div role="textbox" id="rt"></div>
			<button id="b">b</button>`;
		for (const id of ["i", "t", "s", "ce", "ce2", "rt"]) {
			expect(isEditableTarget(document.getElementById(id))).toBe(true);
		}
		expect(isEditableTarget(document.getElementById("b"))).toBe(false);
	});

	it("is false for null, document and window", () => {
		expect(isEditableTarget(null)).toBe(false);
		expect(isEditableTarget(document)).toBe(false);
		expect(isEditableTarget(window)).toBe(false);
	});
});

describe("hasModifier", () => {
	it("counts meta, ctrl and alt but not shift", () => {
		expect(hasModifier(new KeyboardEvent("keydown", { key: "k", metaKey: true }))).toBe(true);
		expect(hasModifier(new KeyboardEvent("keydown", { key: "k", ctrlKey: true }))).toBe(true);
		expect(hasModifier(new KeyboardEvent("keydown", { key: "k", altKey: true }))).toBe(true);
		expect(hasModifier(new KeyboardEvent("keydown", { key: "K", shiftKey: true }))).toBe(false);
	});
});

describe("isPrintableKey", () => {
	it("accepts single visible characters only", () => {
		expect(isPrintableKey("a")).toBe(true);
		expect(isPrintableKey("/")).toBe(true);
		expect(isPrintableKey("é")).toBe(true);
		expect(isPrintableKey(" ")).toBe(false);
		expect(isPrintableKey("Enter")).toBe(false);
		expect(isPrintableKey("ArrowUp")).toBe(false);
		expect(isPrintableKey("")).toBe(false);
	});
});
