// @vitest-environment node
//
// Server half of the accordion and collapsible: a render with no `window` must
// already carry every item's content, with closed regions inert and hidden,
// and the id links must agree between the server HTML and the hydration render.
import { createSSRApp, h } from "vue";
import { renderToString } from "vue/server-renderer";
import { describe, expect, it } from "vitest";
import Accordion from "./Accordion.vue";
import AccordionItem from "./AccordionItem.vue";
import AccordionTrigger from "./AccordionTrigger.vue";
import AccordionContent from "./AccordionContent.vue";
import Collapsible from "../collapsible/Collapsible.vue";
import CollapsibleTrigger from "../collapsible/CollapsibleTrigger.vue";
import CollapsibleContent from "../collapsible/CollapsibleContent.vue";

function accordion(props: Record<string, unknown>) {
	return renderToString(
		createSSRApp({
			render: () =>
				h(Accordion, props, {
					default: () =>
						["a", "b", "c"].map((value) =>
							h(
								AccordionItem,
								{ key: value, value },
								{
									default: () => [
										h(AccordionTrigger, null, { default: () => `Head ${value}` }),
										h(AccordionContent, null, { default: () => `Panel ${value}` }),
									],
								}
							)
						),
				}),
		})
	);
}

function collapsible(props: Record<string, unknown>) {
	return renderToString(
		createSSRApp({
			render: () =>
				h(Collapsible, props, {
					default: () => [
						h(CollapsibleTrigger, null, { default: () => "Toggle" }),
						h(CollapsibleContent, null, { default: () => "Body" }),
					],
				}),
		})
	);
}

describe("Accordion (SSR)", () => {
	it("renders every item's content, closed regions inert and hidden, regions and headings in place", async () => {
		const html = await accordion({ value: "b", "onUpdate:value": () => {} });
		for (const v of ["a", "b", "c"]) expect(html).toContain(`Panel ${v}`);
		expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
		expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
		expect(html.match(/visibility:\s*hidden/g)).toHaveLength(2);
		expect(html.match(/inert/g)).toHaveLength(2);
		expect(html.match(/role="region"/g)).toHaveLength(3);
		expect(html.match(/role="heading"/g)).toHaveLength(3);
	});

	it("wires each trigger to its region before hydration", async () => {
		const html = await accordion({ value: "a", "onUpdate:value": () => {} });
		const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
		expect(controls).toHaveLength(3);
		for (const id of controls) expect(html).toContain(`id="${id}"`);
		for (const m of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
			expect(html).toContain(`id="${m[1]}"`);
		}
	});

	it("is byte-identical across renders", async () => {
		expect(await accordion({})).toBe(await accordion({}));
	});
});

describe("Collapsible (SSR)", () => {
	it("renders a closed panel with its content in the markup, inert and hidden", async () => {
		const html = await collapsible({});
		expect(html).toContain("Body");
		expect(html).toContain('aria-expanded="false"');
		expect(html).toContain('data-state="closed"');
		expect(html).toContain("inert");
		expect(html).toMatch(/visibility:\s*hidden/);
	});

	it("renders an open panel visible and interactive", async () => {
		const html = await collapsible({ open: true, "onUpdate:open": () => {} });
		expect(html).toContain('aria-expanded="true"');
		expect(html).toContain('data-state="open"');
		expect(html).not.toContain("inert");
		expect(html).not.toContain("visibility");
	});
});
