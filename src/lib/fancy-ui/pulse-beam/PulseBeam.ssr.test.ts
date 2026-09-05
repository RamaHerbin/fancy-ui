// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import PulseBeam from "./PulseBeam.svelte";

describe("PulseBeam (SSR)", () => {
	it("renders idle markup with all layers and no window access", () => {
		const { body } = render(PulseBeam, { props: { active: true, variant: "outside" } });
		expect(body).toContain('data-state="idle"');
		expect(body).toContain('data-variant="outside"');
		expect(body).toContain("pulse-beam__stroke");
		expect(body).toContain("pulse-beam__glow");
		expect(body).toContain("pulse-beam__bloom");
		expect(body).toContain("--pb-strength: 1");
	});
});
