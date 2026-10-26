import { render, cleanup } from "@testing-library/vue";
import { nextTick } from "vue";
import { afterEach, describe, it, expect } from "vitest";
import GlareCard from "./GlareCard.vue";

/** jsdom ships no PointerEvent: a mouse event of the pointer type carries `pointerType`. */
function firePointer(
	el: Element,
	type: string,
	init: { clientX?: number; clientY?: number; pointerType?: string } = {}
) {
	const event = new MouseEvent(type, {
		bubbles: true,
		clientX: init.clientX,
		clientY: init.clientY,
	});
	Object.defineProperty(event, "pointerType", { value: init.pointerType ?? "mouse" });
	el.dispatchEvent(event);
}

describe("GlareCard", () => {
	afterEach(cleanup);

	it("renders the component", () => {
		const { container } = render(GlareCard);
		const wrapper = container.querySelector(".glare-container");
		expect(wrapper).toBeInTheDocument();
	});

	it("has perspective class", () => {
		const { container } = render(GlareCard);
		const wrapper = container.querySelector(".glare-container");
		expect(wrapper?.className).toContain("[perspective:600px]");
	});

	it("has correct aspect ratio", () => {
		const { container } = render(GlareCard);
		const wrapper = container.querySelector(".glare-container");
		expect(wrapper?.className).toContain("[aspect-ratio:17/21]");
	});

	it("sets CSS custom properties", () => {
		const { container } = render(GlareCard);
		const wrapper = container.querySelector(".glare-container") as HTMLElement;
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toContain("--m-x");
		expect(style).toContain("50%");
		expect(style).toContain("--r-x");
		expect(style).toContain("0deg");
	});

	it("applies custom class", () => {
		const { container } = render(GlareCard, { props: { class: "my-glare" } });
		const content = container.querySelector(".my-glare");
		expect(content).toBeInTheDocument();
	});

	it("renders foil layer", () => {
		const { container } = render(GlareCard);
		const foil = container.querySelector(".glare-foil");
		expect(foil).toBeInTheDocument();
	});
});

describe("GlareCard pointer type and focus", () => {
	afterEach(cleanup);

	it("follows a mouse pointer", async () => {
		const { container } = render(GlareCard);
		const wrapper = container.querySelector(".glare-container") as HTMLElement;
		firePointer(wrapper, "pointermove", { clientX: 100, clientY: 100, pointerType: "mouse" });
		await nextTick();
		expect(wrapper.getAttribute("style") ?? "").not.toMatch(/--m-x:\s*50%[;"]/);
	});

	it("ignores touch pointers", async () => {
		const { container } = render(GlareCard);
		const wrapper = container.querySelector(".glare-container") as HTMLElement;
		firePointer(wrapper, "pointermove", { clientX: 100, clientY: 100, pointerType: "touch" });
		expect(wrapper.getAttribute("style") ?? "").toMatch(/--m-x:\s*50%/);
	});

	it("recentres the foil when the pointer leaves", async () => {
		const { container } = render(GlareCard);
		const wrapper = container.querySelector(".glare-container") as HTMLElement;
		firePointer(wrapper, "pointermove", { clientX: 100, clientY: 100, pointerType: "mouse" });
		await nextTick();
		expect(wrapper.getAttribute("style") ?? "").not.toMatch(/--m-x:\s*50%[;"]/);
		firePointer(wrapper, "pointerleave", { pointerType: "mouse" });
		await nextTick();
		const style = wrapper.getAttribute("style") ?? "";
		expect(style).toMatch(/--m-x:\s*50%[;"]/);
		expect(style).toMatch(/--m-y:\s*50%[;"]/);
	});

	it("lights the foil when focus lands inside, same as hover", () => {
		const { container } = render(GlareCard);
		const panel = container.querySelector(".glare-container > div") as HTMLElement;
		expect(panel.className).toContain("has-[:focus-visible]:[--opacity:0.6]");
		expect(panel.className).toContain("hover:[--opacity:0.6]");
	});
});
