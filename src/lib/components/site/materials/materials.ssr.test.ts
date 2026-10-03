// @vitest-environment node
import { describe, it, expect } from "vitest";
import { createRawSnippet } from "svelte";
import { render } from "svelte/server";
import IridescentText from "./IridescentText.svelte";
import RimLight from "./RimLight.svelte";
import SearchGlow from "./SearchGlow.svelte";
import { rimSeed, unwrapAngle } from "./rim.js";

const text = (html: string) => createRawSnippet(() => ({ render: () => html }));

describe("IridescentText (SSR)", () => {
	it("server-renders its text with nothing decorative exposed to assistive tech", () => {
		const { body } = render(IridescentText, {
			props: { children: text("<span>feel alive.</span>") },
		});
		expect(body).toContain("feel alive.");
		expect(body).toContain("fx-petrol");
		expect(body).not.toContain("aria-hidden");
		expect(body).not.toContain("<svg");
		expect(body).not.toContain("<canvas");
	});
});

describe("RimLight (SSR)", () => {
	it("is hidden from assistive tech", () => {
		const { body } = render(RimLight, { props: { tier: "card" } });
		expect(body).toContain('aria-hidden="true"');
		expect(body).toContain('data-tier="card"');
	});

	it("seeds a different start angle for neighbouring seeds", () => {
		const starts = [0, 1, 2].map((seed) => {
			const { body } = render(RimLight, { props: { tier: "hero", seed } });
			return /--rl-start: ([\d.]+)deg/.exec(body)?.[1];
		});
		expect(starts.every(Boolean)).toBe(true);
		expect(new Set(starts).size).toBe(3);
	});

	it("only renders the halo layer when asked (or for the search tier)", () => {
		expect(render(RimLight, { props: { tier: "card" } }).body).not.toContain("rl-halo");
		expect(render(RimLight, { props: { tier: "hero", halo: true } }).body).toContain("rl-halo");
		expect(render(RimLight, { props: { tier: "search" } }).body).toContain("rl-halo");
	});
});

describe("rimSeed", () => {
	it("never gives two neighbours the same start, length and accent", () => {
		for (let i = 0; i < 12; i++) {
			const a = rimSeed(i);
			const b = rimSeed(i + 1);
			expect(a.start === b.start && a.arc === b.arc && a.accent === b.accent).toBe(false);
			expect(a.arc).toBeGreaterThanOrEqual(110);
			expect(a.arc).toBeLessThanOrEqual(160);
		}
	});

	it("unwraps angles the short way round", () => {
		expect(unwrapAngle(350, 10)).toBe(370);
		expect(unwrapAngle(10, 350)).toBe(-10);
	});
});

describe("SearchGlow (SSR)", () => {
	it("renders a GET search form whose input is labelled and named q", () => {
		const { body } = render(SearchGlow);
		expect(body).toContain('role="search"');
		expect(body).toContain('action="/inspiration"');
		expect(body).toContain('method="get"');
		expect(body).toContain('name="q"');
		const id = /<input[^>]*id="([^"]+)"/.exec(body)?.[1];
		expect(id).toBeTruthy();
		expect(body).toContain(`for="${id}"`);
		expect(body).toMatch(/<label[^>]*>Search inspiration<\/label>/);
	});
});
