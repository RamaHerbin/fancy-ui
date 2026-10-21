import { describe, expect, it } from "vitest";
import { portEventName, portPropName, portSlotName } from "./port-names.js";

const prop = (name: string, type = "string", description = "") => ({ name, type, description });

describe("portPropName", () => {
	it("renames class to className for React and keeps it for Vue", () => {
		expect(portPropName(prop("class"), "react")).toBe("className");
		expect(portPropName(prop("class"), "vue")).toBe("class");
	});

	it("keeps plain props as they are", () => {
		expect(portPropName(prop("speed", "number"), "react")).toBe("speed");
		expect(portPropName(prop("speed", "number"), "vue")).toBe("speed");
	});

	it("camel-cases lowercase callbacks", () => {
		const click = prop("onclick", "(event: MouseEvent) => void");
		expect(portPropName(click, "react")).toBe("onClick");
		expect(portPropName(click, "vue")).toBe("onClick");
		expect(portPropName(prop("onpointermove", "(e: PointerEvent) => void"), "react")).toBe(
			"onPointerMove"
		);
		expect(portPropName(prop("onpercentagechange", "(p: number) => void"), "react")).toBe(
			"onPercentageChange"
		);
		expect(portPropName(prop("onfadein", "() => void"), "vue")).toBe("onFadeIn");
	});

	it("leaves callbacks that are already camel-cased alone", () => {
		expect(portPropName(prop("onValueChange", "(v: string) => void"), "react")).toBe(
			"onValueChange"
		);
	});

	it("does not treat a boolean that starts with 'on' as a callback", () => {
		expect(portPropName(prop("once", "boolean"), "react")).toBe("once");
	});

	it("returns null when the words of a lowercase callback cannot be told apart", () => {
		expect(portPropName(prop("onzorbleflux", "() => void"), "react")).toBeNull();
	});

	it("turns snippets into ReactNode props and Vue slots", () => {
		const header = prop("header", "Snippet");
		expect(portPropName(header, "react")).toBe("header");
		expect(portPropName(header, "vue")).toBe("#header");
		const children = prop("children", "Snippet");
		expect(portPropName(children, "react")).toBe("children");
		expect(portPropName(children, "vue")).toBe("#default");
		expect(portPropName(prop("item", "Snippet<[Item]>"), "vue")).toBe("#item");
	});

	it("turns bindable props into v-model for Vue only", () => {
		const open = prop("open", "boolean", "Whether the list is expanded; bindable");
		expect(portPropName(open, "vue")).toBe("v-model:open");
		expect(portPropName(open, "react")).toBe("open");
		expect(portPropName(prop("expanded", "boolean", "Expanded state (bindable)."), "vue")).toBe(
			"v-model:expanded"
		);
	});

	it("maps the member after the dot of a sub-component prop", () => {
		expect(portPropName(prop("BentoGridItem.class"), "react")).toBe("BentoGridItem.className");
		expect(portPropName(prop("BentoGridItem.header", "Snippet"), "vue")).toBe(
			"BentoGridItem.#header"
		);
	});
});

describe("portSlotName", () => {
	it("maps snippets to props for React and slots for Vue", () => {
		expect(portSlotName("children", "react")).toBe("children");
		expect(portSlotName("children", "vue")).toBe("#default");
		expect(portSlotName("footer", "react")).toBe("footer");
		expect(portSlotName("footer", "vue")).toBe("#footer");
		expect(portSlotName("SidebarItem.icon", "vue")).toBe("SidebarItem.#icon");
	});
});

describe("portEventName", () => {
	it("prefixes and camel-cases the event", () => {
		expect(portEventName("click", "react")).toBe("onClick");
		expect(portEventName("click", "vue")).toBe("onClick");
		expect(portEventName("valuechange", "react")).toBe("onValueChange");
		expect(portEventName("onflip", "react")).toBe("onFlip");
		expect(portEventName("zorbleflux", "react")).toBeNull();
	});
});
