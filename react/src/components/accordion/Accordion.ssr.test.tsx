// @vitest-environment node
/**
 * Server half of the accordion and collapsible: a render with no `window` must
 * already carry every item's content, with closed regions hidden, and the id
 * links must agree between the server HTML and the hydration render.
 */
import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Accordion } from "./Accordion.js";
import { AccordionItem } from "./AccordionItem.js";
import { AccordionTrigger } from "./AccordionTrigger.js";
import { AccordionContent } from "./AccordionContent.js";
import { Collapsible } from "../collapsible/Collapsible.js";
import { CollapsibleTrigger } from "../collapsible/CollapsibleTrigger.js";
import { CollapsibleContent } from "../collapsible/CollapsibleContent.js";

function accordion(props: { value?: string | string[]; type?: "single" | "multiple" }) {
	return createElement(
		Accordion,
		props,
		["a", "b", "c"].map((value) =>
			createElement(
				AccordionItem,
				{ key: value, value },
				createElement(AccordionTrigger, null, `Head ${value}`),
				createElement(AccordionContent, null, `Panel ${value}`)
			)
		)
	);
}

function collapsible(open?: boolean) {
	return createElement(
		Collapsible,
		{ open },
		createElement(CollapsibleTrigger, null, "Toggle"),
		createElement(CollapsibleContent, null, "Body")
	);
}

describe("Accordion (SSR)", () => {
	it("renders every item's content, closed regions hidden, regions and headings in place", () => {
		const html = renderToString(accordion({ value: "b" }));
		for (const v of ["a", "b", "c"]) expect(html).toContain(`Panel ${v}`);
		expect(html.match(/aria-expanded="true"/g)).toHaveLength(1);
		expect(html.match(/aria-expanded="false"/g)).toHaveLength(2);
		expect(html.match(/visibility:hidden/g)).toHaveLength(2);
		expect(html.match(/role="region"/g)).toHaveLength(3);
		expect(html.match(/role="heading"/g)).toHaveLength(3);
	});

	it("wires each trigger to its region before hydration", () => {
		const html = renderToString(accordion({ value: "a" }));
		const controls = [...html.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
		expect(controls).toHaveLength(3);
		for (const id of controls) expect(html).toContain(`id="${id}"`);
		for (const m of html.matchAll(/aria-labelledby="([^"]+)"/g)) {
			expect(html).toContain(`id="${m[1]}"`);
		}
	});

	it("is byte-identical across renders", () => {
		expect(renderToString(accordion({}))).toBe(renderToString(accordion({})));
	});
});

describe("Collapsible (SSR)", () => {
	it("renders a closed panel with its content in the markup and hidden", () => {
		const html = renderToString(collapsible());
		expect(html).toContain("Body");
		expect(html).toContain('aria-expanded="false"');
		expect(html).toContain('data-state="closed"');
		expect(html).toContain("visibility:hidden");
	});

	it("renders an open panel visible", () => {
		const html = renderToString(collapsible(true));
		expect(html).toContain('aria-expanded="true"');
		expect(html).toContain('data-state="open"');
		expect(html).not.toContain("visibility");
	});
});
