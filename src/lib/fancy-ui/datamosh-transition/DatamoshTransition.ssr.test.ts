// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import DatamoshTransition from "./DatamoshTransition.svelte";

describe("DatamoshTransition (SSR)", () => {
	it("renders an idle, hidden overlay without touching window", () => {
		const { body } = render(DatamoshTransition, { props: { class: "custom" } });
		expect(body).toContain("datamosh-transition");
		expect(body).toContain("custom");
		expect(body).toContain("<canvas");
		expect(body).toContain('data-state="idle"');
		expect(body).toContain("invisible");
		expect(body).toContain('aria-hidden="true"');
	});

	it("is byte-identical across renders", () => {
		const a = render(DatamoshTransition, { props: { seed: 3 } }).body;
		const b = render(DatamoshTransition, { props: { seed: 3 } }).body;
		expect(a).toBe(b);
	});

	it("renders deterministically with a picture source", () => {
		const props = { source: "/sunset.svg", variant: "split" as const };
		expect(render(DatamoshTransition, { props }).body).toBe(
			render(DatamoshTransition, { props }).body
		);
	});
});
