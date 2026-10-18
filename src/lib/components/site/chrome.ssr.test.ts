// @vitest-environment node
import { describe, it, expect } from "vitest";
import { render } from "svelte/server";
import SiteHeader from "./SiteHeader.svelte";
import FrameworkSwitch from "./FrameworkSwitch.svelte";
import SectionHeading from "./SectionHeading.svelte";

describe("SiteHeader (SSR)", () => {
	it("links the three destinations and Saved", () => {
		const { body } = render(SiteHeader);
		expect(body).toContain('href="/inspiration"');
		expect(body).toContain('href="/docs/components"');
		expect(body).toContain('href="/docs/getting-started/introduction"');
		expect(body).toContain('href="/inspiration/saved"');
		expect(body).toContain('aria-label="Search the docs"');
	});

	it("marks the current section and renders no saved count on the server", () => {
		const { body } = render(SiteHeader, { props: { current: "inspiration" } });
		expect(body).toMatch(/href="\/inspiration" aria-current="page"/);
		expect(body).not.toMatch(/href="\/docs\/components" aria-current/);
		expect(body).not.toContain('class="count');
	});
});

describe("FrameworkSwitch (SSR)", () => {
	it("is a radiogroup of three radios with one checked and one tab stop", () => {
		const { body } = render(FrameworkSwitch, { props: { label: "Framework" } });
		expect(body).toContain('role="radiogroup"');
		expect(body).toContain('aria-label="Framework"');
		expect(body.match(/role="radio"/g)).toHaveLength(3);
		expect(body.match(/aria-checked="true"/g)).toHaveLength(1);
		expect(body.match(/tabindex="0"/g)).toHaveLength(1);
		expect(body).toMatch(/aria-checked="true"[^>]*>Svelte</);
	});
});

describe("SectionHeading (SSR)", () => {
	it("renders the index, title and optional link", () => {
		const { body } = render(SectionHeading, {
			props: { index: "01", title: "Previews", href: "/inspiration" },
		});
		expect(body).toMatch(/<h2[^>]*>.*01.*Previews/s);
		expect(body).toContain('href="/inspiration"');
	});
});
