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

	it("camel-cases a lowercase callback the React port does not declare", () => {
		// A native handler forwarded to the element: React spells it camel-cased.
		const click = prop("onclick", "(event: MouseEvent) => void");
		expect(portPropName(click, "react")).toBe("onClick");
		expect(portPropName(prop("onpointermove", "(e: PointerEvent) => void"), "react")).toBe(
			"onPointerMove"
		);
	});

	it("shows the React name the port declares, lowercase included", () => {
		// The React Compare, DatamoshTransition and PulseBeam keep these lowercase.
		const reactCallbacks = ["onpercentagechange", "ondragstart", "oncovered", "onfadein"];
		const options = { reactCallbacks };
		expect(portPropName(prop("onpercentagechange", "(p: number) => void"), "react", options)).toBe(
			"onpercentagechange"
		);
		expect(portPropName(prop("ondragstart", "() => void"), "react", options)).toBe("ondragstart");
		expect(portPropName(prop("oncovered", "() => void"), "react", options)).toBe("oncovered");
		expect(portPropName(prop("onfadein", "() => void"), "react", options)).toBe("onfadein");
		// A camel-cased declaration wins over a lowercase alias.
		expect(
			portPropName(prop("onphasechange", "(p: string) => void"), "react", {
				reactCallbacks: ["onphasechange", "onPhaseChange"],
			})
		).toBe("onPhaseChange");
	});

	it("binds a declared camel-cased Vue callback as @kebab-case", () => {
		const options = { vueCallbacks: ["onPercentageChange", "onpercentagechange", "onFadeIn"] };
		expect(portPropName(prop("onpercentagechange", "(p: number) => void"), "vue", options)).toBe(
			"@percentage-change"
		);
		expect(portPropName(prop("onfadein", "() => void"), "vue", options)).toBe("@fade-in");
	});

	it("keeps the native event name for a listener that falls through in Vue", () => {
		// RippleButton and ShimmerButton forward pointermove to the button.
		const options = { vueCallbacks: ["onClick", "onclick"] };
		expect(portPropName(prop("onpointermove", "(e: PointerEvent) => void"), "vue", options)).toBe(
			"@pointermove"
		);
		expect(portPropName(prop("onclick", "(e: MouseEvent) => void"), "vue", options)).toBe("@click");
		expect(portPropName(prop("onpointermove", "(e: PointerEvent) => void"), "vue")).toBe(
			"@pointermove"
		);
	});

	it("leaves callbacks that are already camel-cased alone", () => {
		expect(portPropName(prop("onValueChange", "(v: string) => void"), "react")).toBe(
			"onValueChange"
		);
	});

	it("does not treat a boolean that starts with 'on' as a callback", () => {
		expect(portPropName(prop("once", "boolean"), "react")).toBe("once");
	});

	it("returns null when the words of an undeclared React callback cannot be told apart", () => {
		expect(portPropName(prop("onzorbleflux", "() => void"), "react")).toBeNull();
		expect(
			portPropName(prop("onzorbleflux", "() => void"), "react", {
				reactCallbacks: ["onzorbleflux"],
			})
		).toBe("onzorbleflux");
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

	it("turns a bindable prop into v-model only when the Vue port declares that model", () => {
		const open = prop("open", "boolean", "Whether the list is expanded; bindable");
		expect(portPropName(open, "vue", { vueModels: ["open"] })).toBe("v-model:open");
		expect(portPropName(open, "react", { vueModels: ["open"] })).toBe("open");
		expect(
			portPropName(prop("TabsList.value", "string", "bindable"), "vue", {
				vueModels: ["TabsList.value"],
			})
		).toBe("TabsList.v-model:value");
	});

	it("keeps a prop the registry calls bindable when the Vue port has no model for it", () => {
		// Sidebar's `collapsed` is bindable in Svelte but a plain prop in Vue.
		const collapsed = prop("collapsed", "boolean", "Collapsed state (bindable).");
		expect(portPropName(collapsed, "vue", { vueModels: [] })).toBe("collapsed");
		expect(portPropName(collapsed, "vue")).toBe("collapsed");
	});

	it("never turns ref into a model: Vue exposes it on a template ref", () => {
		const ref = prop("ref", "HTMLElement | null", "Bindable element reference");
		expect(portPropName(ref, "vue")).toBe("ref");
		expect(portPropName(ref, "vue", { vueModels: ["ref"] })).toBe("ref");
		const subRef = prop(
			"TabsTrigger.ref",
			"HTMLButtonElement | null",
			"Bindable element reference"
		);
		expect(portPropName(subRef, "vue", { vueModels: ["TabsTrigger.ref"] })).toBe("TabsTrigger.ref");
		expect(portPropName(ref, "react")).toBe("ref");
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
		expect(portEventName("click", "vue")).toBe("@click");
		expect(portEventName("valuechange", "react")).toBe("onValueChange");
		expect(portEventName("onflip", "react")).toBe("onFlip");
		expect(portEventName("zorbleflux", "react")).toBeNull();
	});

	it("uses the callback each port declares for an event", () => {
		expect(portEventName("fadein", "react", { reactCallbacks: ["onfadein"] })).toBe("onfadein");
		expect(portEventName("fadein", "vue", { vueCallbacks: ["onFadeIn"] })).toBe("@fade-in");
		expect(portEventName("onflip", "vue")).toBe("@flip");
		expect(
			portEventName("Sub.covered", "react", { reactCallbacks: ["Sub.oncovered", "oncovered"] })
		).toBe("Sub.oncovered");
	});

	it("does not guess DOM names whose React spelling breaks the camel-case rule", () => {
		// React spells these onDoubleClick and onAuxClick, not onDblClick / onAuxclick.
		expect(portEventName("dblclick", "react")).toBeNull();
		expect(portEventName("auxclick", "react")).toBeNull();
	});
});
