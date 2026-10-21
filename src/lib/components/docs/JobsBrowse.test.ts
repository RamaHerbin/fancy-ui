import { render, cleanup } from "@testing-library/svelte";
import { afterEach, describe, it, expect } from "vitest";
import JobsBrowse from "./JobsBrowse.svelte";
import { JOBS } from "$lib/docs/jobs.js";
import { t } from "$lib/stores";

describe("JobsBrowse", () => {
	afterEach(cleanup);

	it("renders the translated heading and one card per job", () => {
		const { container } = render(JobsBrowse);
		expect(container.querySelector("h2")?.textContent).toBe(t("jobs.heading"));
		const cards = container.querySelectorAll("[data-job]");
		expect(cards.length).toBe(JOBS.length);
		for (const job of JOBS) {
			const card = container.querySelector(`[data-job="${job.id}"]`) as HTMLElement;
			expect(card.querySelector("h3")?.textContent).toBe(t(`jobs.${job.id}` as never));
		}
	});

	it("links every job component to its page, in order", () => {
		const { container } = render(JobsBrowse);
		for (const job of JOBS) {
			const hrefs = Array.from(container.querySelectorAll(`[data-job="${job.id}"] a`), (a) =>
				a.getAttribute("href")
			);
			expect(hrefs).toEqual(job.slugs.map((s) => `/docs/components/${s}`));
		}
	});
});
