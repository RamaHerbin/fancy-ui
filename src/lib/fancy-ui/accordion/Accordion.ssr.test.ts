// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Harness from "./AccordionHarness.test.svelte";

describe("Accordion (SSR)", () => {
	it("renders every item's content in the markup, closed ones inert and hidden", () => {
		const { body } = render(Harness, { props: { value: "b" } });
		for (const label of ["Alpha", "Beta", "Gamma"]) expect(body).toContain(`Panel ${label}`);
		expect(body.match(/aria-expanded="true"/g)).toHaveLength(1);
		expect(body.match(/aria-expanded="false"/g)).toHaveLength(2);
		expect(body.match(/visibility: hidden/g)).toHaveLength(2);
		expect(body.match(/role="region"/g)).toHaveLength(3);
		expect(body.match(/role="heading"/g)).toHaveLength(3);
	});

	it("wires each trigger to its region before hydration", () => {
		const { body } = render(Harness, { props: { value: "a" } });
		const controls = [...body.matchAll(/aria-controls="([^"]+)"/g)].map((m) => m[1]);
		expect(controls).toHaveLength(3);
		for (const id of controls) expect(body).toContain(`id="${id}"`);
		const labelledBy = [...body.matchAll(/aria-labelledby="([^"]+)"/g)].map((m) => m[1]);
		for (const id of labelledBy) expect(body).toContain(`id="${id}"`);
	});

	it("renders a multiple accordion with a list value", () => {
		const { body } = render(Harness, { props: { type: "multiple", value: ["a", "c"] } });
		expect(body.match(/aria-expanded="true"/g)).toHaveLength(2);
	});

	it("is byte-identical across renders", () => {
		expect(render(Harness).body).toBe(render(Harness).body);
	});
});
