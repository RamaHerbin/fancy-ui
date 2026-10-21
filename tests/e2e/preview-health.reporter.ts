/**
 * Reporter for the preview-health sweep: merges every test's failures into
 * test-results/preview-health.json and prints a summary grouped by failure
 * class. A test that failed without handing over its failure list is a broken
 * harness, not a broken preview, and is listed apart as HARNESS.
 */

import type { FullResult, Reporter, TestCase, TestResult } from "@playwright/test/reporter";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import {
	FAILURE_CLASSES,
	FAILURES_ATTACHMENT,
	REPORT_PATH,
	type PreviewFailure,
} from "./preview-health.shared";

interface Entry {
	project: string;
	slug: string;
	status: TestResult["status"];
	failures: PreviewFailure[];
	notes: string[];
	harness?: string;
}

export default class PreviewHealthReporter implements Reporter {
	/** Last result per project/slug, so a retry replaces the attempt before it. */
	private entries = new Map<string, Entry>();

	onTestEnd(test: TestCase, result: TestResult) {
		const project = test.parent.project()?.name ?? "default";
		const slug = test.title;
		const attachment = result.attachments.find((a) => a.name === FAILURES_ATTACHMENT);
		let failures: PreviewFailure[] = [];
		let notes: string[] = [];
		let harness: string | undefined;
		if (attachment?.body) {
			const parsed = JSON.parse(attachment.body.toString("utf8")) as {
				failures: PreviewFailure[];
				notes: string[];
			};
			failures = parsed.failures;
			notes = parsed.notes;
		}
		if (result.status !== "passed" && result.status !== "skipped" && failures.length === 0) {
			harness = (result.error?.message ?? result.status).split("\n")[0];
		}
		this.entries.set(`${project}\u0000${slug}`, {
			project,
			slug,
			status: result.status,
			failures,
			notes,
			harness,
		});
	}

	onEnd(result: FullResult) {
		const entries = [...this.entries.values()].sort(
			(a, b) => a.project.localeCompare(b.project) || a.slug.localeCompare(b.slug)
		);
		const byClass: Record<string, string[]> = {};
		for (const cls of FAILURE_CLASSES) byClass[cls] = [];
		const harness: string[] = [];
		const notes: string[] = [];
		for (const e of entries) {
			for (const f of e.failures) {
				byClass[f.class].push(
					`${e.project} ${e.slug} ${f.stage === null ? "page" : `s${f.stage}`}: ${f.detail}`
				);
			}
			if (e.harness) harness.push(`${e.project} ${e.slug}: ${e.harness}`);
			for (const n of e.notes) notes.push(`${e.project} ${e.slug}: ${n}`);
		}
		const projects = [...new Set(entries.map((e) => e.project))];
		const summary = {
			generatedAt: new Date().toISOString(),
			status: result.status,
			projects: Object.fromEntries(
				projects.map((p) => {
					const mine = entries.filter((e) => e.project === p);
					return [
						p,
						{
							pages: mine.length,
							healthy: mine.filter((e) => e.failures.length === 0 && !e.harness).length,
							failing: mine.filter((e) => e.failures.length > 0).length,
							harness: mine.filter((e) => e.harness).length,
						},
					];
				})
			),
			counts: Object.fromEntries([...FAILURE_CLASSES].map((cls) => [cls, byClass[cls].length])),
			harness,
			notes,
			failures: entries
				.filter((e) => e.failures.length > 0)
				.map(({ project, slug, failures }) => ({ project, slug, failures })),
		};

		mkdirSync(dirname(REPORT_PATH), { recursive: true });
		writeFileSync(REPORT_PATH, `${JSON.stringify(summary, null, "\t")}\n`);

		const lines = ["", "Preview health", "=============="];
		for (const [p, s] of Object.entries(summary.projects)) {
			lines.push(
				`${p}: ${s.healthy}/${s.pages} healthy, ${s.failing} failing, ${s.harness} harness errors`
			);
		}
		for (const cls of FAILURE_CLASSES) {
			if (byClass[cls].length === 0) continue;
			lines.push("", `${cls} (${byClass[cls].length})`);
			for (const line of byClass[cls]) lines.push(`  ${line}`);
		}
		if (notes.length) {
			lines.push("", `Notes, not failures (${notes.length})`);
			for (const line of notes) lines.push(`  ${line}`);
		}
		if (harness.length) {
			lines.push("", `HARNESS (${harness.length})`);
			for (const line of harness) lines.push(`  ${line}`);
		}
		lines.push("", `Written to ${REPORT_PATH}`);
		console.log(lines.join("\n"));
	}

	printsToStdio() {
		return false;
	}
}
