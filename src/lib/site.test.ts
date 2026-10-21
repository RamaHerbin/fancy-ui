import { describe, expect, it } from "vitest";
import {
	CODE_OF_CONDUCT_URL,
	CONTRIBUTING_URL,
	DISCUSSIONS_URL,
	EDIT_BRANCH,
	GITHUB_URL,
	ISSUES_URL,
	REACT_PACKAGE_VERSION,
	SECURITY_URL,
	SOURCE_BRANCH,
	VUE_PACKAGE_VERSION,
	editUrl,
	newIssueUrl,
	sourceTreeUrl,
} from "./site.js";

describe("branch constants", () => {
	it("always points source and edit links at develop", () => {
		expect(SOURCE_BRANCH).toBe("develop");
		expect(EDIT_BRANCH).toBe("develop");
	});
});

describe("package versions", () => {
	it("bakes the react and vue package versions in as semver strings", () => {
		expect(REACT_PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
		expect(VUE_PACKAGE_VERSION).toMatch(/^\d+\.\d+\.\d+/);
	});
});

describe("community URLs", () => {
	it("builds them from the repository URL on the source branch", () => {
		expect(ISSUES_URL).toBe(`${GITHUB_URL}/issues`);
		expect(DISCUSSIONS_URL).toBe(`${GITHUB_URL}/discussions`);
		expect(CONTRIBUTING_URL).toBe(`${GITHUB_URL}/blob/develop/CONTRIBUTING.md`);
		expect(CODE_OF_CONDUCT_URL).toBe(`${GITHUB_URL}/blob/develop/CODE_OF_CONDUCT.md`);
		expect(SECURITY_URL).toBe(`${GITHUB_URL}/blob/develop/SECURITY.md`);
	});
});

describe("sourceTreeUrl", () => {
	it("targets the develop tree", () => {
		expect(sourceTreeUrl("src/lib/fancy-ui/button")).toBe(
			`${GITHUB_URL}/tree/develop/src/lib/fancy-ui/button`
		);
	});
	it("tolerates a leading slash and does not double it", () => {
		expect(sourceTreeUrl("/react/src")).toBe(`${GITHUB_URL}/tree/develop/react/src`);
	});
	it("returns the branch root for an empty path", () => {
		expect(sourceTreeUrl("")).toBe(`${GITHUB_URL}/tree/develop`);
	});
});

describe("editUrl", () => {
	it("targets the develop edit view", () => {
		expect(editUrl("src/routes/docs/+page.svelte")).toBe(
			`${GITHUB_URL}/edit/develop/src/routes/docs/+page.svelte`
		);
	});
	it("tolerates a leading slash", () => {
		expect(editUrl("/README.md")).toBe(`${GITHUB_URL}/edit/develop/README.md`);
	});
});

describe("newIssueUrl", () => {
	it("encodes template, title, labels and body as query parameters", () => {
		const url = new URL(
			newIssueUrl({
				template: "bug_report.yml",
				title: "[docs] Card 3D & friends",
				labels: ["docs", "needs triage"],
				body: "URL: https://x.test/a?b=1&c=2\nFramework: React",
			})
		);
		expect(url.origin + url.pathname).toBe(`${ISSUES_URL}/new`);
		expect(url.searchParams.get("template")).toBe("bug_report.yml");
		expect(url.searchParams.get("title")).toBe("[docs] Card 3D & friends");
		expect(url.searchParams.get("labels")).toBe("docs,needs triage");
		expect(url.searchParams.get("body")).toBe("URL: https://x.test/a?b=1&c=2\nFramework: React");
	});
	it("never leaks a raw newline or an unescaped ampersand into the value", () => {
		const raw = newIssueUrl({ title: "a & b", body: "x\ny" });
		expect(raw).not.toContain("\n");
		expect(raw.split("?")[1].split("&")).toHaveLength(2);
	});
	it("omits parameters that are not given", () => {
		expect(newIssueUrl({})).toBe(`${ISSUES_URL}/new`);
		expect(newIssueUrl({ title: "t" })).toBe(`${ISSUES_URL}/new?title=t`);
		expect(newIssueUrl({ labels: [] })).toBe(`${ISSUES_URL}/new`);
	});
});
