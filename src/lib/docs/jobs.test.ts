import { describe, expect, it } from "vitest";
import { getComponent } from "$lib/fancy-ui/registry.js";
import { JOBS, jobHref, jobComponents } from "./jobs.js";

describe("jobs taxonomy", () => {
	it("covers the six jobs the proposal promises", () => {
		expect(JOBS.map((j) => j.id)).toEqual([
			"feedback",
			"input",
			"attention",
			"navigate",
			"progress",
			"surprise",
		]);
	});

	it("only references slugs that exist in the registry (no dead link possible)", () => {
		for (const job of JOBS) {
			for (const slug of job.slugs) {
				expect(getComponent(slug), `${job.id} -> ${slug}`).toBeDefined();
			}
		}
	});

	it("only links to finished components", () => {
		for (const job of JOBS) {
			for (const slug of job.slugs) {
				expect(getComponent(slug)?.status, slug).toBe("done");
			}
		}
	});

	it("has no duplicate slug inside a job and 4 to 8 entries per job", () => {
		for (const job of JOBS) {
			expect(new Set(job.slugs).size).toBe(job.slugs.length);
			expect(job.slugs.length).toBeGreaterThanOrEqual(4);
			expect(job.slugs.length).toBeLessThanOrEqual(8);
		}
	});

	it("builds component links under /docs/components", () => {
		expect(jobHref("toast")).toBe("/docs/components/toast");
		for (const job of JOBS) {
			expect(jobComponents(job).map((c) => c.slug)).toEqual(job.slugs);
		}
	});

	it("gives every job a title and a one-line blurb", () => {
		for (const job of JOBS) {
			expect(job.title.length).toBeGreaterThan(3);
			expect(job.blurb.length).toBeGreaterThan(10);
		}
	});
});
