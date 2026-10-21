// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import Harness from "./CollapsibleHarness.test.svelte";

describe("Collapsible (SSR)", () => {
	it("renders a closed panel with its content in the markup, already inert and hidden", () => {
		const { body } = render(Harness);
		expect(body).toContain("Inside");
		expect(body).toContain('aria-expanded="false"');
		expect(body).toContain('data-state="closed"');
		expect(body).toContain("inert");
		expect(body).toContain("visibility: hidden");
	});

	it("renders an open panel visible and interactive", () => {
		const { body } = render(Harness, { props: { open: true } });
		expect(body).toContain('aria-expanded="true"');
		expect(body).toContain('data-state="open"');
		expect(body).not.toContain("inert");
		expect(body).not.toContain("visibility");
	});

	it("wires aria-controls to the content id before hydration", () => {
		const { body } = render(Harness);
		const controls = /aria-controls="([^"]+)"/.exec(body)?.[1];
		expect(controls).toBeTruthy();
		expect(body).toContain(`id="${controls}"`);
	});

	it("is byte-identical across renders", () => {
		expect(render(Harness).body).toBe(render(Harness).body);
	});

	it("leaves the children out of a closed panel that opted out of forceMount", () => {
		const { body } = render(Harness, { props: { forceMount: false } });
		expect(body).not.toContain("Inside");
	});
});
