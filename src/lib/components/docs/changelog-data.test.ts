import { describe, it, expect } from "vitest";
import { parseChangelog } from "./changelog-data.js";

const FIXTURE = `# Changelog

## 0.3.0

### Minor Changes

- abc1234: feat: add a shiny thing
- def5678: feat: another thing
  with a continuation line

### Patch Changes

- 0123abc: fix: repair the thing

## 0.2.0

### Added

Some prose without a hash prefix.

## 0.1.0 — 2026-03-13

Initial public release across 10 categories.

### Added

| Component | Description |
| --------- | ----------- |
| Dock      | macOS-style dock <script>alert(1)</script> |
`;

describe("parseChangelog", () => {
	const versions = parseChangelog(FIXTURE);

	it("parses every version heading, newest first", () => {
		expect(versions.map((v) => v.version)).toEqual(["0.3.0", "0.2.0", "0.1.0"]);
	});

	it("derives stable anchors", () => {
		expect(versions.map((v) => v.anchor)).toEqual(["v0-3-0", "v0-2-0", "v0-1-0"]);
	});

	it("parses the em-dash date and leaves undated versions without one", () => {
		expect(versions[2].date).toBe("2026-03-13");
		expect(versions[0].date).toBeUndefined();
	});

	it("groups sections by bump kind", () => {
		expect(versions[0].sections.map((s) => s.kind)).toEqual(["Minor Changes", "Patch Changes"]);
		expect(versions[1].sections.map((s) => s.kind)).toEqual(["Added"]);
	});

	it("keeps a preamble before the first section as an unlabeled section", () => {
		expect(versions[2].sections[0].kind).toBe("");
		expect(versions[2].sections[0].html).toContain("Initial public release");
	});

	it("strips changeset hash prefixes from bullets", () => {
		const html = versions[0].sections[0].html;
		expect(html).not.toContain("abc1234:");
		expect(html).toContain("add a shiny thing");
	});

	it("renders GFM tables", () => {
		const html = versions[2].sections[1].html;
		expect(html).toContain("<table>");
		expect(html).toContain("Dock");
	});

	it("sanitizes script tags out of the output", () => {
		const html = versions[2].sections[1].html;
		expect(html).not.toContain("<script>");
	});
});
